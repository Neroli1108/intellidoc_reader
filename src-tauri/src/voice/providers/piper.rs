//! Piper Text-to-Speech Provider
//!
//! Local TTS using Piper neural voices.
//! Piper is a fast, local neural TTS system.

use async_trait::async_trait;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::sync::mpsc;

use crate::voice::audio;
use crate::voice::providers::{estimate_word_timings, TextToSpeech, VoiceGender, VoiceInfo};
use crate::voice::{AudioChunk, AudioData, VoiceError, WordTiming};

/// Piper TTS provider
pub struct PiperTTS {
    /// Path to the model file (.onnx)
    model_path: String,
    /// Path to model config (.json)
    config_path: String,
    /// Speaking rate (0.5 to 2.0)
    speaking_rate: f32,
    /// Whether currently synthesizing
    is_speaking: Arc<AtomicBool>,
    /// Path to piper executable (if using CLI)
    piper_path: Option<String>,
}

impl PiperTTS {
    /// Create a new Piper TTS instance
    pub async fn new(model_path: &str) -> Result<Self, VoiceError> {
        // Verify model exists
        if !std::path::Path::new(model_path).exists() {
            return Err(VoiceError::ModelNotFound(model_path.to_string()));
        }

        // Config file should be alongside the model
        let config_path = model_path.replace(".onnx", ".onnx.json");

        // Try to find piper executable
        let piper_path = find_piper_executable();

        Ok(Self {
            model_path: model_path.to_string(),
            config_path,
            speaking_rate: 1.0,
            is_speaking: Arc::new(AtomicBool::new(false)),
            piper_path,
        })
    }

    /// Synthesize using Piper CLI (fallback method)
    async fn synthesize_with_cli(&self, text: &str) -> Result<AudioData, VoiceError> {
        let piper_path = self.piper_path.as_ref().ok_or_else(|| {
            VoiceError::ProviderNotAvailable("Piper executable not found".to_string())
        })?;

        // Create temp file for output
        let temp_dir = std::env::temp_dir();
        let output_path = temp_dir.join(format!("piper_output_{}.wav", std::process::id()));

        // Run piper
        let mut cmd = Command::new(piper_path);
        cmd.arg("--model")
            .arg(&self.model_path)
            .arg("--output_file")
            .arg(&output_path)
            .stdin(Stdio::piped())
            .stdout(Stdio::null())
            .stderr(Stdio::piped());

        // Adjust for speaking rate
        if (self.speaking_rate - 1.0).abs() > 0.01 {
            cmd.arg("--length_scale")
                .arg(format!("{:.2}", 1.0 / self.speaking_rate));
        }

        let mut child = cmd.spawn().map_err(|e| {
            VoiceError::TTSError(format!("Failed to spawn piper: {}", e))
        })?;

        // Write text to stdin
        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(text.as_bytes())
                .await
                .map_err(|e| VoiceError::TTSError(format!("Failed to write to piper: {}", e)))?;
        }

        // Wait for completion
        let output = child.wait_with_output().await.map_err(|e| {
            VoiceError::TTSError(format!("Piper process failed: {}", e))
        })?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(VoiceError::TTSError(format!("Piper failed: {}", stderr)));
        }

        // Read the output WAV file
        let audio = read_wav_file(&output_path).await?;

        // Clean up temp file
        let _ = tokio::fs::remove_file(&output_path).await;

        Ok(audio)
    }

    /// Synthesize using Piper library (when available)
    #[cfg(feature = "piper-lib")]
    async fn synthesize_with_library(&self, text: &str) -> Result<AudioData, VoiceError> {
        // TODO: Implement direct library integration when piper-rs is available
        // For now, fall back to CLI
        self.synthesize_with_cli(text).await
    }

    #[cfg(not(feature = "piper-lib"))]
    async fn synthesize_with_library(&self, text: &str) -> Result<AudioData, VoiceError> {
        self.synthesize_with_cli(text).await
    }
}

