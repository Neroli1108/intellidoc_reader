//! Voice Interaction Module
//!
//! Provides voice-enabled interaction with the document reader:
//! - Speech-to-Text (STT) for voice commands and note-taking
//! - Text-to-Speech (TTS) for reading documents aloud
//! - Voice command parsing and execution
//! - Reading position synchronization

pub mod audio;
pub mod commands;
pub mod providers;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{mpsc, RwLock};

pub use commands::{SummarizeScope, VoiceCommand, VoiceCommandParser};
pub use providers::{STTProvider, TTSProvider, SpeechToText, TextToSpeech};

// ============================================================================
// Configuration
// ============================================================================

/// Voice provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceConfig {
    /// Speech-to-text provider
    pub stt_provider: STTProvider,
    /// Text-to-speech provider
    pub tts_provider: TTSProvider,
    /// Selected voice ID for TTS
    pub voice_id: String,
    /// Language code (e.g., "en-US")
    pub language: String,
    /// Reading speed multiplier (0.5 to 2.0)
    pub reading_speed: f32,
    /// Enable wake word detection
    pub wake_word_enabled: bool,
    /// Wake word phrase (e.g., "Hey IntelliDoc")
    pub wake_word: String,
    /// Enable automatic punctuation in STT
    pub auto_punctuation: bool,
    /// Enable noise suppression
    pub noise_suppression: bool,
    /// Continuous listening mode
    pub continuous_listening: bool,
}

impl Default for VoiceConfig {
    fn default() -> Self {
        Self {
            stt_provider: STTProvider::WhisperLocal {
                model_path: "voice_models/whisper/ggml-base.bin".to_string(),
                model_size: WhisperModel::Base,
            },
            tts_provider: TTSProvider::PiperLocal {
                model_path: "voice_models/piper/en_US-lessac-medium.onnx".to_string(),
            },
            voice_id: "default".to_string(),
            language: "en-US".to_string(),
            reading_speed: 1.0,
            wake_word_enabled: false,
            wake_word: "Hey IntelliDoc".to_string(),
            auto_punctuation: true,
            noise_suppression: true,
            continuous_listening: false,
        }
    }
}

/// Whisper model sizes for local STT
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum WhisperModel {
    /// ~75MB, fastest, least accurate
    Tiny,
    /// ~142MB, fast
    Base,
    /// ~466MB, balanced
    Small,
    /// ~1.5GB, accurate
    Medium,
    /// ~3GB, most accurate
    Large,
}

impl WhisperModel {
    /// Get the model filename
    pub fn filename(&self) -> &'static str {
        match self {
            WhisperModel::Tiny => "ggml-tiny.bin",
            WhisperModel::Base => "ggml-base.bin",
            WhisperModel::Small => "ggml-small.bin",
            WhisperModel::Medium => "ggml-medium.bin",
            WhisperModel::Large => "ggml-large.bin",
        }
    }

    /// Get approximate model size in bytes
    pub fn size_bytes(&self) -> u64 {
        match self {
            WhisperModel::Tiny => 75_000_000,
            WhisperModel::Base => 142_000_000,
            WhisperModel::Small => 466_000_000,
            WhisperModel::Medium => 1_500_000_000,
            WhisperModel::Large => 3_000_000_000,
        }
    }
}

// ============================================================================
// Reading Position
// ============================================================================

/// Reading position for cursor synchronization
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ReadingPosition {
    /// Document ID
    pub document_id: String,
    /// Page number (1-indexed)
    pub page: u32,
    /// Paragraph ID within the page
    pub paragraph_id: String,
    /// Word index within the paragraph
    pub word_index: u32,
    /// Character offset within the word
    pub character_offset: u32,
    /// Timestamp in milliseconds from start of reading
    pub timestamp_ms: u64,
}

/// Word timing information for synchronization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WordTiming {
    /// The word text
    pub word: String,
    /// Start time in milliseconds
    pub start_ms: u64,
    /// End time in milliseconds
    pub end_ms: u64,
    /// Confidence score (0.0 to 1.0)
    pub confidence: f32,
}

// ============================================================================
// Transcription Result
// ============================================================================

/// Result from speech-to-text transcription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    /// Transcribed text
    pub text: String,
    /// Whether this is a final result (vs interim)
    pub is_final: bool,
    /// Overall confidence score
    pub confidence: f32,
    /// Timestamp when transcription was produced
    pub timestamp_ms: u64,
    /// Word-level timing information
    pub words: Vec<WordTiming>,
}

// ============================================================================
// Audio Data
// ============================================================================

