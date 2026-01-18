//! IntelliDoc Reader - A fast, lightweight document reader with embedded AI assistant
//!
//! This library provides the core functionality for the IntelliDoc Reader application,
//! including document parsing, annotation management, LLM integration, voice interaction,
//! and storage.

pub mod commands;
pub mod document;
pub mod annotation;
pub mod llm;
pub mod voice;
pub mod storage;
pub mod error;

use tauri::Manager;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

/// Initialize and run the Tauri application
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .init();

    tracing::info!("Starting IntelliDoc Reader...");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(commands::editor::EditorManager::new())
        .manage(commands::voice::VoiceManagerState::new())
        .setup(|app| {
            // Initialize storage on startup
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = storage::init_database(&app_handle).await {
                    tracing::error!("Failed to initialize database: {}", e);
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Document commands
            commands::document::open_document,
            commands::document::get_document_content,
            commands::document::get_document_metadata,
            commands::document::get_recent_documents,
            
            // Annotation commands
            commands::annotation::add_annotation,
            commands::annotation::get_annotations,
            commands::annotation::update_annotation,
            commands::annotation::delete_annotation,
            commands::annotation::export_annotations,
            
            // LLM commands
            commands::llm::query_llm,
            commands::llm::explain_text,
            commands::llm::generate_code,
            commands::llm::get_model_status,
            commands::llm::get_available_providers,
            commands::llm::get_provider_models,
            commands::llm::set_llm_config,
            commands::llm::get_llm_config,
            
            // Document Editor commands
            commands::editor::open_editor,
            commands::editor::close_editor,
            commands::editor::has_unsaved_changes,
            commands::editor::get_operation_count,
            commands::editor::undo_operation,
            commands::editor::redo_operation,
            commands::editor::clear_operations,
            commands::editor::save_document,
            commands::editor::add_pdf_operation,
            commands::editor::get_pdf_operations,
            commands::editor::add_text_operation,
            commands::editor::get_text_content,
            commands::editor::set_text_content,
            commands::editor::get_word_stats,
            commands::editor::render_markdown_preview,
            commands::editor::add_docx_operation,
            commands::editor::add_latex_operation,
            commands::editor::get_latex_completions,
            commands::editor::add_epub_operation,
            commands::editor::merge_pdfs,
            commands::editor::split_pdf,
            commands::editor::extract_pdf_pages,
            commands::editor::compress_pdf,
            commands::editor::pdf_to_images,
            commands::editor::images_to_pdf,
            commands::editor::convert_markdown_to_pdf,
            commands::editor::convert_markdown_to_docx,
            commands::editor::convert_docx_to_pdf,
            commands::editor::convert_latex_to_pdf,
            commands::editor::convert_txt_to_markdown,
            
            // Voice commands
            commands::voice::get_voice_config,
            commands::voice::set_voice_config,
            commands::voice::initialize_voice,
            commands::voice::is_voice_initialized,
            commands::voice::get_voice_state,
            commands::voice::start_voice_listening,
            commands::voice::stop_voice_listening,
            commands::voice::parse_voice_command,
            commands::voice::speak_text,
            commands::voice::start_reading,
            commands::voice::stop_reading,
            commands::voice::get_reading_position,
            commands::voice::set_reading_speed,
            commands::voice::get_available_voices,
            commands::voice::get_stt_languages,
            commands::voice::is_voice_model_available,
            commands::voice::download_voice_model,
            commands::voice::process_voice_command,
            commands::voice::get_word_timings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