#[async_trait]
impl TextToSpeech for PiperTTS {
    async fn synthesize(&self, text: &str) -> Result<AudioData, VoiceError> {
        if text.trim().is_empty() {
            return Ok(AudioData {
                samples: Vec::new(),
                sample_rate: 22050,
                channels: 1,
            });
        }

        self.is_speaking.store(true, Ordering::SeqCst);
        let result = self.synthesize_with_library(text).await;
        self.is_speaking.store(false, Ordering::SeqCst);

        result
    }

    async fn synthesize_stream(&self, text: &str) -> Result<mpsc::Receiver<AudioChunk>, VoiceError> {
        let (tx, rx) = mpsc::channel(100);

        // For Piper, we synthesize the whole thing and then stream it in chunks
        // In the future, sentence-by-sentence synthesis could improve latency
        let audio = self.synthesize(text).await?;
        let word_timings = estimate_word_timings(text, self.speaking_rate);

        // Stream in chunks
        tokio::spawn(async move {
            let chunk_size = 4096;
            let samples_per_chunk = chunk_size / 4; // f32 = 4 bytes
            let ms_per_sample = 1000.0 / audio.sample_rate as f32;

            for (i, chunk) in audio.samples.chunks(samples_per_chunk).enumerate() {
                let start_sample = i * samples_per_chunk;
                let end_sample = start_sample + chunk.len();
                let start_ms = (start_sample as f32 * ms_per_sample) as u64;
                let end_ms = (end_sample as f32 * ms_per_sample) as u64;

                // Find words in this time range
                let chunk_words: Vec<WordTiming> = word_timings
                    .iter()
                    .filter(|w| w.start_ms >= start_ms && w.start_ms < end_ms)
                    .cloned()
                    .collect();

                // Convert to bytes (for streaming)
                let data: Vec<u8> = chunk
                    .iter()
                    .flat_map(|&s| s.to_le_bytes())
                    .collect();

                let is_final = end_sample >= audio.samples.len();

                if tx
                    .send(AudioChunk {
                        data,
                        word_timings: chunk_words,
                        is_final,
                    })
                    .await
                    .is_err()
                {
                    break;
                }

                // Small delay to simulate streaming
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            }
        });

        Ok(rx)
    }

    async fn get_word_timings(&self, text: &str) -> Result<Vec<WordTiming>, VoiceError> {
        // Piper doesn't provide word timings directly
        // We estimate based on text length and speaking rate
        Ok(estimate_word_timings(text, self.speaking_rate))
    }

    async fn stop(&mut self) -> Result<(), VoiceError> {
        self.is_speaking.store(false, Ordering::SeqCst);
        Ok(())
    }

    fn available_voices(&self) -> Vec<VoiceInfo> {
        // Return info about built-in Piper voices
        // In practice, this would scan the voice_models/piper directory
        vec![
            VoiceInfo {
                id: "en_US-lessac-medium".to_string(),
                name: "Lessac (US English)".to_string(),
                language: "en-US".to_string(),
                gender: VoiceGender::Female,
                style: Some("neutral".to_string()),
            },
            VoiceInfo {
                id: "en_US-ryan-medium".to_string(),
                name: "Ryan (US English)".to_string(),
                language: "en-US".to_string(),
                gender: VoiceGender::Male,
                style: Some("neutral".to_string()),
            },
            VoiceInfo {
                id: "en_GB-alba-medium".to_string(),
                name: "Alba (British English)".to_string(),
                language: "en-GB".to_string(),
                gender: VoiceGender::Female,
                style: Some("neutral".to_string()),
            },
            VoiceInfo {
                id: "de_DE-thorsten-medium".to_string(),
                name: "Thorsten (German)".to_string(),
                language: "de-DE".to_string(),
                gender: VoiceGender::Male,
                style: Some("neutral".to_string()),
            },
            VoiceInfo {
                id: "es_ES-sharvard-medium".to_string(),
                name: "Sharvard (Spanish)".to_string(),
                language: "es-ES".to_string(),
                gender: VoiceGender::Male,
                style: Some("neutral".to_string()),
            },
            VoiceInfo {
                id: "fr_FR-upmc-medium".to_string(),
                name: "UPMC (French)".to_string(),
                language: "fr-FR".to_string(),
                gender: VoiceGender::Female,
                style: Some("neutral".to_string()),
            },
        ]
    }

