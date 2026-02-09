//! OCR (Optical Character Recognition) module for scanned documents
//!
//! Uses Tesseract OCR (via command line) to extract text from images and scanned PDFs.
//! This approach avoids native library linking issues across different architectures.

use crate::error::AppError;
use std::process::Command;
use tempfile::TempDir;
use tracing::{info, warn};

/// OCR configuration
#[derive(Debug, Clone)]
pub struct OcrConfig {
    /// Language for OCR (e.g., "eng", "chi_sim", "jpn")
    pub language: String,
    /// DPI for PDF to image conversion
    pub dpi: u32,
}

impl Default for OcrConfig {
    fn default() -> Self {
        Self {
            language: "eng".to_string(),
            dpi: 300,
        }
    }
}

/// Result of OCR processing
#[derive(Debug)]
pub struct OcrResult {
    /// Extracted text from all pages
    pub text: String,
    /// Number of pages processed
    pub page_count: usize,
    /// Whether OCR was successful
    pub success: bool,
    /// Any warnings or notes
    pub notes: Vec<String>,
}

/// Check if Tesseract is available on the system
pub fn is_tesseract_available() -> bool {
    Command::new("tesseract")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Check if pdftoppm (from Poppler) is available
pub fn is_poppler_available() -> bool {
    Command::new("pdftoppm")
        .arg("-h")
        .output()
        .map(|_| true) // pdftoppm -h returns non-zero but still indicates it's installed
        .unwrap_or(false)
}

/// Perform OCR on a PDF file
pub async fn ocr_pdf(pdf_path: &str, config: &OcrConfig) -> Result<OcrResult, AppError> {
    info!("Starting OCR for PDF: {}", pdf_path);

    // Check dependencies
    if !is_poppler_available() {
        return Ok(OcrResult {
            text: String::new(),
            page_count: 0,
            success: false,
            notes: vec!["Poppler (pdftoppm) is not installed. Run: brew install poppler".to_string()],
        });
    }

    if !is_tesseract_available() {
        return Ok(OcrResult {
            text: String::new(),
            page_count: 0,
            success: false,
            notes: vec!["Tesseract OCR is not installed. Run: brew install tesseract".to_string()],
        });
    }

    // Create temp directory for images
    let temp_dir = TempDir::new()
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to create temp dir: {}", e)))?;

    let temp_path = temp_dir.path();
    let image_prefix = temp_path.join("page");

    // Convert PDF to images using pdftoppm
    info!("Converting PDF to images at {} DPI...", config.dpi);
    let pdf_convert = Command::new("pdftoppm")
        .args([
            "-png",
            "-r", &config.dpi.to_string(),
            pdf_path,
            image_prefix.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| crate::error::DocumentError::ParseError(format!("pdftoppm failed: {}", e)))?;

    if !pdf_convert.status.success() {
        let stderr = String::from_utf8_lossy(&pdf_convert.stderr);
        warn!("pdftoppm warning: {}", stderr);
    }

    // Find all generated images
    let mut image_files: Vec<_> = std::fs::read_dir(temp_path)
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to read temp dir: {}", e)))?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "png").unwrap_or(false))
        .collect();

    image_files.sort_by_key(|e| e.path());

    let page_count = image_files.len();
    if page_count == 0 {
        return Ok(OcrResult {
            text: String::new(),
            page_count: 0,
            success: false,
            notes: vec!["No pages could be extracted from PDF".to_string()],
        });
    }

    info!("Extracted {} pages, running OCR...", page_count);

    // Run OCR on each image using command-line tesseract
    let mut all_text = String::new();
    let mut notes = Vec::new();

    for (i, entry) in image_files.iter().enumerate() {
        let image_path = entry.path();
        let output_base = temp_path.join(format!("ocr_output_{}", i));

        // Run tesseract: tesseract input.png output_base -l eng
        let ocr_result = Command::new("tesseract")
            .args([
                image_path.to_str().unwrap(),
                output_base.to_str().unwrap(),
                "-l", &config.language,
            ])
            .output();

        match ocr_result {
            Ok(output) => {
                if output.status.success() {
                    // Read the output file (tesseract adds .txt extension)
                    let txt_path = format!("{}.txt", output_base.to_str().unwrap());
                    match std::fs::read_to_string(&txt_path) {
                        Ok(text) => {
                            if !all_text.is_empty() && !text.trim().is_empty() {
                                all_text.push_str("\n\n--- Page ");
                                all_text.push_str(&(i + 1).to_string());
                                all_text.push_str(" ---\n\n");
                            }
                            all_text.push_str(text.trim());
                        }
                        Err(e) => {
                            notes.push(format!("Page {}: Failed to read OCR output - {}", i + 1, e));
                        }
                    }
                } else {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    notes.push(format!("Page {}: OCR failed - {}", i + 1, stderr.trim()));
                }
            }
            Err(e) => {
                notes.push(format!("Page {}: Tesseract error - {}", i + 1, e));
            }
        }
    }

    let success = !all_text.trim().is_empty();

    info!("OCR complete: {} chars extracted from {} pages", all_text.len(), page_count);

    Ok(OcrResult {
        text: all_text,
        page_count,
        success,
        notes,
    })
}

/// Perform OCR on a single image file using command-line tesseract
pub async fn ocr_image(image_path: &str, language: &str) -> Result<String, AppError> {
    let temp_dir = TempDir::new()
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to create temp dir: {}", e)))?;

    let output_base = temp_dir.path().join("ocr_output");

    let output = Command::new("tesseract")
        .args([
            image_path,
            output_base.to_str().unwrap(),
            "-l", language,
        ])
        .output()
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Tesseract failed: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(crate::error::DocumentError::ParseError(format!("OCR failed: {}", stderr)).into());
    }

    let txt_path = format!("{}.txt", output_base.to_str().unwrap());
    let text = std::fs::read_to_string(&txt_path)
        .map_err(|e| crate::error::DocumentError::ParseError(format!("Failed to read OCR output: {}", e)))?;

    Ok(text)
}

/// Get available OCR languages
pub fn get_available_languages() -> Vec<String> {
    Command::new("tesseract")
        .args(["--list-langs"])
        .output()
        .ok()
        .map(|o| {
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .skip(1) // Skip header line
                .map(|s| s.to_string())
                .collect()
        })
        .unwrap_or_else(|| vec!["eng".to_string()])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tesseract_available() {
        let available = is_tesseract_available();
        println!("Tesseract available: {}", available);
    }

    #[test]
    fn test_poppler_available() {
        let available = is_poppler_available();
        println!("Poppler available: {}", available);
    }

    #[test]
    fn test_available_languages() {
        let langs = get_available_languages();
        println!("Available OCR languages: {:?}", langs);
        assert!(!langs.is_empty());
    }
}
