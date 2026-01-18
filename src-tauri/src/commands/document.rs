//! Document-related Tauri commands

use crate::document::{Document, DocumentMetadata, RecentDocument};
use crate::error::AppError;
use tauri::AppHandle;

/// Open a document and return its parsed content
#[tauri::command]
pub async fn open_document(
    app: AppHandle,
    path: String,
) -> Result<Document, AppError> {
    tracing::info!("Opening document: {}", path);
    
    let document = crate::document::parser::parse_document(&path).await?;
    
    // Store in recent documents
    crate::storage::add_recent_document(&app, &document).await?;
    
    Ok(document)
}

/// Get the content of a specific page
#[tauri::command]
pub async fn get_document_content(
    document_id: String,
    page: u32,
) -> Result<String, AppError> {
    tracing::debug!("Getting content for document {} page {}", document_id, page);
    
    // TODO: Implement page content retrieval from cache
    Ok(String::new())
}

/// Get document metadata
#[tauri::command]
pub async fn get_document_metadata(
    document_id: String,
) -> Result<DocumentMetadata, AppError> {
    tracing::debug!("Getting metadata for document {}", document_id);
    
    // TODO: Implement metadata retrieval
    Ok(DocumentMetadata::default())
}

/// Get list of recently opened documents
#[tauri::command]
pub async fn get_recent_documents(
    app: AppHandle,
    limit: Option<usize>,
) -> Result<Vec<RecentDocument>, AppError> {
    let limit = limit.unwrap_or(10);
    tracing::debug!("Getting {} recent documents", limit);
    
    crate::storage::get_recent_documents(&app, limit).await
}
