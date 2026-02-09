//! Document Editor Tauri commands
//!
//! Provides commands for editing various document types:
//! - PDF, Text/Markdown, DOCX, LaTeX, EPUB

use crate::document::editor::{
    CommonEditOperation, ConversionUtils, DOCXEditOperation, DOCXEditor, DocumentEditor,
    EPUBEditOperation, EPUBEditor, EditOperation, EditOperationInfo, EditorConfig, EditorError,
    ImageFormat, LaTeXEditOperation, LaTeXEditor, PDFEditOperation, PDFEditor, PDFUtils,
    TextEditOperation, TextEditor, WordStats,
};
use crate::document::DocumentType;
use crate::error::AppError;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tauri::{AppHandle, Manager};

// ============================================================================
// Editor Manager
// ============================================================================

/// Enum to hold different editor types
pub enum EditorInstance {
    Pdf(PDFEditor),
    Text(TextEditor),
    Docx(DOCXEditor),
    LaTeX(LaTeXEditor),
    Epub(EPUBEditor),
}

impl EditorInstance {
    /// Get the underlying editor as a trait object
    fn as_editor(&self) -> &dyn DocumentEditor {
        match self {
            EditorInstance::Pdf(e) => e,
            EditorInstance::Text(e) => e,
            EditorInstance::Docx(e) => e,
            EditorInstance::LaTeX(e) => e,
            EditorInstance::Epub(e) => e,
        }
    }

    /// Get the underlying editor as a mutable trait object
    fn as_editor_mut(&mut self) -> &mut dyn DocumentEditor {
        match self {
            EditorInstance::Pdf(e) => e,
            EditorInstance::Text(e) => e,
            EditorInstance::Docx(e) => e,
            EditorInstance::LaTeX(e) => e,
            EditorInstance::Epub(e) => e,
        }
    }
}

/// Editor state manager for all document types
pub struct EditorManager {
    editors: Mutex<HashMap<String, EditorInstance>>,
}

impl EditorManager {
    pub fn new() -> Self {
        Self {
            editors: Mutex::new(HashMap::new()),
        }
    }
}

impl Default for EditorManager {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Generic Editor Commands
// ============================================================================

/// Open a document for editing (auto-detects type)
#[tauri::command]
pub async fn open_editor(
    app: AppHandle,
    document_id: String,
    path: String,
) -> Result<String, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    if editors.contains_key(&document_id) {
        return Ok("already_open".to_string());
    }

    // Detect document type from extension
    let doc_type = std::path::Path::new(&path)
        .extension()
        .and_then(|ext| ext.to_str())
        .and_then(DocumentType::from_extension)
        .ok_or_else(|| crate::error::DocumentError::ParseError("Unknown file type".to_string()))?;

    let editor = match doc_type {
        DocumentType::Pdf => {
            let e = PDFEditor::new(&path)
                .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
            EditorInstance::Pdf(e)
        }
        DocumentType::Txt | DocumentType::Markdown => {
            let e = TextEditor::new(&path)
                .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
            EditorInstance::Text(e)
        }
        DocumentType::Docx => {
            let e = DOCXEditor::new(&path)
                .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
            EditorInstance::Docx(e)
        }
        DocumentType::Latex => {
            let e = LaTeXEditor::new(&path)
                .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
            EditorInstance::LaTeX(e)
        }
        DocumentType::Epub => {
            let e = EPUBEditor::new(&path)
                .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
            EditorInstance::Epub(e)
        }
    };

    let doc_type_str = format!("{:?}", doc_type).to_lowercase();
    editors.insert(document_id, editor);

    Ok(doc_type_str)
}

/// Close editor and discard changes
#[tauri::command]
pub async fn close_editor(app: AppHandle, document_id: String) -> Result<(), AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;
    editors.remove(&document_id);
    Ok(())
}

/// Check if document has unsaved changes
#[tauri::command]
pub async fn has_unsaved_changes(app: AppHandle, document_id: String) -> Result<bool, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    Ok(editor.as_editor().has_unsaved_changes())
}

