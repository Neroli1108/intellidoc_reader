//! Annotation-related Tauri commands

use crate::annotation::{Annotation, AnnotationUpdate, HighlightColor};
use crate::error::AppError;
use tauri::AppHandle;
use uuid::Uuid;

/// Add a new annotation to a document
#[tauri::command]
pub async fn add_annotation(
    app: AppHandle,
    document_id: String,
    page_number: u32,
    start_offset: usize,
    end_offset: usize,
    selected_text: String,
    highlight_color: Option<HighlightColor>,
    note: Option<String>,
) -> Result<Annotation, AppError> {
    tracing::info!(
        "Adding annotation to document {} on page {}",
        document_id,
        page_number
    );

    let annotation = Annotation::new(
        document_id,
        page_number,
        start_offset,
        end_offset,
        selected_text,
        highlight_color,
        note,
    );

    crate::storage::save_annotation(&app, &annotation).await?;

    Ok(annotation)
}

/// Get all annotations for a document
#[tauri::command]
pub async fn get_annotations(
    app: AppHandle,
    document_id: String,
) -> Result<Vec<Annotation>, AppError> {
    tracing::debug!("Getting annotations for document {}", document_id);
    
    crate::storage::get_annotations(&app, &document_id).await
}

/// Update an existing annotation
#[tauri::command]
pub async fn update_annotation(
    app: AppHandle,
    annotation_id: String,
    update: AnnotationUpdate,
) -> Result<Annotation, AppError> {
    tracing::info!("Updating annotation {}", annotation_id);
    
    let id = Uuid::parse_str(&annotation_id)
        .map_err(|_| crate::error::AnnotationError::NotFound(annotation_id.clone()))?;
    
    crate::storage::update_annotation(&app, id, update).await
}

/// Delete an annotation
#[tauri::command]
pub async fn delete_annotation(
    app: AppHandle,
    annotation_id: String,
) -> Result<(), AppError> {
    tracing::info!("Deleting annotation {}", annotation_id);
    
    let id = Uuid::parse_str(&annotation_id)
        .map_err(|_| crate::error::AnnotationError::NotFound(annotation_id.clone()))?;
    
    crate::storage::delete_annotation(&app, id).await
}

/// Export annotations for a document
#[tauri::command]
pub async fn export_annotations(
    app: AppHandle,
    document_id: String,
    format: String,
) -> Result<String, AppError> {
    tracing::info!(
        "Exporting annotations for document {} as {}",
        document_id,
        format
    );

    let annotations = crate::storage::get_annotations(&app, &document_id).await?;
    
    match format.as_str() {
        "markdown" => Ok(crate::annotation::export::to_markdown(&annotations)),
        "json" => Ok(crate::annotation::export::to_json(&annotations)?),
        _ => Ok(crate::annotation::export::to_markdown(&annotations)),
    }
}
