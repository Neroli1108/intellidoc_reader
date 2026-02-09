//! Document parsing implementation

use super::{Category, Document, DocumentMetadata, DocumentType, Page, Paragraph};
use crate::error::{AppError, DocumentError};
use sha2::{Digest, Sha256};
use std::path::Path;

/// Parse a document from a file path
pub async fn parse_document(path: &str) -> Result<Document, AppError> {
    let path_obj = Path::new(path);

    if !path_obj.exists() {
        return Err(DocumentError::FileNotFound(path.to_string()).into());
    }

    let extension = path_obj
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");

    let doc_type = DocumentType::from_extension(extension)
        .ok_or_else(|| DocumentError::UnsupportedFormat(extension.to_string()))?;

    let content = tokio::fs::read(path).await?;
    let id = generate_document_id(&content);

    let (pages, metadata) = match doc_type {
        DocumentType::Pdf => parse_pdf(&content, path).await?,
        DocumentType::Markdown => parse_markdown(&content).await?,
        DocumentType::Txt => parse_txt(&content).await?,
        DocumentType::Latex => parse_txt(&content).await?, // LaTeX as text
        _ => {
            tracing::warn!("Using fallback parser for {:?}", doc_type);
            parse_txt(&content).await?
        }
    };

    let title = extract_title(&pages, path_obj);
    let category = detect_category(&pages);

    Ok(Document {
        id,
        doc_type,
        path: path.to_string(),
        title,
        authors: vec![],
        pages,
        metadata,
        category,
    })
}

fn generate_document_id(content: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content);
    let result = hasher.finalize();
    format!("{:x}", result)
}