/// Get operation count
#[tauri::command]
pub async fn get_operation_count(app: AppHandle, document_id: String) -> Result<usize, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    Ok(editor.as_editor().operation_count())
}

/// Undo last operation
#[tauri::command]
pub async fn undo_operation(app: AppHandle, document_id: String) -> Result<bool, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    Ok(editor.as_editor_mut().undo().is_some())
}

/// Redo previously undone operation
#[tauri::command]
pub async fn redo_operation(app: AppHandle, document_id: String) -> Result<bool, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    Ok(editor.as_editor_mut().redo().is_some())
}

/// Clear all pending operations
#[tauri::command]
pub async fn clear_operations(app: AppHandle, document_id: String) -> Result<(), AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    editor.as_editor_mut().clear_operations();
    Ok(())
}

/// Save changes to the document
#[tauri::command]
pub async fn save_document(
    app: AppHandle,
    document_id: String,
    output_path: Option<String>,
) -> Result<String, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    if let Some(path) = output_path {
        editor
            .as_editor()
            .save_as(&path)
            .await
            .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
        Ok(path)
    } else {
        editor
            .as_editor_mut()
            .save()
            .await
            .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
        Ok("saved".to_string())
    }
}

// ============================================================================
// PDF Editor Commands
// ============================================================================

/// Add a PDF edit operation
#[tauri::command]
pub async fn add_pdf_operation(
    app: AppHandle,
    document_id: String,
    operation: PDFEditOperation,
) -> Result<EditOperationInfo, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Pdf(pdf_editor) => {
            let info = EditOperationInfo::from_operation(&EditOperation::Pdf(operation.clone()));
            pdf_editor.add_operation(operation);
            Ok(info)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a PDF".to_string(),
        )
        .into()),
    }
}

/// Get all pending PDF operations
#[tauri::command]
pub async fn get_pdf_operations(
    app: AppHandle,
    document_id: String,
) -> Result<Vec<EditOperationInfo>, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Pdf(pdf_editor) => {
            let operations: Vec<EditOperationInfo> = pdf_editor
                .get_operations()
                .iter()
                .map(|op| EditOperationInfo::from_operation(&EditOperation::Pdf(op.clone())))
                .collect();
            Ok(operations)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a PDF".to_string(),
        )
        .into()),
    }
}

// ============================================================================
// Text/Markdown Editor Commands
// ============================================================================

/// Add a text edit operation
#[tauri::command]
pub async fn add_text_operation(
    app: AppHandle,
    document_id: String,
    operation: TextEditOperation,
) -> Result<EditOperationInfo, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Text(text_editor) => {
            let info = EditOperationInfo::from_operation(&EditOperation::Text(operation.clone()));
            text_editor.add_operation(operation);
            Ok(info)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a text file".to_string(),
        )
        .into()),
    }
}

/// Get text content
#[tauri::command]
pub async fn get_text_content(app: AppHandle, document_id: String) -> Result<String, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Text(text_editor) => Ok(text_editor.get_content().to_string()),
        EditorInstance::LaTeX(latex_editor) => Ok(latex_editor.get_content().to_string()),
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a text file".to_string(),
        )
        .into()),
    }
}

/// Set text content directly
#[tauri::command]
pub async fn set_text_content(
    app: AppHandle,
    document_id: String,
    content: String,
) -> Result<(), AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Text(text_editor) => {
            text_editor.set_content(content);
            Ok(())
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a text file".to_string(),
        )
        .into()),
    }
}

/// Get word statistics
#[tauri::command]
pub async fn get_word_stats(app: AppHandle, document_id: String) -> Result<WordStats, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Text(text_editor) => Ok(text_editor.get_word_stats()),
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a text file".to_string(),
        )
        .into()),
    }
}

/// Render markdown preview
#[tauri::command]
pub async fn render_markdown_preview(
    app: AppHandle,
    document_id: String,
) -> Result<String, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Text(text_editor) => Ok(text_editor.render_markdown_preview()),
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a text file".to_string(),
        )
        .into()),
    }
}

// ============================================================================
// DOCX Editor Commands
// ============================================================================

