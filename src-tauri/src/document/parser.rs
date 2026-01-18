//! Document parsing implementation

use super::{Category, Document, DocumentMetadata, DocumentType, Page, Paragraph};
use crate::error::{AppError, DocumentError};
use sha2::{Digest, Sha256};
use std::path::Path;

/// Parse a document from a file path
pub async fn parse_document(path: &str) -> Result<Document, AppError> {
    let path_obj = Path::new(path);

    // Check if file exists
    if !path_obj.exists() {
        return Err(DocumentError::FileNotFound(path.to_string()).into());
    }

    // Determine document type from extension
    let extension = path_obj
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let doc_type = DocumentType::from_extension(extension)
        .ok_or_else(|| DocumentError::UnsupportedFormat(extension.to_string()))?;

    // Read file content
    let content = tokio::fs::read(path).await?;

    // Generate document ID from content hash
    let id = generate_document_id(&content);

    // Parse based on document type
    let (pages, metadata) = match doc_type {
        DocumentType::Pdf => parse_pdf(&content).await?,
        DocumentType::Markdown => parse_markdown(&content).await?,
        DocumentType::Txt => parse_txt(&content).await?,
        _ => {
            // Fallback to text parsing for unsupported types
            tracing::warn!("Using fallback parser for {:?}", doc_type);
            parse_txt(&content).await?
        }
    };

    // Extract title from first page or filename
    let title = extract_title(&pages, path_obj);

    // Detect category
    let category = detect_category(&pages);

    Ok(Document {
        id,
        doc_type,
        path: path.to_string(),
        title,
        authors: vec![], // TODO: Extract authors
        pages,
        metadata,
        category,
    })
}

/// Generate a unique document ID from content
fn generate_document_id(content: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    let result = hasher.finalize();
    format!("{:x}", result)
}

/// Parse PDF document
async fn parse_pdf(_content: &[u8]) -> Result<(Vec<Page>, DocumentMetadata), AppError> {
    // TODO: Implement PDF parsing with pdfium-render
    tracing::info!("PDF parsing not yet implemented, returning placeholder");
    
    Ok((
        vec![Page {
            number: 1,
            text: "PDF parsing will be implemented with pdfium-render".to_string(),
            paragraphs: vec![Paragraph {
                id: "p1".to_string(),
                text: "PDF parsing will be implemented with pdfium-render".to_string(),
                bounding_box: None,
            }],
        }],
        DocumentMetadata {
            page_count: 1,
            ..Default::default()
        },
    ))
}

/// Parse Markdown document
async fn parse_markdown(content: &[u8]) -> Result<(Vec<Page>, DocumentMetadata), AppError> {
    use pulldown_cmark::{Event, Parser, Tag, TagEnd};

    let text = String::from_utf8_lossy(content);
    let parser = Parser::new(&text);

    let mut current_paragraph = String::new();
    let mut paragraphs = Vec::new();
    let mut paragraph_count = 0;

    for event in parser {
        match event {
            Event::Text(text) => {
                current_paragraph.push_str(&text);
            }
            Event::End(TagEnd::Paragraph) | Event::End(TagEnd::Heading(_)) => {
                if !current_paragraph.is_empty() {
                    paragraph_count += 1;
                    paragraphs.push(Paragraph {
                        id: format!("p{}", paragraph_count),
                        text: std::mem::take(&mut current_paragraph),
                        bounding_box: None,
                    });
                }
            }
            Event::SoftBreak | Event::HardBreak => {
                current_paragraph.push(' ');
            }
            _ => {}
        }
    }

    // Don't forget the last paragraph
    if !current_paragraph.is_empty() {
        paragraph_count += 1;
        paragraphs.push(Paragraph {
            id: format!("p{}", paragraph_count),
            text: current_paragraph,
            bounding_box: None,
        });
    }

    let full_text: String = paragraphs.iter().map(|p| p.text.as_str()).collect::<Vec<_>>().join("\n\n");
    let word_count = full_text.split_whitespace().count() as u32;

    Ok((
        vec![Page {
            number: 1,
            text: full_text,
            paragraphs,
        }],
        DocumentMetadata {
            page_count: 1,
            word_count,
            ..Default::default()
        },
    ))
}

/// Parse plain text document
async fn parse_txt(content: &[u8]) -> Result<(Vec<Page>, DocumentMetadata), AppError> {
    let text = String::from_utf8_lossy(content).to_string();
    let word_count = text.split_whitespace().count() as u32;

    let paragraphs: Vec<Paragraph> = text
        .split("\n\n")
        .enumerate()
        .filter(|(_, p)| !p.trim().is_empty())
        .map(|(i, p)| Paragraph {
            id: format!("p{}", i + 1),
            text: p.trim().to_string(),
            bounding_box: None,
        })
        .collect();

    Ok((
        vec![Page {
            number: 1,
            text,
            paragraphs,
        }],
        DocumentMetadata {
            page_count: 1,
            word_count,
            ..Default::default()
        },
    ))
}

/// Extract title from document or filename
fn extract_title(pages: &[Page], path: &Path) -> String {
    // Try to get title from first paragraph
    if let Some(first_page) = pages.first() {
        if let Some(first_para) = first_page.paragraphs.first() {
            let first_line = first_para.text.lines().next().unwrap_or("");
            if !first_line.is_empty() && first_line.len() < 200 {
                return first_line.to_string();
            }
        }
    }

    // Fallback to filename
    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

/// Detect document category based on content
fn detect_category(pages: &[Page]) -> Category {
    let full_text: String = pages
        .iter()
        .flat_map(|p| p.paragraphs.iter())
        .map(|para| para.text.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ");

    // Simple keyword-based detection
    let cs_keywords = ["algorithm", "neural network", "machine learning", "deep learning", 
                       "transformer", "attention", "convolution", "python", "pytorch", 
                       "tensorflow", "gpu", "training", "dataset", "model architecture"];
    
    let physics_keywords = ["quantum", "particle", "energy", "momentum", "wave function",
                           "relativity", "electromagnetic", "photon", "electron"];
    
    let math_keywords = ["theorem", "proof", "lemma", "corollary", "conjecture",
                        "topology", "algebra", "calculus", "manifold"];

    let cs_score: usize = cs_keywords.iter().filter(|k| full_text.contains(*k)).count();
    let physics_score: usize = physics_keywords.iter().filter(|k| full_text.contains(*k)).count();
    let math_score: usize = math_keywords.iter().filter(|k| full_text.contains(*k)).count();

    if cs_score >= 3 {
        Category::ComputerScience
    } else if physics_score >= 3 {
        Category::Physics
    } else if math_score >= 3 {
        Category::Mathematics
    } else {
        Category::Unknown
    }
}