    fn set_rate(&mut self, rate: f32) {
        self.speaking_rate = rate.clamp(0.25, 3.0);
    }

    fn set_voice(&mut self, voice_id: &str) -> Result<(), VoiceError> {
        // Construct model path from voice ID
        let base_dir = std::path::Path::new(&self.model_path)
            .parent()
            .unwrap_or(std::path::Path::new("voice_models/piper"));

        let new_model_path = base_dir.join(format!("{}.onnx", voice_id));

        if !new_model_path.exists() {
            return Err(VoiceError::ModelNotFound(voice_id.to_string()));
        }

        self.model_path = new_model_path.to_string_lossy().to_string();
        self.config_path = self.model_path.replace(".onnx", ".onnx.json");

        Ok(())
    }
}

/// Find piper executable in common locations
fn find_piper_executable() -> Option<String> {
    let possible_paths = [
        "piper",                              // In PATH
        "./piper",                            // Current directory
        "./piper/piper",                      // Subdirectory
        "bin/piper",                          // bin subdirectory
        "/usr/local/bin/piper",               // System install
        "/usr/bin/piper",                     // System install
        "C:\\piper\\piper.exe",               // Windows common
        "piper.exe",                          // Windows in PATH
    ];

    for path in possible_paths {
        if std::path::Path::new(path).exists() {
            return Some(path.to_string());
        }
    }

    // Try to find via which/where
    #[cfg(unix)]
    {
        if let Ok(output) = std::process::Command::new("which").arg("piper").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    return Some(path);
                }
            }
        }
    }

    #[cfg(windows)]
    {
        if let Ok(output) = std::process::Command::new("where").arg("piper").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout)
                    .lines()
                    .next()
                    .map(|s| s.trim().to_string());
                if let Some(p) = path {
                    if !p.is_empty() {
                        return Some(p);
                    }
                }
            }
        }
    }

    None
}

/// Read a WAV file and return AudioData
async fn read_wav_file(path: &std::path::Path) -> Result<AudioData, VoiceError> {
    let bytes = tokio::fs::read(path)
        .await
        .map_err(|e| VoiceError::IoError(e))?;

    // Parse WAV header (simplified)
    if bytes.len() < 44 {
        return Err(VoiceError::TTSError("Invalid WAV file".to_string()));
    }

    // Check RIFF header
    if &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err(VoiceError::TTSError("Invalid WAV format".to_string()));
    }

    // Find fmt chunk
    let mut pos = 12;
    let mut sample_rate = 22050u32;
    let mut channels = 1u8;
    let mut bits_per_sample = 16u16;

    while pos < bytes.len() - 8 {
        let chunk_id = &bytes[pos..pos + 4];
        let chunk_size = u32::from_le_bytes([
            bytes[pos + 4],
            bytes[pos + 5],
            bytes[pos + 6],
            bytes[pos + 7],
        ]) as usize;

        if chunk_id == b"fmt " {
            // Parse format chunk
            channels = u16::from_le_bytes([bytes[pos + 10], bytes[pos + 11]]) as u8;
            sample_rate = u32::from_le_bytes([
                bytes[pos + 12],
                bytes[pos + 13],
                bytes[pos + 14],
                bytes[pos + 15],
            ]);
            bits_per_sample = u16::from_le_bytes([bytes[pos + 22], bytes[pos + 23]]);
        } else if chunk_id == b"data" {
            // Parse data chunk
            let data_start = pos + 8;
            let data_end = (data_start + chunk_size).min(bytes.len());
            let audio_bytes = &bytes[data_start..data_end];

            // Convert to f32 samples
            let samples: Vec<f32> = match bits_per_sample {
                16 => audio_bytes
                    .chunks(2)
                    .map(|c| {
                        if c.len() == 2 {
                            let sample = i16::from_le_bytes([c[0], c[1]]);
                            sample as f32 / 32768.0
                        } else {
                            0.0
                        }
                    })
                    .collect(),
                8 => audio_bytes
                    .iter()
                    .map(|&b| (b as f32 - 128.0) / 128.0)
                    .collect(),
                32 => audio_bytes
                    .chunks(4)
                    .map(|c| {
                        if c.len() == 4 {
                            f32::from_le_bytes([c[0], c[1], c[2], c[3]])
                        } else {
                            0.0
                        }
                    })
                    .collect(),
                _ => {
                    return Err(VoiceError::TTSError(format!(
                        "Unsupported bits per sample: {}",
                        bits_per_sample
                    )));
                }
            };

            return Ok(AudioData {
                samples,
                sample_rate,
                channels,
            });
        }

        pos += 8 + chunk_size;
        // Ensure word alignment
        if chunk_size % 2 == 1 {
            pos += 1;
        }
    }

    Err(VoiceError::TTSError("No data chunk found in WAV".to_string()))
}