/// Parse PDF document using pdf-extract for text extraction, with OCR fallback
async fn parse_pdf(content: &[u8], pdf_path: &str) -> Result<(Vec<Page>, DocumentMetadata), AppError> {
    tracing::info!("Parsing PDF document ({} bytes)...", content.len());

    // Try to extract text from PDF
    let text = match pdf_extract::extract_text_from_mem(content) {
        Ok(t) => t,
        Err(e) => {
            tracing::warn!("PDF text extraction failed: {}", e);
            String::new()
        }
    };

    // Check if we got any meaningful text (at least 10 chars of actual content)
    let clean_text = text.trim();
    let has_content = clean_text.len() > 10
        && clean_text.chars().filter(|c| c.is_alphabetic()).count() > 5;

    if !has_content {
        tracing::info!("PDF has no extractable text, attempting OCR...");

        // Try OCR as fallback
        let ocr_config = super::ocr::OcrConfig::default();
        match super::ocr::ocr_pdf(pdf_path, &ocr_config).await {
            Ok(ocr_result) if ocr_result.success => {
                tracing::info!("OCR successful: {} chars from {} pages",
                    ocr_result.text.len(), ocr_result.page_count);

                // Parse OCR text into pages
                let ocr_text = ocr_result.text;
                let word_count = ocr_text.split_whitespace().count() as u32;

                // Split by page markers or treat as single page
                let page_texts: Vec<&str> = if ocr_text.contains("--- Page") {
                    ocr_text.split("--- Page").collect()
                } else {
                    vec![&ocr_text]
                };

                let pages: Vec<Page> = page_texts
                    .iter()
                    .enumerate()
                    .filter(|(_, p)| !p.trim().is_empty())
                    .map(|(i, page_text)| {
                        let paragraphs: Vec<Paragraph> = page_text
                            .split("\n\n")
                            .enumerate()
                            .filter(|(_, p)| !p.trim().is_empty())
                            .map(|(j, p)| Paragraph {
                                id: format!("p{}-{}", i + 1, j + 1),
                                text: p.trim().to_string(),
                                bounding_box: None,
                            })
                            .collect();

                        Page {
                            number: (i + 1) as u32,
                            text: page_text.trim().to_string(),
                            paragraphs,
                        }
                    })
                    .collect();

                let page_count = pages.len().max(ocr_result.page_count) as u32;

                return Ok((
                    pages,
                    DocumentMetadata {
                        page_count,
                        word_count,
                        ..Default::default()
                    },
                ));
            }
            Ok(ocr_result) => {
                // OCR failed or returned no text
                let notes = ocr_result.notes.join("\n• ");
                tracing::warn!("OCR unsuccessful: {}", notes);

                return Ok((
                    vec![Page {
                        number: 1,
                        text: format!(
                            "📄 This PDF contains scanned images.\n\n\
                             OCR (text recognition) was attempted but {}\n\n\
                             Notes:\n• {}\n\n\
                             To enable OCR, ensure Tesseract and Poppler are installed:\n\
                             brew install tesseract poppler",
                            if notes.is_empty() { "returned no text." } else { "encountered issues:" },
                            if notes.is_empty() { "No text could be recognized" } else { &notes }
                        ),
                        paragraphs: vec![Paragraph {
                            id: "p1".to_string(),
                            text: "Scanned PDF - OCR unsuccessful".to_string(),
                            bounding_box: None,
                        }],
                    }],
                    DocumentMetadata {
                        page_count: 1,
                        ..Default::default()
                    },
                ));
            }
            Err(e) => {
                tracing::error!("OCR error: {}", e);
                return Ok((
                    vec![Page {
                        number: 1,
                        text: format!(
                            "📄 This PDF cannot display text content.\n\n\
                             Text extraction failed and OCR encountered an error:\n{}\n\n\
                             This may be because:\n\
                             • The PDF contains scanned images\n\
                             • Tesseract OCR is not installed (brew install tesseract)\n\
                             • Poppler is not installed (brew install poppler)\n\n\
                             Try installing the dependencies and reopening the document.",
                            e
                        ),
                        paragraphs: vec![Paragraph {
                            id: "p1".to_string(),
                            text: "PDF content could not be extracted".to_string(),
                            bounding_box: None,
                        }],
                    }],
                    DocumentMetadata {
                        page_count: 1,
                        ..Default::default()
                    },
                ));
            }
        }
    }

    // Split text into pages by form feed characters or large gaps
    let raw_pages: Vec<&str> = text.split('\u{0C}').collect();
    let word_count = text.split_whitespace().count() as u32;

    let pages: Vec<Page> = raw_pages
        .iter()
        .enumerate()
        .filter(|(_, p)| !p.trim().is_empty())
        .map(|(i, page_text)| {
            let paragraphs: Vec<Paragraph> = page_text
                .split("\n\n")
                .enumerate()
                .filter(|(_, p)| !p.trim().is_empty())
                .map(|(j, p)| Paragraph {
                    id: format!("p{}-{}", i + 1, j + 1),
                    text: p.trim().to_string(),
                    bounding_box: None,
                })
                .collect();

            Page {
                number: (i + 1) as u32,
                text: page_text.trim().to_string(),
                paragraphs,
            }
        })
        .collect();

    let page_count = pages.len() as u32;

    Ok((
        if pages.is_empty() {
            vec![Page {
                number: 1,
                text: text.clone(),
                paragraphs: vec![Paragraph {
                    id: "p1".to_string(),
                    text,
                    bounding_box: None,
                }],
            }]
        } else {
            pages
        },
        DocumentMetadata {
            page_count: if page_count == 0 { 1 } else { page_count },
            word_count,
            ..Default::default()
        },
    ))
}