/// Audio data for TTS output
#[derive(Debug, Clone)]
pub struct AudioData {
    /// Audio samples (mono, f32)
    pub samples: Vec<f32>,
    /// Sample rate in Hz
    pub sample_rate: u32,
    /// Number of channels (usually 1 for TTS)
    pub channels: u8,
}

/// Streaming audio chunk
#[derive(Debug, Clone)]
pub struct AudioChunk {
    /// Raw audio data (PCM or encoded)
    pub data: Vec<u8>,
    /// Word timings for this chunk
    pub word_timings: Vec<WordTiming>,
    /// Whether this is the final chunk
    pub is_final: bool,
}

// ============================================================================
// Voice Response
// ============================================================================

/// Response from voice command processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceResponse {
    /// Text response to display/speak
    pub text: String,
    /// Whether to speak the response
    pub should_speak: bool,
    /// Action to perform
    pub action: Option<VoiceAction>,
}

/// Action resulting from a voice command
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum VoiceAction {
    /// Add an annotation at the current position
    AddAnnotation {
        position: ReadingPosition,
        content: String,
        color: Option<String>,
    },
    /// Add a highlight at the current position
    AddHighlight {
        position: ReadingPosition,
        color: String,
    },
    /// Scroll to a specific position
    ScrollTo {
        position: ReadingPosition,
    },
    /// Display LLM response
    ShowLLMResponse {
        response: String,
    },
    /// Start reading from position
    StartReading {
        position: ReadingPosition,
    },
    /// Stop reading
    StopReading,
    /// Adjust reading speed
    AdjustSpeed {
        speed: f32,
    },
}

// ============================================================================
// Voice Manager
// ============================================================================

/// Voice interaction manager state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VoiceState {
    /// Idle, not listening or speaking
    Idle,
    /// Listening for voice input
    Listening,
    /// Processing voice input
    Processing,
    /// Speaking (TTS output)
    Speaking,
    /// Reading document aloud
    Reading,
}

/// Voice interaction manager
pub struct VoiceManager {
    /// Configuration
    config: VoiceConfig,
    /// Speech-to-text provider
    stt: Option<Box<dyn SpeechToText>>,
    /// Text-to-speech provider
    tts: Option<Box<dyn TextToSpeech>>,
    /// Voice command parser
    command_parser: VoiceCommandParser,
    /// Current reading position
    current_position: Arc<RwLock<Option<ReadingPosition>>>,
    /// Current state
    state: Arc<RwLock<VoiceState>>,
    /// Transcription sender
    transcription_tx: Option<mpsc::Sender<TranscriptionResult>>,
    /// Position update sender
    position_tx: Option<mpsc::Sender<ReadingPosition>>,
}

impl VoiceManager {
    /// Create a new voice manager
    pub fn new(config: VoiceConfig) -> Self {
        let command_parser = VoiceCommandParser::new(config.language.clone());

        Self {
            config,
            stt: None,
            tts: None,
            command_parser,
            current_position: Arc::new(RwLock::new(None)),
            state: Arc::new(RwLock::new(VoiceState::Idle)),
            transcription_tx: None,
            position_tx: None,
        }
    }

    /// Initialize providers based on configuration
    pub async fn initialize(&mut self) -> Result<(), VoiceError> {
        // Initialize STT provider
        self.stt = Some(providers::create_stt_provider(&self.config.stt_provider).await?);

        // Initialize TTS provider
        self.tts = Some(providers::create_tts_provider(&self.config.tts_provider).await?);

        tracing::info!("Voice manager initialized");
        Ok(())
    }

    /// Get current state
    pub async fn get_state(&self) -> VoiceState {
        *self.state.read().await
    }

    /// Start listening for voice input
    pub async fn start_listening(&mut self) -> Result<mpsc::Receiver<TranscriptionResult>, VoiceError> {
        let stt = self.stt.as_mut().ok_or(VoiceError::NotInitialized)?;

        let mut state = self.state.write().await;
        if *state != VoiceState::Idle {
            return Err(VoiceError::InvalidState("Already active".to_string()));
        }
        *state = VoiceState::Listening;
        drop(state);

        let rx = stt.start_listening().await?;
        tracing::info!("Started voice listening");
        Ok(rx)
    }

    /// Stop listening for voice input
    pub async fn stop_listening(&mut self) -> Result<(), VoiceError> {
        let stt = self.stt.as_mut().ok_or(VoiceError::NotInitialized)?;

        stt.stop_listening().await?;

        let mut state = self.state.write().await;
        *state = VoiceState::Idle;

        tracing::info!("Stopped voice listening");
        Ok(())
    }