/// Download a Piper voice model
pub async fn download_voice(voice_id: &str, target_dir: &str) -> Result<String, VoiceError> {
    let model_path = format!("{}/{}.onnx", target_dir, voice_id);
    let config_path = format!("{}/{}.onnx.json", target_dir, voice_id);

    if std::path::Path::new(&model_path).exists() {
        tracing::info!("Piper voice already exists: {}", model_path);
        return Ok(model_path);
    }

    // Create directory if needed
    std::fs::create_dir_all(target_dir).map_err(|e| VoiceError::IoError(e))?;

    // Download URL (from Piper releases on Hugging Face)
    let base_url = format!(
        "https://huggingface.co/rhasspy/piper-voices/resolve/main/{}",
        voice_id.replace('-', "/")
    );

    let model_url = format!("{}/{}.onnx", base_url, voice_id);
    let config_url = format!("{}/{}.onnx.json", base_url, voice_id);

    tracing::info!("Downloading Piper voice from {}", model_url);

    #[cfg(feature = "download")]
    {
        // Download model
        let response = reqwest::get(&model_url)
            .await
            .map_err(|e| VoiceError::ApiError(e.to_string()))?;

        if !response.status().is_success() {
            return Err(VoiceError::ApiError(format!(
                "Failed to download voice model: HTTP {}",
                response.status()
            )));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| VoiceError::ApiError(e.to_string()))?;

        std::fs::write(&model_path, &bytes).map_err(|e| VoiceError::IoError(e))?;

        // Download config
        let response = reqwest::get(&config_url)
            .await
            .map_err(|e| VoiceError::ApiError(e.to_string()))?;

        if response.status().is_success() {
            let bytes = response
                .bytes()
                .await
                .map_err(|e| VoiceError::ApiError(e.to_string()))?;

            std::fs::write(&config_path, &bytes).map_err(|e| VoiceError::IoError(e))?;
        }

        tracing::info!("Downloaded Piper voice to {}", model_path);
    }

    #[cfg(not(feature = "download"))]
    {
        return Err(VoiceError::ProviderNotAvailable(
            "Download feature not enabled. Please manually download the voice.".to_string(),
        ));
    }

    Ok(model_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_piper_creation() {
        // This will fail if model doesn't exist, which is expected in tests
        let result = PiperTTS::new("nonexistent.onnx").await;
        assert!(result.is_err());
    }

    #[test]
    fn test_available_voices() {
        // Create a mock instance for testing
        let piper = PiperTTS {
            model_path: String::new(),
            config_path: String::new(),
            speaking_rate: 1.0,
            is_speaking: Arc::new(AtomicBool::new(false)),
            piper_path: None,
        };

        let voices = piper.available_voices();
        assert!(!voices.is_empty());
        assert!(voices.iter().any(|v| v.language == "en-US"));
    }

    #[test]
    fn test_set_rate() {
        let mut piper = PiperTTS {
            model_path: String::new(),
            config_path: String::new(),
            speaking_rate: 1.0,
            is_speaking: Arc::new(AtomicBool::new(false)),
            piper_path: None,
        };

        piper.set_rate(1.5);
        assert!((piper.speaking_rate - 1.5).abs() < 0.01);

        // Test clamping
        piper.set_rate(5.0);
        assert!((piper.speaking_rate - 3.0).abs() < 0.01);

        piper.set_rate(0.1);
        assert!((piper.speaking_rate - 0.25).abs() < 0.01);
    }
}