/// Parse Markdown document
async fn parse_markdown(content: &[u8]) -> Result<(Vec<Page>, DocumentMetadata), AppError> {
    use pulldown_cmark::{Event, Parser, TagEnd};

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
            Event::Code(code) => {
                current_paragraph.push('`');
                current_paragraph.push_str(&code);
                current_paragraph.push('`');
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

    if !current_paragraph.is_empty() {
        paragraph_count += 1;
        paragraphs.push(Paragraph {
            id: format!("p{}", paragraph_count),
            text: current_paragraph,
            bounding_box: None,
        });
    }

    let full_text: String = paragraphs
        .iter()
        .map(|p| p.text.as_str())
        .collect::<Vec<_>>()
        .join("\n\n");
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

fn extract_title(pages: &[Page], path: &Path) -> String {
    if let Some(first_page) = pages.first() {
        if let Some(first_para) = first_page.paragraphs.first() {
            let first_line = first_para.text.lines().next().unwrap_or("");
            if !first_line.is_empty() && first_line.len() < 200 {
                return first_line.to_string();
            }
        }
    }

    path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string()
}

fn detect_category(pages: &[Page]) -> Category {
    let full_text: String = pages
        .iter()
        .flat_map(|p| p.paragraphs.iter())
        .map(|para| para.text.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ");

    let cs_keywords = [
        "algorithm",
        "neural network",
        "machine learning",
        "deep learning",
        "transformer",
        "attention mechanism",
        "convolution",
        "python",
        "pytorch",
        "tensorflow",
        "gpu",
        "training",
        "dataset",
        "model architecture",
        "backpropagation",
        "gradient descent",
        "softmax",
        "encoder",
        "decoder",
        "implementation",
        "pseudocode",
        "source code",
        "computational",
        "complexity",
        "runtime",
        "optimization",
        "reinforcement learning",
        "classification",
        "regression",
        "embedding",
        "batch size",
        "epoch",
        "loss function",
        "inference",
        "benchmark",
        "baseline",
        "state-of-the-art",
        "ablation",
        "fine-tuning",
        "pre-training",
        "data augmentation",
        "hyperparameter",
        "overfitting",
        "generalization",
        "feature extraction",
        "distributed computing",
        "parallel processing",
        "api",
        "framework",
        "open source",
        "github",
        "arxiv",
    ];

    let physics_keywords = [
        "quantum",
        "particle",
        "energy",
        "momentum",
        "wave function",
        "relativity",
        "electromagnetic",
        "photon",
        "electron",
        "hamiltonian",
    ];

    let math_keywords = [
        "theorem",
        "proof",
        "lemma",
        "corollary",
        "conjecture",
        "topology",
        "algebra",
        "calculus",
        "manifold",
        "isomorphism",
    ];

    let bio_keywords = [
        "protein",
        "gene",
        "cell",
        "dna",
        "rna",
        "mutation",
        "genome",
        "enzyme",
        "organism",
    ];

    let eng_keywords = [
        "design",
        "simulation",
        "finite element",
        "control system",
        "signal processing",
        "circuit",
        "sensor",
        "actuator",
        "robotics",
        "embedded",
        "microcontroller",
        "mechanical",
        "structural",
        "thermal",
        "optimization",
        "cad",
        "manufacturing",
    ];

    let cs_score: usize = cs_keywords.iter().filter(|k| full_text.contains(*k)).count();
    let physics_score: usize = physics_keywords
        .iter()
        .filter(|k| full_text.contains(*k))
        .count();
    let math_score: usize = math_keywords
        .iter()
        .filter(|k| full_text.contains(*k))
        .count();
    let bio_score: usize = bio_keywords
        .iter()
        .filter(|k| full_text.contains(*k))
        .count();
    let eng_score: usize = eng_keywords
        .iter()
        .filter(|k| full_text.contains(*k))
        .count();

    let max_score = cs_score
        .max(physics_score)
        .max(math_score)
        .max(bio_score)
        .max(eng_score);

    if max_score < 3 {
        return Category::Unknown;
    }

    if cs_score == max_score {
        Category::ComputerScience
    } else if physics_score == max_score {
        Category::Physics
    } else if math_score == max_score {
        Category::Mathematics
    } else if eng_score == max_score {
        Category::Engineering
    } else if bio_score == max_score {
        Category::Biology
    } else {
        Category::Unknown
    }
}