    /// Process transcribed text into a command
    pub fn parse_command(&self, text: &str) -> VoiceCommand {
        self.command_parser.parse(text)
    }

    /// Read document content aloud with cursor synchronization
    pub async fn read_content(
        &mut self,
        content: &str,
        start_position: ReadingPosition,
    ) -> Result<mpsc::Receiver<ReadingPosition>, VoiceError> {
        let tts = self.tts.as_mut().ok_or(VoiceError::NotInitialized)?;

        let mut state = self.state.write().await;
        *state = VoiceState::Reading;
        drop(state);

        // Store starting position
        {
            let mut pos = self.current_position.write().await;
            *pos = Some(start_position.clone());
        }

        // Create channel for position updates
        let (tx, rx) = mpsc::channel(100);

        // Get word timings from TTS
        let word_timings = tts.get_word_timings(content).await?;

        // Start synthesis and playback
        let audio_rx = tts.synthesize_stream(content).await?;

        // Spawn task to handle position updates
        let current_position = self.current_position.clone();
        let state = self.state.clone();
        let document_id = start_position.document_id.clone();
        let page = start_position.page;
        let paragraph_id = start_position.paragraph_id.clone();

        tokio::spawn(async move {
            let mut word_index = 0u32;
            let start_time = std::time::Instant::now();

            for timing in word_timings {
                // Wait until it's time for this word
                let target_time = std::time::Duration::from_millis(timing.start_ms);
                let elapsed = start_time.elapsed();
                if target_time > elapsed {
                    tokio::time::sleep(target_time - elapsed).await;
                }

                // Check if still reading
                if *state.read().await != VoiceState::Reading {
                    break;
                }

                // Update position
                let position = ReadingPosition {
                    document_id: document_id.clone(),
                    page,
                    paragraph_id: paragraph_id.clone(),
                    word_index,
                    character_offset: 0,
                    timestamp_ms: timing.start_ms,
                };

                // Update stored position
                {
                    let mut pos = current_position.write().await;
                    *pos = Some(position.clone());
                }

                // Send position update
                if tx.send(position).await.is_err() {
                    break;
                }

                word_index += 1;
            }

            // Mark as idle when done
            let mut s = state.write().await;
            if *s == VoiceState::Reading {
                *s = VoiceState::Idle;
            }
        });

        tracing::info!("Started reading content");
        Ok(rx)
    }

    /// Stop reading
    pub async fn stop_reading(&mut self) -> Result<(), VoiceError> {
        let tts = self.tts.as_mut().ok_or(VoiceError::NotInitialized)?;

        tts.stop().await?;

        let mut state = self.state.write().await;
        *state = VoiceState::Idle;

        tracing::info!("Stopped reading");
        Ok(())
    }

    /// Speak text (for AI responses)
    pub async fn speak(&mut self, text: &str) -> Result<(), VoiceError> {
        let tts = self.tts.as_mut().ok_or(VoiceError::NotInitialized)?;

        let mut state = self.state.write().await;
        *state = VoiceState::Speaking;
        drop(state);

        let audio = tts.synthesize(text).await?;

        // Play audio
        audio::play_audio(&audio).await?;

        let mut state = self.state.write().await;
        *state = VoiceState::Idle;

        Ok(())
    }

    /// Get current reading position
    pub async fn get_reading_position(&self) -> Option<ReadingPosition> {
        self.current_position.read().await.clone()
    }

    /// Update configuration
    pub fn update_config(&mut self, config: VoiceConfig) {
        self.config = config;
        self.command_parser = VoiceCommandParser::new(self.config.language.clone());
    }

    /// Check if providers are initialized
    pub fn is_initialized(&self) -> bool {
        self.stt.is_some() && self.tts.is_some()
    }
}

// ============================================================================
// Errors
// ============================================================================

/// Voice-related errors
#[derive(Debug, thiserror::Error)]
pub enum VoiceError {
    #[error("Voice system not initialized")]
    NotInitialized,

    #[error("Invalid state: {0}")]
    InvalidState(String),

    #[error("Audio error: {0}")]
    AudioError(String),

    #[error("STT error: {0}")]
    STTError(String),

    #[error("TTS error: {0}")]
    TTSError(String),

    #[error("Provider not available: {0}")]
    ProviderNotAvailable(String),

    #[error("Model not found: {0}")]
    ModelNotFound(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

impl From<VoiceError> for crate::error::AppError {
    fn from(err: VoiceError) -> Self {
        crate::error::AppError::Voice(err.to_string())
    }
}