/// Add a DOCX edit operation
#[tauri::command]
pub async fn add_docx_operation(
    app: AppHandle,
    document_id: String,
    operation: DOCXEditOperation,
) -> Result<EditOperationInfo, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Docx(docx_editor) => {
            let info = EditOperationInfo::from_operation(&EditOperation::Docx(operation.clone()));
            docx_editor.add_operation(operation);
            Ok(info)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a DOCX file".to_string(),
        )
        .into()),
    }
}

// ============================================================================
// LaTeX Editor Commands
// ============================================================================

/// Add a LaTeX edit operation
#[tauri::command]
pub async fn add_latex_operation(
    app: AppHandle,
    document_id: String,
    operation: LaTeXEditOperation,
) -> Result<EditOperationInfo, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::LaTeX(latex_editor) => {
            let info = EditOperationInfo::from_operation(&EditOperation::Latex(operation.clone()));
            latex_editor.add_operation(operation);
            Ok(info)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a LaTeX file".to_string(),
        )
        .into()),
    }
}

/// Get LaTeX command completions
#[tauri::command]
pub async fn get_latex_completions(
    app: AppHandle,
    document_id: String,
    prefix: String,
) -> Result<Vec<String>, AppError> {
    let manager = app.state::<EditorManager>();
    let editors = manager.editors.lock().await;

    let editor = editors
        .get(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::LaTeX(latex_editor) => Ok(latex_editor.get_completions(&prefix)),
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not a LaTeX file".to_string(),
        )
        .into()),
    }
}

// ============================================================================
// EPUB Editor Commands
// ============================================================================

/// Add an EPUB edit operation
#[tauri::command]
pub async fn add_epub_operation(
    app: AppHandle,
    document_id: String,
    operation: EPUBEditOperation,
) -> Result<EditOperationInfo, AppError> {
    let manager = app.state::<EditorManager>();
    let mut editors = manager.editors.lock().await;

    let editor = editors
        .get_mut(&document_id)
        .ok_or(crate::error::DocumentError::InvalidId)?;

    match editor {
        EditorInstance::Epub(epub_editor) => {
            let info = EditOperationInfo::from_operation(&EditOperation::Epub(operation.clone()));
            epub_editor.add_operation(operation);
            Ok(info)
        }
        _ => Err(crate::error::DocumentError::ParseError(
            "Document is not an EPUB file".to_string(),
        )
        .into()),
    }
}

// ============================================================================
// PDF Utility Commands
// ============================================================================

