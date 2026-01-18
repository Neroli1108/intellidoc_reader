//! Whisper.cpp Speech-to-Text Provider
//!
//! Local speech recognition using Whisper models via whisper-rs.

use async_trait::async_trait;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::sync::mpsc;

use crate::voice::audio::{AudioCapture, AudioConfig};
use crate::voice::providers::SpeechToText;
use crate::voice::{TranscriptionResult, VoiceError, WhisperModel, WordTiming};

/// Whisper STT provider
pub struct WhisperSTT {
    /// Path to the model file
    model_path: String,
    /// Model size
    model_size: WhisperModel,
    /// Whether currently listening
    is_listening: Arc<AtomicBool>,
    /// Audio capture instance
    audio_capture: Option<AudioCapture>,
    /// Language for transcription
    language: String,
    /// Whether to translate to English
    translate: bool,
}

impl WhisperSTT {
    /// Create a new Whisper STT instance
    pub async fn new(model_path: &str, model_size: WhisperModel) -> Result<Self, VoiceError> {
        // Verify model exists
        if !std::path::Path::new(model_path).exists() {
            return Err(VoiceError::ModelNotFound(model_path.to_string()));
        }

        Ok(Self {
            model_path: model_path.to_string(),
            model_size,
            is_listening: Arc::new(AtomicBool::new(false)),
            audio_capture: None,
            language: "en".to_string(),
            translate: false,
        })
    }

    /// Set the language for transcription
    pub fn set_language(&mut self, language: &str) {
        self.language = language.to_string();
    }

    /// Enable/disable translation to English
    pub fn set_translate(&mut self, translate: bool) {
        self.translate = translate;
    }

    /// Transcribe audio samples using Whisper
    #[cfg(feature = "whisper")]
    async fn transcribe_with_whisper(&self, samples: &[f32]) -> Result<TranscriptionResult, VoiceError> {
        use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};

        // Load context (in production, this should be cached)
        let ctx_params = WhisperContextParameters::default();
        let ctx = WhisperContext::new_with_params(&self.model_path, ctx_params)
            .map_err(|e| VoiceError::STTError(format!("Failed to load Whisper model: {}", e)))?;

        // Set up transcription parameters
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_language(Some(&self.language));
        params.set_translate(self.translate);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        params.set_token_timestamps(true); // Enable for word timings

        // Create state and run inference
        let mut state = ctx.create_state()
            .map_err(|e| VoiceError::STTError(format!("Failed to create Whisper state: {}", e)))?;

        state.full(params, samples)
            .map_err(|e| VoiceError::STTError(format!("Whisper transcription failed: {}", e)))?;

        // Extract results
        let num_segments = state.full_n_segments()
            .map_err(|e| VoiceError::STTError(e.to_string()))?;

        let mut text = String::new();
        let mut words = Vec::new();

        for i in 0..num_segments {
            let segment_text = state.full_get_segment_text(i)
                .map_err(|e| VoiceError::STTError(e.to_string()))?;
            text.push_str(&segment_text);

            // Get word-level timestamps if available
            let num_tokens = state.full_n_tokens(i)
                .map_err(|e| VoiceError::STTError(e.to_string()))?;

            for j in 0..num_tokens {
                if let Ok(token_data) = state.full_get_token_data(i, j) {
                    if let Ok(token_text) = state.full_get_token_text(i, j) {
                        let token_text = token_text.trim();
                        if !token_text.is_empty() && !token_text.starts_with('[') {
                            words.push(WordTiming {
                                word: token_text.to_string(),
                                start_ms: (token_data.t0 * 10) as u64, // Convert to ms
                                end_ms: (token_data.t1 * 10) as u64,
                                confidence: token_data.p,
                            });
                        }
                    }
                }
            }
        }

        Ok(TranscriptionResult {
            text: text.trim().to_string(),
            is_final: true,
            confidence: words.iter().map(|w| w.confidence).sum::<f32>() / words.len().max(1) as f32,
            timestamp_ms: 0,
            words,
        })
    }

    /// Stub transcription when whisper feature is not enabled
    #[cfg(not(feature = "whisper"))]
    async fn transcribe_with_whisper(&self, _samples: &[f32]) -> Result<TranscriptionResult, VoiceError> {
        tracing::warn!("Whisper feature not enabled - returning empty transcription");
        Ok(TranscriptionResult {
            text: String::new(),
            is_final: true,
            confidence: 0.0,
            timestamp_ms: 0,
            words: Vec::new(),
        })
    }
}

