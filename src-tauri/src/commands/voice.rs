//! Voice Interaction Tauri Commands
//!
//! Provides commands for voice-based interaction:
//! - Start/stop voice listening
//! - Text-to-speech for reading documents
//! - Voice command processing
//! - Reading position synchronization

use crate::error::AppError;
use crate::voice::{
    providers::{STTProvider, TTSProvider, VoiceInfo},
    ReadingPosition, VoiceAction, VoiceCommand, VoiceConfig, VoiceError, VoiceManager,
    VoiceResponse, VoiceState, WhisperModel, WordTiming,
};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::sync::{mpsc, Mutex, RwLock};

// ============================================================================
// State Management
// ============================================================================

/// Voice manager state for the application
pub struct VoiceManagerState {
    /// Voice manager instance
    manager: Arc<Mutex<VoiceManager>>,
    /// Configuration
    config: Arc<RwLock<VoiceConfig>>,
    /// Transcription receivers by session ID
    transcription_sessions: Arc<Mutex<HashMap<String, mpsc::Receiver<crate::voice::TranscriptionResult>>>>,
    /// Reading position receivers by document ID
    reading_sessions: Arc<Mutex<HashMap<String, mpsc::Receiver<ReadingPosition>>>>,
}

impl VoiceManagerState {
    pub fn new() -> Self {
        let config = VoiceConfig::default();
        let manager = VoiceManager::new(config.clone());

        Self {
            manager: Arc::new(Mutex::new(manager)),
            config: Arc::new(RwLock::new(config)),
            transcription_sessions: Arc::new(Mutex::new(HashMap::new())),
            reading_sessions: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for VoiceManagerState {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Configuration Commands
// ============================================================================

/// Get current voice configuration
#[tauri::command]
pub async fn get_voice_config(state: State<'_, VoiceManagerState>) -> Result<VoiceConfig, AppError> {
    let config = state.config.read().await;
    Ok(config.clone())
}

/// Update voice configuration
#[tauri::command]
pub async fn set_voice_config(
    state: State<'_, VoiceManagerState>,
    config: VoiceConfig,
) -> Result<(), AppError> {
    // Update stored config
    {
        let mut stored_config = state.config.write().await;
        *stored_config = config.clone();
    }

    // Update manager
    {
        let mut manager = state.manager.lock().await;
        manager.update_config(config);
    }

    Ok(())
}

/// Initialize voice system with current configuration
#[tauri::command]
pub async fn initialize_voice(state: State<'_, VoiceManagerState>) -> Result<bool, AppError> {
    let mut manager = state.manager.lock().await;

    manager
        .initialize()
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    Ok(true)
}

/// Check if voice system is initialized
#[tauri::command]
pub async fn is_voice_initialized(state: State<'_, VoiceManagerState>) -> Result<bool, AppError> {
    let manager = state.manager.lock().await;
    Ok(manager.is_initialized())
}

/// Get current voice state
#[tauri::command]
pub async fn get_voice_state(state: State<'_, VoiceManagerState>) -> Result<VoiceState, AppError> {
    let manager = state.manager.lock().await;
    Ok(manager.get_state().await)
}

// ============================================================================
// Speech-to-Text Commands
// ============================================================================

/// Start listening for voice input
#[tauri::command]
pub async fn start_voice_listening(
    app: AppHandle,
    state: State<'_, VoiceManagerState>,
    session_id: String,
) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;

    let rx = manager
        .start_listening()
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    // Store the receiver
    {
        let mut sessions = state.transcription_sessions.lock().await;
        sessions.insert(session_id.clone(), rx);
    }

    // Spawn task to emit transcription events
    let sessions = state.transcription_sessions.clone();
    let session_id_clone = session_id.clone();
    let app_clone = app.clone();

    tokio::spawn(async move {
        let mut rx = {
            let mut sessions = sessions.lock().await;
            sessions.remove(&session_id_clone)
        };

        if let Some(ref mut receiver) = rx {
            while let Some(result) = receiver.recv().await {
                // Emit event to frontend
                let _ = app_clone.emit("voice:transcription", &result);

                // Parse as command if final
                if result.is_final && !result.text.is_empty() {
                    let _ = app_clone.emit("voice:transcription_final", &result);
                }
            }
        }
    });

    Ok(())
}

/// Stop listening for voice input
#[tauri::command]
pub async fn stop_voice_listening(state: State<'_, VoiceManagerState>) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;

    manager
        .stop_listening()
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    Ok(())
}

/// Parse text as voice command
#[tauri::command]
pub async fn parse_voice_command(
    state: State<'_, VoiceManagerState>,
    text: String,
) -> Result<VoiceCommand, AppError> {
    let manager = state.manager.lock().await;
    Ok(manager.parse_command(&text))
}

/// Transcribe audio buffer (one-shot)
#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, VoiceManagerState>,
    audio_samples: Vec<f32>,
    sample_rate: u32,
) -> Result<String, AppError> {
    // This would require direct access to the STT provider
    // For now, return an error indicating to use streaming
    Err(AppError::Voice(
        "Use start_voice_listening for transcription".to_string(),
    ))
}

// ============================================================================
// Text-to-Speech Commands
// ============================================================================

/// Speak text using TTS
#[tauri::command]
pub async fn speak_text(state: State<'_, VoiceManagerState>, text: String) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;

    manager
        .speak(&text)
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    Ok(())
}

/// Start reading document content with cursor sync
#[tauri::command]
pub async fn start_reading(
    app: AppHandle,
    state: State<'_, VoiceManagerState>,
    document_id: String,
    content: String,
    start_position: ReadingPosition,
) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;

    let rx = manager
        .read_content(&content, start_position)
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    // Store the receiver
    {
        let mut sessions = state.reading_sessions.lock().await;
        sessions.insert(document_id.clone(), rx);
    }

    // Spawn task to emit position events
    let sessions = state.reading_sessions.clone();
    let doc_id_clone = document_id.clone();

    tokio::spawn(async move {
        let mut rx = {
            let mut sessions = sessions.lock().await;
            sessions.remove(&doc_id_clone)
        };

        if let Some(ref mut receiver) = rx {
            while let Some(position) = receiver.recv().await {
                // Emit position update event
                let _ = app.emit("voice:reading_position", &position);
            }

            // Emit reading complete event
            let _ = app.emit("voice:reading_complete", &doc_id_clone);
        }
    });

    Ok(())
}

/// Stop reading
#[tauri::command]
pub async fn stop_reading(state: State<'_, VoiceManagerState>) -> Result<(), AppError> {
    let mut manager = state.manager.lock().await;

    manager
        .stop_reading()
        .await
        .map_err(|e| AppError::Voice(e.to_string()))?;

    Ok(())
}

/// Get current reading position
#[tauri::command]
pub async fn get_reading_position(
    state: State<'_, VoiceManagerState>,
) -> Result<Option<ReadingPosition>, AppError> {
    let manager = state.manager.lock().await;
    Ok(manager.get_reading_position().await)
}

/// Set reading speed
#[tauri::command]
pub async fn set_reading_speed(
    state: State<'_, VoiceManagerState>,
    speed: f32,
) -> Result<(), AppError> {
    let mut config = state.config.write().await;
    config.reading_speed = speed.clamp(0.25, 3.0);

    // Update manager
    let mut manager = state.manager.lock().await;
    manager.update_config(config.clone());

    Ok(())
}

// ============================================================================
// Voice Provider Commands
// ============================================================================

/// Get available TTS voices
#[tauri::command]
pub async fn get_available_voices(
    state: State<'_, VoiceManagerState>,
) -> Result<Vec<VoiceInfo>, AppError> {
    // Return default voices since we may not have the TTS initialized
    Ok(vec![
        VoiceInfo {
            id: "en_US-lessac-medium".to_string(),
            name: "Lessac (US English)".to_string(),
            language: "en-US".to_string(),
            gender: crate::voice::providers::VoiceGender::Female,
            style: Some("neutral".to_string()),
        },
        VoiceInfo {
            id: "en_US-ryan-medium".to_string(),
            name: "Ryan (US English)".to_string(),
            language: "en-US".to_string(),
            gender: crate::voice::providers::VoiceGender::Male,
            style: Some("neutral".to_string()),
        },
    ])
}

/// Get supported languages for STT
#[tauri::command]
pub async fn get_stt_languages() -> Result<Vec<String>, AppError> {
    Ok(vec![
        "en".to_string(),
        "zh".to_string(),
        "de".to_string(),
        "es".to_string(),
        "fr".to_string(),
        "ja".to_string(),
        "ko".to_string(),
        "pt".to_string(),
        "ru".to_string(),
        "it".to_string(),
    ])
}

/// Check if a voice model is downloaded
#[tauri::command]
pub async fn is_voice_model_available(model_type: String, model_id: String) -> Result<bool, AppError> {
    let path = match model_type.as_str() {
        "whisper" => format!("voice_models/whisper/{}", model_id),
        "piper" => format!("voice_models/piper/{}.onnx", model_id),
        _ => return Ok(false),
    };

    Ok(std::path::Path::new(&path).exists())
}

/// Download a voice model
#[tauri::command]
pub async fn download_voice_model(
    app: AppHandle,
    model_type: String,
    model_id: String,
) -> Result<String, AppError> {
    let target_dir = format!("voice_models/{}", model_type);

    match model_type.as_str() {
        "whisper" => {
            let model_size = match model_id.as_str() {
                "tiny" | "ggml-tiny.bin" => WhisperModel::Tiny,
                "base" | "ggml-base.bin" => WhisperModel::Base,
                "small" | "ggml-small.bin" => WhisperModel::Small,
                "medium" | "ggml-medium.bin" => WhisperModel::Medium,
                "large" | "ggml-large.bin" => WhisperModel::Large,
                _ => {
                    return Err(AppError::Voice(format!("Unknown whisper model: {}", model_id)));
                }
            };

            crate::voice::providers::whisper::download_model(&model_size, &target_dir)
                .await
                .map_err(|e| AppError::Voice(e.to_string()))
        }
        "piper" => crate::voice::providers::piper::download_voice(&model_id, &target_dir)
            .await
            .map_err(|e| AppError::Voice(e.to_string())),
        _ => Err(AppError::Voice(format!("Unknown model type: {}", model_type))),
    }
}

// ============================================================================
// Voice Command Processing
// ============================================================================

/// Process a voice command and return the action to take
#[tauri::command]
pub async fn process_voice_command(
    state: State<'_, VoiceManagerState>,
    command: VoiceCommand,
    current_position: Option<ReadingPosition>,
) -> Result<VoiceResponse, AppError> {
    match command {
        VoiceCommand::NoteDown { content } => {
            let position = current_position.unwrap_or_default();
            Ok(VoiceResponse {
                text: format!("Added note: {}", content),
                should_speak: true,
                action: Some(VoiceAction::AddAnnotation {
                    position,
                    content,
                    color: Some("yellow".to_string()),
                }),
            })
        }

        VoiceCommand::Highlight { color } => {
            let position = current_position.unwrap_or_default();
            Ok(VoiceResponse {
                text: "Highlighted".to_string(),
                should_speak: false,
                action: Some(VoiceAction::AddHighlight {
                    position,
                    color: color.unwrap_or_else(|| "yellow".to_string()),
                }),
            })
        }

        VoiceCommand::StartReading => {
            let position = current_position.unwrap_or_default();
            Ok(VoiceResponse {
                text: "Starting to read".to_string(),
                should_speak: false,
                action: Some(VoiceAction::StartReading { position }),
            })
        }

        VoiceCommand::StopReading => Ok(VoiceResponse {
            text: "Stopped reading".to_string(),
            should_speak: false,
            action: Some(VoiceAction::StopReading),
        }),

        VoiceCommand::AdjustSpeed { delta } => {
            let mut config = state.config.write().await;
            config.reading_speed = (config.reading_speed + delta).clamp(0.25, 3.0);

            Ok(VoiceResponse {
                text: format!("Speed set to {:.1}x", config.reading_speed),
                should_speak: true,
                action: Some(VoiceAction::AdjustSpeed {
                    speed: config.reading_speed,
                }),
            })
        }

        VoiceCommand::SetSpeed { speed } => {
            let mut config = state.config.write().await;
            config.reading_speed = speed.clamp(0.25, 3.0);

            Ok(VoiceResponse {
                text: format!("Speed set to {:.1}x", config.reading_speed),
                should_speak: true,
                action: Some(VoiceAction::AdjustSpeed {
                    speed: config.reading_speed,
                }),
            })
        }

        VoiceCommand::AskQuestion { question } => {
            // This would integrate with the LLM module
            Ok(VoiceResponse {
                text: format!("Processing question: {}", question),
                should_speak: false,
                action: None,
            })
        }

        VoiceCommand::ExplainSelection => Ok(VoiceResponse {
            text: "Explaining selection...".to_string(),
            should_speak: false,
            action: None,
        }),

        VoiceCommand::Summarize { scope } => Ok(VoiceResponse {
            text: format!("Summarizing {:?}...", scope),
            should_speak: false,
            action: None,
        }),

        VoiceCommand::GoToPage { page } => {
            let mut position = current_position.unwrap_or_default();
            position.page = page;
            Ok(VoiceResponse {
                text: format!("Going to page {}", page),
                should_speak: true,
                action: Some(VoiceAction::ScrollTo { position }),
            })
        }

        VoiceCommand::NavigatePage { direction } => {
            let mut position = current_position.unwrap_or_default();
            match direction {
                crate::voice::commands::PageDirection::Next => position.page += 1,
                crate::voice::commands::PageDirection::Previous => {
                    position.page = position.page.saturating_sub(1).max(1)
                }
            }
            Ok(VoiceResponse {
                text: format!("Page {}", position.page),
                should_speak: false,
                action: Some(VoiceAction::ScrollTo { position }),
            })
        }

        VoiceCommand::Repeat => Ok(VoiceResponse {
            text: "Repeating...".to_string(),
            should_speak: false,
            action: None,
        }),

        VoiceCommand::FreeText { text } => Ok(VoiceResponse {
            text,
            should_speak: false,
            action: None,
        }),

        _ => Ok(VoiceResponse {
            text: "Command not recognized".to_string(),
            should_speak: true,
            action: None,
        }),
    }
}

// ============================================================================
// Utility Commands
// ============================================================================

/// Get estimated word timings for text
#[tauri::command]
pub async fn get_word_timings(
    state: State<'_, VoiceManagerState>,
    text: String,
) -> Result<Vec<WordTiming>, AppError> {
    let config = state.config.read().await;
    Ok(crate::voice::providers::estimate_word_timings(
        &text,
        config.reading_speed,
    ))
}
