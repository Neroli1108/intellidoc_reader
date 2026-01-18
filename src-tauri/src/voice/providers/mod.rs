//! Voice Provider Implementations
//!
//! Provides STT (Speech-to-Text) and TTS (Text-to-Speech) provider implementations.

pub mod whisper;
pub mod piper;
// pub mod aws;      // Uncomment when AWS SDK is added
// pub mod google;   // Uncomment when Google Cloud SDK is added
// pub mod openai;   // Uncomment when OpenAI API is added

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

use crate::voice::{AudioChunk, AudioData, TranscriptionResult, VoiceError, WhisperModel, WordTiming};

// ============================================================================
// Provider Configuration
// ============================================================================

/// Speech-to-Text provider options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum STTProvider {
    /// Local Whisper.cpp
    WhisperLocal {
        model_path: String,
        model_size: WhisperModel,
    },
    /// Vosk (local)
    Vosk {
        model_path: String,
    },
    /// OpenAI Whisper API
    OpenAIWhisper {
        api_key: String,
    },
    /// AWS Transcribe
    AWSTranscribe {
        region: String,
        access_key_id: String,
        secret_access_key: String,
    },
    /// Google Cloud Speech-to-Text
    GoogleSpeech {
        credentials_path: String,
        project_id: String,
    },
    /// Azure Speech Services
    AzureSpeech {
        subscription_key: String,
        region: String,
    },
    /// Deepgram
    Deepgram {
        api_key: String,
        model: String,
    },
    /// AssemblyAI
    AssemblyAI {
        api_key: String,
    },
}

/// Text-to-Speech provider options
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TTSProvider {
    /// Local Piper TTS
    PiperLocal {
        model_path: String,
    },
    /// Local Coqui TTS
    CoquiLocal {
        model_name: String,
    },
    /// eSpeak-ng (basic)
    ESpeakNG {
        voice: String,
    },
    /// OpenAI TTS
    OpenAITTS {
        api_key: String,
        voice: String,
        model: String,
    },
    /// AWS Polly
    AWSPolly {
        region: String,
        access_key_id: String,
        secret_access_key: String,
        voice_id: String,
        engine: PollyEngine,
    },
    /// Google Cloud TTS
    GoogleTTS {
        credentials_path: String,
        voice_name: String,
        speaking_rate: f32,
    },
    /// Azure Neural TTS
    AzureTTS {
        subscription_key: String,
        region: String,
        voice_name: String,
    },
    /// ElevenLabs
    ElevenLabs {
        api_key: String,
        voice_id: String,
        stability: f32,
        clarity: f32,
    },
}

/// AWS Polly engine types
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum PollyEngine {
    #[default]
    Standard,
    Neural,
    Generative,
}

// ============================================================================
// Provider Traits
// ============================================================================

/// Speech-to-Text trait for all providers
#[async_trait]
pub trait SpeechToText: Send + Sync {
    /// Start listening and return a channel for transcription results
    async fn start_listening(&mut self) -> Result<mpsc::Receiver<TranscriptionResult>, VoiceError>;

    /// Stop listening
    async fn stop_listening(&mut self) -> Result<(), VoiceError>;

    /// Transcribe a single audio buffer (batch mode)
    async fn transcribe(&self, audio: &[f32], sample_rate: u32) -> Result<TranscriptionResult, VoiceError>;

    /// Check if currently listening
    fn is_listening(&self) -> bool;

    /// Get supported languages
    fn supported_languages(&self) -> Vec<String>;
}

/// Text-to-Speech trait for all providers
#[async_trait]
pub trait TextToSpeech: Send + Sync {
    /// Synthesize text to audio (blocking, returns full audio)
    async fn synthesize(&self, text: &str) -> Result<AudioData, VoiceError>;

    /// Synthesize text with streaming output
    async fn synthesize_stream(&self, text: &str) -> Result<mpsc::Receiver<AudioChunk>, VoiceError>;

    /// Get word timings for synchronization
    async fn get_word_timings(&self, text: &str) -> Result<Vec<WordTiming>, VoiceError>;

    /// Stop current synthesis/playback
    async fn stop(&mut self) -> Result<(), VoiceError>;

    /// Get available voices
    fn available_voices(&self) -> Vec<VoiceInfo>;

    /// Set speaking rate (0.5 to 2.0)
    fn set_rate(&mut self, rate: f32);

    /// Set voice by ID
    fn set_voice(&mut self, voice_id: &str) -> Result<(), VoiceError>;
}

/// Voice information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VoiceInfo {
    pub id: String,
    pub name: String,
    pub language: String,
    pub gender: VoiceGender,
    pub style: Option<String>,
}

/// Voice gender
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VoiceGender {
    Male,
    Female,
    Neutral,
}

// ============================================================================
// Provider Factory Functions
// ============================================================================