/// Merge multiple PDFs
#[tauri::command]
pub async fn merge_pdfs(input_paths: Vec<String>, output_path: String) -> Result<(), AppError> {
    let paths: Vec<&str> = input_paths.iter().map(|s| s.as_str()).collect();
    PDFUtils::merge(&paths, &output_path)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Split a PDF
#[tauri::command]
pub async fn split_pdf(
    input_path: String,
    ranges: Vec<(u32, u32)>,
    output_prefix: String,
) -> Result<Vec<String>, AppError> {
    let result = PDFUtils::split(&input_path, &ranges, &output_prefix)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(result)
}

/// Extract pages from PDF
#[tauri::command]
pub async fn extract_pdf_pages(
    input_path: String,
    pages: Vec<u32>,
    output_path: String,
) -> Result<(), AppError> {
    PDFUtils::extract_pages(&input_path, &pages, &output_path)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Compress PDF
#[tauri::command]
pub async fn compress_pdf(
    input_path: String,
    output_path: String,
    quality: u8,
) -> Result<(), AppError> {
    PDFUtils::compress(&input_path, &output_path, quality)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Convert PDF to images
#[tauri::command]
pub async fn pdf_to_images(
    input_path: String,
    output_dir: String,
    format: String,
    dpi: u32,
) -> Result<Vec<String>, AppError> {
    let img_format = match format.to_lowercase().as_str() {
        "png" => ImageFormat::Png,
        "jpeg" | "jpg" => ImageFormat::Jpeg,
        "webp" => ImageFormat::Webp,
        "tiff" => ImageFormat::Tiff,
        _ => ImageFormat::Png,
    };

    let result = PDFUtils::to_images(&input_path, &output_dir, img_format, dpi)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(result)
}

/// Convert images to PDF
#[tauri::command]
pub async fn images_to_pdf(image_paths: Vec<String>, output_path: String) -> Result<(), AppError> {
    let paths: Vec<&str> = image_paths.iter().map(|s| s.as_str()).collect();
    PDFUtils::from_images(&paths, &output_path)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

// ============================================================================
// Conversion Commands
// ============================================================================

/// Convert Markdown to PDF
#[tauri::command]
pub async fn convert_markdown_to_pdf(input: String, output: String) -> Result<(), AppError> {
    ConversionUtils::markdown_to_pdf(&input, &output)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Convert Markdown to DOCX
#[tauri::command]
pub async fn convert_markdown_to_docx(input: String, output: String) -> Result<(), AppError> {
    ConversionUtils::markdown_to_docx(&input, &output)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Convert DOCX to PDF
#[tauri::command]
pub async fn convert_docx_to_pdf(input: String, output: String) -> Result<(), AppError> {
    ConversionUtils::docx_to_pdf(&input, &output)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Convert LaTeX to PDF
#[tauri::command]
pub async fn convert_latex_to_pdf(input: String, output: String) -> Result<(), AppError> {
    ConversionUtils::latex_to_pdf(&input, &output)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Convert TXT to Markdown
#[tauri::command]
pub async fn convert_txt_to_markdown(input: String, output: String) -> Result<(), AppError> {
    ConversionUtils::txt_to_markdown(&input, &output)
        .await
        .map_err(|e| crate::error::DocumentError::ParseError(e.to_string()))?;
    Ok(())
}

/// Compile content to PDF (using LaTeX or pdflatex)
#[tauri::command]
pub async fn compile_to_pdf(content: String, output_path: String) -> Result<(), AppError> {
    use std::fs;
    use std::process::Command;

    // Create a temporary .tex file
    let temp_dir = std::env::temp_dir();
    let tex_file = temp_dir.join("intellidoc_compile.tex");
    let pdf_file = temp_dir.join("intellidoc_compile.pdf");

    // Wrap content in basic LaTeX document if not already a full document
    let full_content = if content.contains("\\documentclass") {
        content
    } else {
        format!(
            r#"\documentclass{{article}}
\usepackage{{amsmath}}
\usepackage{{amssymb}}
\usepackage{{graphicx}}
\usepackage[utf8]{{inputenc}}
\begin{{document}}
{}
\end{{document}}"#,
            content
        )
    };

    // Write the tex file
    fs::write(&tex_file, &full_content)
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to write temp file: {}", e)))?;

    // Try to compile with pdflatex
    let output = Command::new("pdflatex")
        .args([
            "-interaction=nonstopmode",
            "-output-directory",
            temp_dir.to_str().unwrap_or("/tmp"),
            tex_file.to_str().unwrap_or(""),
        ])
        .output();

    match output {
        Ok(result) => {
            if result.status.success() && pdf_file.exists() {
                // Copy to output path
                fs::copy(&pdf_file, &output_path)
                    .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to copy PDF: {}", e)))?;

                // Cleanup temp files
                let _ = fs::remove_file(&tex_file);
                let _ = fs::remove_file(&pdf_file);
                let _ = fs::remove_file(temp_dir.join("intellidoc_compile.aux"));
                let _ = fs::remove_file(temp_dir.join("intellidoc_compile.log"));

                Ok(())
            } else {
                let stderr = String::from_utf8_lossy(&result.stderr);
                let stdout = String::from_utf8_lossy(&result.stdout);
                Err(crate::error::DocumentError::ParseError(
                    format!("LaTeX compilation failed: {}\n{}", stderr, stdout)
                ).into())
            }
        }
        Err(e) => {
            Err(crate::error::DocumentError::ParseError(
                format!("pdflatex not found. Please install LaTeX (e.g., MacTeX on macOS). Error: {}", e)
            ).into())
        }
    }
}
