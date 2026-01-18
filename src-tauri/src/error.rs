//! Error types for IntelliDoc Reader

use thiserror::Error;

/// Main error type for the application
#[derive(Error, Debug)]
pub enum AppError {
    #[error("Document error: {0}")]
    Document(#[from] DocumentError),

    #[error("Annotation error: {0}")]
    Annotation(#[from] AnnotationError),

    #[error("LLM error: {0}")]
    Llm(#[from] LlmError),

    #[error("Storage error: {0}")]
    Storage(#[from] StorageError),

    #[error("Voice error: {0}")]
    Voice(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Document-related errors
#[derive(Error, Debug)]
pub enum DocumentError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Unsupported format: {0}")]
    UnsupportedFormat(String),

    #[error("Parse error: {0}")]
    ParseError(String),

    #[error("Invalid document ID")]
    InvalidId,
}

/// Annotation-related errors
#[derive(Error, Debug)]
pub enum AnnotationError {
    #[error("Annotation not found: {0}")]
    NotFound(String),

    #[error("Invalid text range")]
    InvalidRange,

    #[error("Document not found for annotation")]
    DocumentNotFound,
}

/// LLM-related errors
#[derive(Error, Debug)]
pub enum LlmError {
    #[error("Model not loaded")]
    ModelNotLoaded,

    #[error("Model file not found: {0}")]
    ModelNotFound(String),

    #[error("Inference error: {0}")]
    InferenceError(String),

    #[error("Context too long")]
    ContextTooLong,
}

/// Storage-related errors
#[derive(Error, Debug)]
pub enum StorageError {
    #[error("Database error: {0}")]
    Database(String),

    #[error("Migration failed: {0}")]
    Migration(String),

    #[error("Serialization error: {0}")]
    Serialization(String),
}

// Implement serialization for Tauri commands
impl serde::Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