/// Create an STT provider based on configuration
pub async fn create_stt_provider(config: &STTProvider) -> Result<Box<dyn SpeechToText>, VoiceError> {
    match config {
        STTProvider::WhisperLocal { model_path, model_size } => {
            let provider = whisper::WhisperSTT::new(model_path, model_size.clone()).await?;
            Ok(Box::new(provider))
        }
        STTProvider::Vosk { model_path: _ } => {
            // TODO: Implement Vosk provider
            Err(VoiceError::ProviderNotAvailable("Vosk not yet implemented".to_string()))
        }
        STTProvider::OpenAIWhisper { api_key: _ } => {
            // TODO: Implement OpenAI Whisper API
            Err(VoiceError::ProviderNotAvailable("OpenAI Whisper API not yet implemented".to_string()))
        }
        STTProvider::AWSTranscribe { .. } => {
            // TODO: Implement AWS Transcribe
            Err(VoiceError::ProviderNotAvailable("AWS Transcribe not yet implemented".to_string()))
        }
        STTProvider::GoogleSpeech { .. } => {
            // TODO: Implement Google Cloud Speech
            Err(VoiceError::ProviderNotAvailable("Google Speech not yet implemented".to_string()))
        }
        STTProvider::AzureSpeech { .. } => {
            // TODO: Implement Azure Speech
            Err(VoiceError::ProviderNotAvailable("Azure Speech not yet implemented".to_string()))
        }
        STTProvider::Deepgram { .. } => {
            // TODO: Implement Deepgram
            Err(VoiceError::ProviderNotAvailable("Deepgram not yet implemented".to_string()))
        }
        STTProvider::AssemblyAI { .. } => {
            // TODO: Implement AssemblyAI
            Err(VoiceError::ProviderNotAvailable("AssemblyAI not yet implemented".to_string()))
        }
    }
}

/// Create a TTS provider based on configuration
pub async fn create_tts_provider(config: &TTSProvider) -> Result<Box<dyn TextToSpeech>, VoiceError> {
    match config {
        TTSProvider::PiperLocal { model_path } => {
            let provider = piper::PiperTTS::new(model_path).await?;
            Ok(Box::new(provider))
        }
        TTSProvider::CoquiLocal { model_name: _ } => {
            // TODO: Implement Coqui TTS
            Err(VoiceError::ProviderNotAvailable("Coqui TTS not yet implemented".to_string()))
        }
        TTSProvider::ESpeakNG { voice: _ } => {
            // TODO: Implement eSpeak-ng
            Err(VoiceError::ProviderNotAvailable("eSpeak-ng not yet implemented".to_string()))
        }
        TTSProvider::OpenAITTS { .. } => {
            // TODO: Implement OpenAI TTS
            Err(VoiceError::ProviderNotAvailable("OpenAI TTS not yet implemented".to_string()))
        }
        TTSProvider::AWSPolly { .. } => {
            // TODO: Implement AWS Polly
            Err(VoiceError::ProviderNotAvailable("AWS Polly not yet implemented".to_string()))
        }
        TTSProvider::GoogleTTS { .. } => {
            // TODO: Implement Google TTS
            Err(VoiceError::ProviderNotAvailable("Google TTS not yet implemented".to_string()))
        }
        TTSProvider::AzureTTS { .. } => {
            // TODO: Implement Azure TTS
            Err(VoiceError::ProviderNotAvailable("Azure TTS not yet implemented".to_string()))
        }
        TTSProvider::ElevenLabs { .. } => {
            // TODO: Implement ElevenLabs
            Err(VoiceError::ProviderNotAvailable("ElevenLabs not yet implemented".to_string()))
        }
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/// Estimate word timings from text (simple approach)
pub fn estimate_word_timings(text: &str, speaking_rate: f32) -> Vec<WordTiming> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let mut timings = Vec::with_capacity(words.len());

    // Estimate average speaking rate: ~150 words per minute at 1.0x
    let words_per_second = 2.5 * speaking_rate;
    let ms_per_word = (1000.0 / words_per_second) as u64;

    let mut current_ms = 0u64;

    for word in words {
        // Adjust duration based on word length
        let word_duration = (ms_per_word as f32 * (word.len() as f32 / 5.0).max(0.5)) as u64;

        timings.push(WordTiming {
            word: word.to_string(),
            start_ms: current_ms,
            end_ms: current_ms + word_duration,
            confidence: 1.0,
        });

        current_ms += word_duration;
    }

    timings
}

/// Check if a model file exists
pub fn model_exists(path: &str) -> bool {
    std::path::Path::new(path).exists()
}

/// Get default model path for a provider
pub fn get_default_model_path(provider_type: &str) -> Option<String> {
    match provider_type {
        "whisper" => Some("voice_models/whisper/ggml-base.bin".to_string()),
        "piper" => Some("voice_models/piper/en_US-lessac-medium.onnx".to_string()),
        _ => None,
    }
}