#[async_trait]
impl SpeechToText for WhisperSTT {
    async fn start_listening(&mut self) -> Result<mpsc::Receiver<TranscriptionResult>, VoiceError> {
        if self.is_listening.load(Ordering::SeqCst) {
            return Err(VoiceError::InvalidState("Already listening".to_string()));
        }

        self.is_listening.store(true, Ordering::SeqCst);

        // Create audio capture
        let config = AudioConfig {
            sample_rate: 16000, // Whisper expects 16kHz
            channels: 1,
            buffer_size: 1024,
        };
        let mut audio_capture = AudioCapture::new(config);
        let audio_rx = audio_capture.start_capture()?;
        self.audio_capture = Some(audio_capture);

        // Create transcription channel
        let (tx, rx) = mpsc::channel(100);

        // Spawn processing task
        let is_listening = self.is_listening.clone();
        let model_path = self.model_path.clone();
        let language = self.language.clone();
        let translate = self.translate;

        tokio::spawn(async move {
            let mut audio_buffer: Vec<f32> = Vec::new();
            let mut audio_rx = audio_rx;

            // Buffer size for ~2 seconds of audio at 16kHz
            let buffer_threshold = 32000;

            while is_listening.load(Ordering::SeqCst) {
                tokio::select! {
                    Some(samples) = audio_rx.recv() => {
                        audio_buffer.extend(samples);

                        // Process when we have enough audio
                        if audio_buffer.len() >= buffer_threshold {
                            // Create a temporary instance for transcription
                            // In production, this should use a shared context
                            if let Ok(whisper) = WhisperSTT::new(&model_path, WhisperModel::Base).await {
                                let mut whisper = whisper;
                                whisper.language = language.clone();
                                whisper.translate = translate;

                                match whisper.transcribe_with_whisper(&audio_buffer).await {
                                    Ok(result) => {
                                        if !result.text.is_empty() {
                                            let _ = tx.send(result).await;
                                        }
                                    }
                                    Err(e) => {
                                        tracing::error!("Transcription error: {}", e);
                                    }
                                }
                            }

                            // Keep last 0.5 seconds for context
                            let keep_samples = 8000;
                            if audio_buffer.len() > keep_samples {
                                audio_buffer = audio_buffer[audio_buffer.len() - keep_samples..].to_vec();
                            }
                        }
                    }
                    _ = tokio::time::sleep(tokio::time::Duration::from_millis(100)) => {
                        // Periodic check
                    }
                }
            }

            // Process any remaining audio
            if !audio_buffer.is_empty() {
                if let Ok(whisper) = WhisperSTT::new(&model_path, WhisperModel::Base).await {
                    if let Ok(result) = whisper.transcribe_with_whisper(&audio_buffer).await {
                        if !result.text.is_empty() {
                            let _ = tx.send(result).await;
                        }
                    }
                }
            }
        });

        tracing::info!("Started Whisper listening");
        Ok(rx)
    }

    async fn stop_listening(&mut self) -> Result<(), VoiceError> {
        self.is_listening.store(false, Ordering::SeqCst);

        if let Some(ref mut capture) = self.audio_capture {
            capture.stop_capture();
        }
        self.audio_capture = None;

        tracing::info!("Stopped Whisper listening");
        Ok(())
    }

    async fn transcribe(&self, audio: &[f32], _sample_rate: u32) -> Result<TranscriptionResult, VoiceError> {
        self.transcribe_with_whisper(audio).await
    }

    fn is_listening(&self) -> bool {
        self.is_listening.load(Ordering::SeqCst)
    }

    fn supported_languages(&self) -> Vec<String> {
        // Whisper supports many languages
        vec![
            "en".to_string(), // English
            "zh".to_string(), // Chinese
            "de".to_string(), // German
            "es".to_string(), // Spanish
            "ru".to_string(), // Russian
            "ko".to_string(), // Korean
            "fr".to_string(), // French
            "ja".to_string(), // Japanese
            "pt".to_string(), // Portuguese
            "tr".to_string(), // Turkish
            "pl".to_string(), // Polish
            "ca".to_string(), // Catalan
            "nl".to_string(), // Dutch
            "ar".to_string(), // Arabic
            "sv".to_string(), // Swedish
            "it".to_string(), // Italian
            "id".to_string(), // Indonesian
            "hi".to_string(), // Hindi
            "fi".to_string(), // Finnish
            "vi".to_string(), // Vietnamese
            "he".to_string(), // Hebrew
            "uk".to_string(), // Ukrainian
            "el".to_string(), // Greek
            "ms".to_string(), // Malay
            "cs".to_string(), // Czech
            "ro".to_string(), // Romanian
            "da".to_string(), // Danish
            "hu".to_string(), // Hungarian
            "ta".to_string(), // Tamil
            "no".to_string(), // Norwegian
            "th".to_string(), // Thai
        ]
    }
}

/// Download Whisper model if not present
pub async fn download_model(model_size: &WhisperModel, target_dir: &str) -> Result<String, VoiceError> {
    let filename = model_size.filename();
    let target_path = format!("{}/{}", target_dir, filename);

    if std::path::Path::new(&target_path).exists() {
        tracing::info!("Whisper model already exists: {}", target_path);
        return Ok(target_path);
    }

    // Create directory if needed
    std::fs::create_dir_all(target_dir)
        .map_err(|e| VoiceError::IoError(e))?;

    // Download URL (from Hugging Face)
    let url = format!(
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/{}",
        filename
    );

    tracing::info!("Downloading Whisper model from {}", url);

    // Download using reqwest
    #[cfg(feature = "download")]
    {
        let response = reqwest::get(&url).await
            .map_err(|e| VoiceError::ApiError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(VoiceError::ApiError(format!(
                "Failed to download model: HTTP {}",
                response.status()
            )));
        }

        let bytes = response.bytes().await
            .map_err(|e| VoiceError::ApiError(e.to_string()))?;

        std::fs::write(&target_path, &bytes)
            .map_err(|e| VoiceError::IoError(e))?;

        tracing::info!("Downloaded Whisper model to {}", target_path);
    }

    #[cfg(not(feature = "download"))]
    {
        return Err(VoiceError::ProviderNotAvailable(
            "Download feature not enabled. Please manually download the model.".to_string(),
        ));
    }

    Ok(target_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_whisper_creation() {
        // This will fail if model doesn't exist, which is expected in tests
        let result = WhisperSTT::new("nonexistent.bin", WhisperModel::Tiny).await;
        assert!(result.is_err());
    }

    #[test]
    fn test_supported_languages() {
        let whisper = WhisperSTT {
            model_path: String::new(),
            model_size: WhisperModel::Base,
            is_listening: Arc::new(AtomicBool::new(false)),
            audio_capture: None,
            language: "en".to_string(),
            translate: false,
        };

        let languages = whisper.supported_languages();
        assert!(languages.contains(&"en".to_string()));
        assert!(languages.contains(&"zh".to_string()));
    }
}
