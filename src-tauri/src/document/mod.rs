//! Document parsing and management module

pub mod editor;
pub mod ocr;
pub mod parser;

// Re-export editor types
pub use editor::{
    // Common types
    BoundingBox, CommonEditOperation, EditorConfig, EditorError, TextFormat, TextPosition,
    TextRange, WordStats,
    // PDF types
    ImageFormat, PDFEditOperation, PDFEditor, PDFUtils, ShapeType, WatermarkPosition,
    // Text/Markdown types
    TextEditOperation, TextEditor,
    // DOCX types
    DOCXEditOperation, DOCXEditor, TableOperation,
    // LaTeX types
    LaTeXEditOperation, LaTeXEditor,
    // EPUB types
    EPUBEditOperation, EPUBEditor, MetadataField, TOCEntry,
    // Unified types
    ConversionUtils, DocumentEditor, EditOperation, EditOperationInfo,
};

use serde::{Deserialize, Serialize};

/// Supported document types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DocumentType {
    Pdf,
    Epub,
    Docx,
    Txt,
    Markdown,
    Latex,
}

impl DocumentType {
    pub fn from_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().as_str() {
            "pdf" => Some(Self::Pdf),
            "epub" => Some(Self::Epub),
            "docx" => Some(Self::Docx),
            "txt" => Some(Self::Txt),
            "md" | "markdown" => Some(Self::Markdown),
            "tex" | "latex" => Some(Self::Latex),
            _ => None,
        }
    }

    /// Check if this document type supports text editing
    pub fn supports_text_editing(&self) -> bool {
        matches!(self, Self::Txt | Self::Markdown | Self::Latex)
    }

    /// Check if this document type supports rich editing
    pub fn supports_rich_editing(&self) -> bool {
        matches!(self, Self::Pdf | Self::Docx | Self::Epub)
    }

    /// Get file extension for this type
    pub fn extension(&self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Epub => "epub",
            Self::Docx => "docx",
            Self::Txt => "txt",
            Self::Markdown => "md",
            Self::Latex => "tex",
        }
    }

    /// Get MIME type for this document type
    pub fn mime_type(&self) -> &'static str {
        match self {
            Self::Pdf => "application/pdf",
            Self::Epub => "application/epub+zip",
            Self::Docx => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            Self::Txt => "text/plain",
            Self::Markdown => "text/markdown",
            Self::Latex => "application/x-latex",
        }
    }
}

/// Document category for smart features
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Category {
    ComputerScience,
    Physics,
    Mathematics,
    Biology,
    Chemistry,
    Engineering,
    Economics,
    Medicine,
    #[default]
    Unknown,
}

/// Main document structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    /// Unique identifier (SHA-256 hash of content)
    pub id: String,
    /// Document type
    pub doc_type: DocumentType,
    /// File path
    pub path: String,
    /// Document title
    pub title: String,
    /// Authors
    pub authors: Vec<String>,
    /// Document pages
    pub pages: Vec<Page>,
    /// Metadata
    pub metadata: DocumentMetadata,
    /// Auto-detected category
    pub category: Category,
}

/// Document page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Page {
    /// Page number (1-indexed)
    pub number: u32,
    /// Plain text content
    pub text: String,
    /// Structured paragraphs
    pub paragraphs: Vec<Paragraph>,
}

/// Paragraph within a page
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paragraph {
    /// Unique paragraph ID
    pub id: String,
    /// Paragraph text
    pub text: String,
    /// Position information
    pub bounding_box: Option<editor::BoundingBox>,
}

/// Document metadata
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DocumentMetadata {
    pub page_count: u32,
    pub word_count: u32,
    pub creation_date: Option<String>,
    pub modification_date: Option<String>,
    pub subject: Option<String>,
    pub keywords: Vec<String>,
}

/// Recent document info for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentDocument {
    pub id: String,
    pub title: String,
    pub path: String,
    pub doc_type: DocumentType,
    pub category: Category,
    pub last_opened: String,
    pub page_count: u32,
}
