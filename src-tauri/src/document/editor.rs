//! Document Editing Module
//!
//! Provides functionality to edit various document types:
//! - PDF: Add/remove text, pages, annotations, images, signatures, merge/split
//! - Text/Markdown: Full text editing, formatting, find/replace
//! - DOCX: Rich text editing, styles, tables
//! - LaTeX: Source editing, command completion
//! - EPUB: Content and metadata editing

use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::Path;

// ============================================================================
// Common Types
// ============================================================================

/// Text position in a document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextPosition {
    /// Line number (0-indexed)
    pub line: u32,
    /// Column/character offset (0-indexed)
    pub column: u32,
}

/// Text range in a document
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextRange {
    pub start: TextPosition,
    pub end: TextPosition,
}

/// Text formatting options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextFormat {
    pub bold: Option<bool>,
    pub italic: Option<bool>,
    pub underline: Option<bool>,
    pub strikethrough: Option<bool>,
    pub font_family: Option<String>,
    pub font_size: Option<f32>,
    pub color: Option<String>,
    pub background_color: Option<String>,
}

/// Word/character statistics
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct WordStats {
    pub characters: u32,
    pub characters_no_spaces: u32,
    pub words: u32,
    pub lines: u32,
    pub paragraphs: u32,
}

// ============================================================================
// Common Edit Operations (shared across formats)
// ============================================================================

/// Common edit operations for all document types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CommonEditOperation {
    /// Insert text at position
    InsertText { position: TextPosition, text: String },
    /// Delete text in range
    DeleteText { range: TextRange },
    /// Replace text in range
    ReplaceText { range: TextRange, new_text: String },
    /// Apply formatting to range
    SetFormat { range: TextRange, format: TextFormat },
    /// Insert image at position
    InsertImage { position: TextPosition, image_path: String },
    /// Find and replace
    FindReplace {
        pattern: String,
        replacement: String,
        use_regex: bool,
        case_sensitive: bool,
        whole_word: bool,
    },
}

// ============================================================================
// PDF Edit Operations
// ============================================================================

/// Shape types for drawing
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ShapeType {
    Rectangle,
    Ellipse,
    Circle,
    RoundedRect,
}

/// Bounding box for positioning
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

/// Watermark position
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WatermarkPosition {
    Center,
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Diagonal,
}

/// PDF-specific edit operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PDFEditOperation {
    /// Add text to a page
    AddText {
        page: u32,
        x: f32,
        y: f32,
        text: String,
        font_size: f32,
        font_family: String,
        color: String,
    },
    /// Add an image to a page
    AddImage {
        page: u32,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        image_path: String,
    },
    /// Add a highlight annotation
    AddHighlight {
        page: u32,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
        color: String,
    },
    /// Add a text annotation (sticky note)
    AddAnnotation {
        page: u32,
        x: f32,
        y: f32,
        content: String,
        author: Option<String>,
    },
    /// Add a shape
    AddShape {
        page: u32,
        shape_type: ShapeType,
        bounds: BoundingBox,
        fill_color: Option<String>,
        stroke_color: String,
        stroke_width: f32,
    },
    /// Add a line/arrow
    AddLine {
        page: u32,
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        color: String,
        stroke_width: f32,
        arrow_head: bool,
    },
    /// Delete a page
    DeletePage { page: u32 },
    /// Insert a blank page
    InsertPage {
        after_page: u32,
        width: f32,
        height: f32,
    },
    /// Rotate a page
    RotatePage {
        page: u32,
        degrees: i32, // 90, 180, 270
    },
    /// Add a watermark
    AddWatermark {
        text: String,
        font_size: f32,
        color: String,
        opacity: f32,
        position: WatermarkPosition,
        pages: Option<Vec<u32>>, // None = all pages
    },
    /// Redact content (blackout)
    Redact {
        page: u32,
        x: f32,
        y: f32,
        width: f32,
        height: f32,
    },
    /// Add signature
    AddSignature {
        page: u32,
        signature_image: String,
        bounds: BoundingBox,
    },
    /// Fill form field
    FillFormField { field_name: String, value: String },
    /// Add link
    AddLink {
        page: u32,
        url: String,
        bounds: BoundingBox,
    },
    /// Add bookmark
    AddBookmark {
        title: String,
        page: u32,
        parent: Option<String>,
    },
}

// ============================================================================
// Text/Markdown Edit Operations
// ============================================================================

/// Text/Markdown-specific edit operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TextEditOperation {
    /// Common operation wrapper
    Common(CommonEditOperation),
    /// Insert heading
    InsertHeading {
        position: TextPosition,
        level: u8, // 1-6
        text: String,
    },
    /// Insert code block
    InsertCodeBlock {
        position: TextPosition,
        language: String,
        code: String,
    },
    /// Insert link
    InsertLink {
        position: TextPosition,
        text: String,
        url: String,
    },
    /// Insert list
    InsertList {
        position: TextPosition,
        items: Vec<String>,
        ordered: bool,
    },
    /// Insert table
    InsertTable {
        position: TextPosition,
        headers: Vec<String>,
        rows: Vec<Vec<String>>,
    },
    /// Toggle bold on range
    ToggleBold { range: TextRange },
    /// Toggle italic on range
    ToggleItalic { range: TextRange },
    /// Toggle strikethrough on range
    ToggleStrikethrough { range: TextRange },
    /// Insert horizontal rule
    InsertHorizontalRule { position: TextPosition },
    /// Insert blockquote
    InsertBlockquote {
        position: TextPosition,
        text: String,
    },
}

// ============================================================================
// DOCX Edit Operations
// ============================================================================

/// Table operation for DOCX
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum TableOperation {
    InsertRow { after_row: u32 },
    DeleteRow { row: u32 },
    InsertColumn { after_col: u32 },
    DeleteColumn { col: u32 },
    SetCellContent { row: u32, col: u32, content: String },
    MergeCells { start_row: u32, start_col: u32, end_row: u32, end_col: u32 },
}

/// DOCX-specific edit operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DOCXEditOperation {
    /// Common operation wrapper
    Common(CommonEditOperation),
    /// Apply style to range
    ApplyStyle { range: TextRange, style_name: String },
    /// Insert table
    InsertTable {
        position: TextPosition,
        rows: u32,
        cols: u32,
    },
    /// Modify existing table
    ModifyTable {
        table_index: u32,
        operation: TableOperation,
    },
    /// Insert page break
    InsertPageBreak { position: TextPosition },
    /// Set page margins
    SetPageMargins {
        top: f32,
        bottom: f32,
        left: f32,
        right: f32,
    },
    /// Accept tracked change
    AcceptChange { change_id: String },
    /// Reject tracked change
    RejectChange { change_id: String },
    /// Insert header/footer
    SetHeaderFooter {
        is_header: bool,
        content: String,
    },
}

// ============================================================================
// LaTeX Edit Operations
// ============================================================================

/// LaTeX-specific edit operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum LaTeXEditOperation {
    /// Common operation wrapper
    Common(CommonEditOperation),
    /// Insert environment
    InsertEnvironment {
        position: TextPosition,
        env_name: String,
        content: String,
    },
    /// Insert command
    InsertCommand {
        position: TextPosition,
        command: String,
        args: Vec<String>,
    },
    /// Wrap selection in math mode
    WrapInMath {
        range: TextRange,
        display_mode: bool, // true = \[ \], false = $ $
    },
    /// Insert citation
    InsertCitation {
        position: TextPosition,
        cite_key: String,
        cite_type: String, // cite, citep, citet, etc.
    },
    /// Insert reference
    InsertReference {
        position: TextPosition,
        label: String,
        ref_type: String, // ref, eqref, pageref, etc.
    },
    /// Insert figure environment
    InsertFigure {
        position: TextPosition,
        image_path: String,
        caption: String,
        label: String,
    },
}

// ============================================================================
// EPUB Edit Operations
// ============================================================================

/// Metadata field for EPUB
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MetadataField {
    Title,
    Author,
    Publisher,
    Language,
    Description,
    Subject,
    Date,
    Rights,
    Identifier,
}

/// Table of contents entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TOCEntry {
    pub title: String,
    pub href: String,
    pub children: Vec<TOCEntry>,
}

/// EPUB-specific edit operations
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum EPUBEditOperation {
    /// Common operation wrapper
    Common(CommonEditOperation),
    /// Modify metadata
    ModifyMetadata { field: MetadataField, value: String },
    /// Update table of contents
    UpdateTOC { entries: Vec<TOCEntry> },
    /// Modify CSS stylesheet
    ModifyCSS {
        stylesheet_id: String,
        css: String,
    },
    /// Reorder chapters
    ReorderChapters { new_order: Vec<String> },
    /// Set cover image
    SetCoverImage { image_path: String },
    /// Add chapter
    AddChapter {
        title: String,
        content: String,
        after_chapter: Option<String>,
    },
    /// Delete chapter
    DeleteChapter { chapter_id: String },
}

// ============================================================================
// Unified Edit Operation Enum
// ============================================================================

/// Unified edit operation for all document types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "doc_type", rename_all = "lowercase")]
pub enum EditOperation {
    Pdf(PDFEditOperation),
    Text(TextEditOperation),
    Docx(DOCXEditOperation),
    Latex(LaTeXEditOperation),
    Epub(EPUBEditOperation),
}

// ============================================================================
// Editor Configuration
// ============================================================================

/// Editor configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfig {
    /// Default font for text
    pub default_font: String,
    /// Default font size
    pub default_font_size: f32,
    /// Default text color
    pub default_text_color: String,
    /// Default highlight color
    pub default_highlight_color: String,
    /// Compression quality for images (0-100)
    pub image_quality: u8,
    /// Whether to flatten annotations on save (PDF)
    pub flatten_annotations: bool,
    /// Auto-save interval in seconds (0 = disabled)
    pub auto_save_interval: u32,
    /// Create backup before save
    pub create_backup: bool,
    /// Tab size for text editors
    pub tab_size: u8,
    /// Use spaces instead of tabs
    pub use_spaces: bool,
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            default_font: "Helvetica".to_string(),
            default_font_size: 12.0,
            default_text_color: "#000000".to_string(),
            default_highlight_color: "#FFFF00".to_string(),
            image_quality: 85,
            flatten_annotations: false,
            auto_save_interval: 0,
            create_backup: true,
            tab_size: 4,
            use_spaces: true,
        }
    }
}

// ============================================================================
// Document Editor Trait
// ============================================================================

/// Editor errors
#[derive(Debug, thiserror::Error)]
pub enum EditorError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid document: {0}")]
    InvalidDocument(String),

    #[error("Page out of range: {0}")]
    PageOutOfRange(u32),

    #[error("Unsupported operation: {0}")]
    UnsupportedOperation(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Encoding error: {0}")]
    EncodingError(String),

    #[error("Document is read-only")]
    ReadOnly,

    #[error("Parse error: {0}")]
    ParseError(String),
}

/// Unified document editor trait
#[async_trait]
pub trait DocumentEditor: Send + Sync {
    /// Get the document type
    fn document_type(&self) -> crate::document::DocumentType;

    /// Check if document can be edited
    fn can_edit(&self) -> bool;

    /// Undo last operation
    fn undo(&mut self) -> Option<()>;

    /// Redo previously undone operation
    fn redo(&mut self) -> Option<()>;

    /// Check if there are unsaved changes
    fn has_unsaved_changes(&self) -> bool;

    /// Get number of pending operations
    fn operation_count(&self) -> usize;

    /// Clear all pending operations
    fn clear_operations(&mut self);

    /// Save changes to original file
    async fn save(&mut self) -> Result<(), EditorError>;

    /// Save changes to a new file
    async fn save_as(&self, path: &str) -> Result<(), EditorError>;
}

// ============================================================================
// PDF Editor Implementation
// ============================================================================

/// PDF Editor state
#[derive(Debug)]
pub struct PDFEditor {
    /// Path to the source PDF
    source_path: String,
    /// Pending edit operations
    operations: Vec<PDFEditOperation>,
    /// Undo stack for redo
    undo_stack: Vec<PDFEditOperation>,
    /// Editor configuration
    config: EditorConfig,
    /// Whether document has unsaved changes
    has_changes: bool,
}

impl PDFEditor {
    /// Create a new editor for a PDF file
    pub fn new(path: &str) -> Result<Self, EditorError> {
        if !Path::new(path).exists() {
            return Err(EditorError::FileNotFound(path.to_string()));
        }

        Ok(Self {
            source_path: path.to_string(),
            operations: Vec::new(),
            undo_stack: Vec::new(),
            config: EditorConfig::default(),
            has_changes: false,
        })
    }

    /// Add an edit operation
    pub fn add_operation(&mut self, operation: PDFEditOperation) {
        self.operations.push(operation);
        self.undo_stack.clear(); // Clear redo stack on new operation
        self.has_changes = true;
    }

    /// Get pending operations
    pub fn get_operations(&self) -> &[PDFEditOperation] {
        &self.operations
    }

    /// Set editor configuration
    pub fn set_config(&mut self, config: EditorConfig) {
        self.config = config;
    }

    /// Get source path
    pub fn source_path(&self) -> &str {
        &self.source_path
    }
}

#[async_trait]
impl DocumentEditor for PDFEditor {
    fn document_type(&self) -> crate::document::DocumentType {
        crate::document::DocumentType::Pdf
    }

    fn can_edit(&self) -> bool {
        true
    }

    fn undo(&mut self) -> Option<()> {
        if let Some(op) = self.operations.pop() {
            self.undo_stack.push(op);
            if self.operations.is_empty() {
                self.has_changes = false;
            }
            Some(())
        } else {
            None
        }
    }

    fn redo(&mut self) -> Option<()> {
        if let Some(op) = self.undo_stack.pop() {
            self.operations.push(op);
            self.has_changes = true;
            Some(())
        } else {
            None
        }
    }

    fn has_unsaved_changes(&self) -> bool {
        self.has_changes
    }

    fn operation_count(&self) -> usize {
        self.operations.len()
    }

    fn clear_operations(&mut self) {
        self.operations.clear();
        self.undo_stack.clear();
        self.has_changes = false;
    }

    async fn save(&mut self) -> Result<(), EditorError> {
        if self.config.create_backup {
            let backup_path = format!("{}.backup", self.source_path);
            tokio::fs::copy(&self.source_path, &backup_path)
                .await
                .map_err(|e| EditorError::IoError(e.to_string()))?;
        }

        self.save_as(&self.source_path.clone()).await?;
        self.has_changes = false;
        Ok(())
    }

    async fn save_as(&self, output_path: &str) -> Result<(), EditorError> {
        // TODO: Implement actual PDF manipulation with lopdf/pdfium
        tracing::info!(
            "Saving PDF with {} operations to {}",
            self.operations.len(),
            output_path
        );
        Ok(())
    }
}

// ============================================================================
// Text/Markdown Editor Implementation
// ============================================================================

/// Text/Markdown Editor state
#[derive(Debug)]
pub struct TextEditor {
    /// Path to the source file
    source_path: String,
    /// Current content
    content: String,
    /// Original content (for change detection)
    original_content: String,
    /// Pending edit operations
    operations: Vec<TextEditOperation>,
    /// Undo stack
    undo_stack: Vec<(String, TextEditOperation)>, // (previous_content, operation)
    /// Whether this is a markdown file
    is_markdown: bool,
    /// Editor configuration
    config: EditorConfig,
}

impl TextEditor {
    /// Create a new text editor
    pub fn new(path: &str) -> Result<Self, EditorError> {
        let content = if Path::new(path).exists() {
            std::fs::read_to_string(path).map_err(|e| EditorError::IoError(e.to_string()))?
        } else {
            String::new()
        };

        let is_markdown = path.ends_with(".md") || path.ends_with(".markdown");

        Ok(Self {
            source_path: path.to_string(),
            original_content: content.clone(),
            content,
            operations: Vec::new(),
            undo_stack: Vec::new(),
            is_markdown,
            config: EditorConfig::default(),
        })
    }

    /// Get current content
    pub fn get_content(&self) -> &str {
        &self.content
    }

    /// Set content directly
    pub fn set_content(&mut self, content: String) {
        self.content = content;
    }

    /// Check if file is markdown
    pub fn is_markdown(&self) -> bool {
        self.is_markdown
    }

    /// Add an edit operation
    pub fn add_operation(&mut self, operation: TextEditOperation) {
        let previous_content = self.content.clone();

        // Apply the operation to content
        self.apply_operation(&operation);

        self.undo_stack.clear();
        self.operations.push(operation);
    }

    /// Apply an operation to the content
    fn apply_operation(&mut self, operation: &TextEditOperation) {
        match operation {
            TextEditOperation::Common(CommonEditOperation::InsertText { position, text }) => {
                let offset = self.position_to_offset(position);
                self.content.insert_str(offset, text);
            }
            TextEditOperation::Common(CommonEditOperation::DeleteText { range }) => {
                let start = self.position_to_offset(&range.start);
                let end = self.position_to_offset(&range.end);
                self.content.replace_range(start..end, "");
            }
            TextEditOperation::Common(CommonEditOperation::ReplaceText { range, new_text }) => {
                let start = self.position_to_offset(&range.start);
                let end = self.position_to_offset(&range.end);
                self.content.replace_range(start..end, new_text);
            }
            TextEditOperation::InsertHeading {
                position,
                level,
                text,
            } => {
                let offset = self.position_to_offset(position);
                let prefix = "#".repeat(*level as usize);
                let heading = format!("{} {}\n", prefix, text);
                self.content.insert_str(offset, &heading);
            }
            TextEditOperation::InsertCodeBlock {
                position,
                language,
                code,
            } => {
                let offset = self.position_to_offset(position);
                let block = format!("```{}\n{}\n```\n", language, code);
                self.content.insert_str(offset, &block);
            }
            TextEditOperation::InsertLink {
                position,
                text,
                url,
            } => {
                let offset = self.position_to_offset(position);
                let link = format!("[{}]({})", text, url);
                self.content.insert_str(offset, &link);
            }
            TextEditOperation::ToggleBold { range } => {
                let start = self.position_to_offset(&range.start);
                let end = self.position_to_offset(&range.end);
                let selected = &self.content[start..end];
                let formatted = format!("**{}**", selected);
                self.content.replace_range(start..end, &formatted);
            }
            TextEditOperation::ToggleItalic { range } => {
                let start = self.position_to_offset(&range.start);
                let end = self.position_to_offset(&range.end);
                let selected = &self.content[start..end];
                let formatted = format!("*{}*", selected);
                self.content.replace_range(start..end, &formatted);
            }
            // Handle other operations...
            _ => {}
        }
    }

    /// Convert position to byte offset
    fn position_to_offset(&self, position: &TextPosition) -> usize {
        let mut offset = 0;
        for (i, line) in self.content.lines().enumerate() {
            if i == position.line as usize {
                return offset + (position.column as usize).min(line.len());
            }
            offset += line.len() + 1; // +1 for newline
        }
        self.content.len()
    }

    /// Get word statistics
    pub fn get_word_stats(&self) -> WordStats {
        let characters = self.content.chars().count() as u32;
        let characters_no_spaces = self.content.chars().filter(|c| !c.is_whitespace()).count() as u32;
        let words = self.content.split_whitespace().count() as u32;
        let lines = self.content.lines().count() as u32;
        let paragraphs = self
            .content
            .split("\n\n")
            .filter(|p| !p.trim().is_empty())
            .count() as u32;

        WordStats {
            characters,
            characters_no_spaces,
            words,
            lines,
            paragraphs,
        }
    }

    /// Render markdown preview (returns HTML)
    pub fn render_markdown_preview(&self) -> String {
        if !self.is_markdown {
            return format!("<pre>{}</pre>", self.content);
        }

        // Basic markdown to HTML conversion
        // TODO: Use pulldown-cmark for proper rendering
        let mut html = self.content.clone();

        // Headers
        for i in (1..=6).rev() {
            let pattern = format!("\n{} ", "#".repeat(i));
            let replacement = format!("\n<h{}> ", i);
            html = html.replace(&pattern, &replacement);
        }

        // Bold and italic
        html = html.replace("**", "<strong>").replace("*", "<em>");

        format!("<div class=\"markdown-preview\">{}</div>", html)
    }
}

#[async_trait]
impl DocumentEditor for TextEditor {
    fn document_type(&self) -> crate::document::DocumentType {
        if self.is_markdown {
            crate::document::DocumentType::Markdown
        } else {
            crate::document::DocumentType::Txt
        }
    }

    fn can_edit(&self) -> bool {
        true
    }

    fn undo(&mut self) -> Option<()> {
        // Simple undo - would need proper implementation with stored states
        if !self.operations.is_empty() {
            self.operations.pop();
            Some(())
        } else {
            None
        }
    }

    fn redo(&mut self) -> Option<()> {
        // Would need proper redo implementation
        None
    }

    fn has_unsaved_changes(&self) -> bool {
        self.content != self.original_content
    }

    fn operation_count(&self) -> usize {
        self.operations.len()
    }

    fn clear_operations(&mut self) {
        self.operations.clear();
        self.undo_stack.clear();
    }

    async fn save(&mut self) -> Result<(), EditorError> {
        if self.config.create_backup && Path::new(&self.source_path).exists() {
            let backup_path = format!("{}.backup", self.source_path);
            tokio::fs::copy(&self.source_path, &backup_path)
                .await
                .map_err(|e| EditorError::IoError(e.to_string()))?;
        }

        self.save_as(&self.source_path.clone()).await?;
        self.original_content = self.content.clone();
        Ok(())
    }

    async fn save_as(&self, output_path: &str) -> Result<(), EditorError> {
        tokio::fs::write(output_path, &self.content)
            .await
            .map_err(|e| EditorError::IoError(e.to_string()))?;
        tracing::info!("Saved text file to {}", output_path);
        Ok(())
    }
}

// ============================================================================
// DOCX Editor Implementation
// ============================================================================

/// DOCX Editor state
#[derive(Debug)]
pub struct DOCXEditor {
    /// Path to the source file
    source_path: String,
    /// Pending edit operations
    operations: Vec<DOCXEditOperation>,
    /// Undo stack
    undo_stack: Vec<DOCXEditOperation>,
    /// Editor configuration
    config: EditorConfig,
    /// Whether document has unsaved changes
    has_changes: bool,
}

impl DOCXEditor {
    /// Create a new DOCX editor
    pub fn new(path: &str) -> Result<Self, EditorError> {
        if !Path::new(path).exists() {
            return Err(EditorError::FileNotFound(path.to_string()));
        }

        Ok(Self {
            source_path: path.to_string(),
            operations: Vec::new(),
            undo_stack: Vec::new(),
            config: EditorConfig::default(),
            has_changes: false,
        })
    }

    /// Add an edit operation
    pub fn add_operation(&mut self, operation: DOCXEditOperation) {
        self.operations.push(operation);
        self.undo_stack.clear();
        self.has_changes = true;
    }

    /// Get pending operations
    pub fn get_operations(&self) -> &[DOCXEditOperation] {
        &self.operations
    }
}

#[async_trait]
impl DocumentEditor for DOCXEditor {
    fn document_type(&self) -> crate::document::DocumentType {
        crate::document::DocumentType::Docx
    }

    fn can_edit(&self) -> bool {
        true
    }

    fn undo(&mut self) -> Option<()> {
        if let Some(op) = self.operations.pop() {
            self.undo_stack.push(op);
            if self.operations.is_empty() {
                self.has_changes = false;
            }
            Some(())
        } else {
            None
        }
    }

    fn redo(&mut self) -> Option<()> {
        if let Some(op) = self.undo_stack.pop() {
            self.operations.push(op);
            self.has_changes = true;
            Some(())
        } else {
            None
        }
    }

    fn has_unsaved_changes(&self) -> bool {
        self.has_changes
    }

    fn operation_count(&self) -> usize {
        self.operations.len()
    }

    fn clear_operations(&mut self) {
        self.operations.clear();
        self.undo_stack.clear();
        self.has_changes = false;
    }

    async fn save(&mut self) -> Result<(), EditorError> {
        // TODO: Implement with docx-rs
        self.save_as(&self.source_path.clone()).await?;
        self.has_changes = false;
        Ok(())
    }

    async fn save_as(&self, output_path: &str) -> Result<(), EditorError> {
        // TODO: Implement actual DOCX manipulation
        tracing::info!(
            "Saving DOCX with {} operations to {}",
            self.operations.len(),
            output_path
        );
        Ok(())
    }
}

// ============================================================================
// LaTeX Editor Implementation
// ============================================================================

/// LaTeX Editor state
#[derive(Debug)]
pub struct LaTeXEditor {
    /// Path to the source file
    source_path: String,
    /// Current content
    content: String,
    /// Original content
    original_content: String,
    /// Pending edit operations
    operations: Vec<LaTeXEditOperation>,
    /// Undo stack
    undo_stack: Vec<LaTeXEditOperation>,
    /// Editor configuration
    config: EditorConfig,
}

impl LaTeXEditor {
    /// Create a new LaTeX editor
    pub fn new(path: &str) -> Result<Self, EditorError> {
        let content = if Path::new(path).exists() {
            std::fs::read_to_string(path).map_err(|e| EditorError::IoError(e.to_string()))?
        } else {
            String::new()
        };

        Ok(Self {
            source_path: path.to_string(),
            original_content: content.clone(),
            content,
            operations: Vec::new(),
            undo_stack: Vec::new(),
            config: EditorConfig::default(),
        })
    }

    /// Get current content
    pub fn get_content(&self) -> &str {
        &self.content
    }

    /// Add an edit operation
    pub fn add_operation(&mut self, operation: LaTeXEditOperation) {
        self.operations.push(operation);
        self.undo_stack.clear();
    }

    /// Get LaTeX command completions
    pub fn get_completions(&self, prefix: &str) -> Vec<String> {
        let commands = vec![
            "\\begin", "\\end", "\\section", "\\subsection", "\\subsubsection",
            "\\textbf", "\\textit", "\\emph", "\\cite", "\\ref", "\\label",
            "\\includegraphics", "\\caption", "\\figure", "\\table",
            "\\equation", "\\align", "\\frac", "\\sqrt", "\\sum", "\\int",
            "\\alpha", "\\beta", "\\gamma", "\\delta", "\\epsilon",
        ];

        commands
            .into_iter()
            .filter(|c| c.starts_with(prefix))
            .map(String::from)
            .collect()
    }
}

#[async_trait]
impl DocumentEditor for LaTeXEditor {
    fn document_type(&self) -> crate::document::DocumentType {
        crate::document::DocumentType::Latex
    }

    fn can_edit(&self) -> bool {
        true
    }

    fn undo(&mut self) -> Option<()> {
        if !self.operations.is_empty() {
            self.operations.pop();
            Some(())
        } else {
            None
        }
    }

    fn redo(&mut self) -> Option<()> {
        None
    }

    fn has_unsaved_changes(&self) -> bool {
        self.content != self.original_content
    }

    fn operation_count(&self) -> usize {
        self.operations.len()
    }

    fn clear_operations(&mut self) {
        self.operations.clear();
        self.undo_stack.clear();
    }

    async fn save(&mut self) -> Result<(), EditorError> {
        self.save_as(&self.source_path.clone()).await?;
        self.original_content = self.content.clone();
        Ok(())
    }

    async fn save_as(&self, output_path: &str) -> Result<(), EditorError> {
        tokio::fs::write(output_path, &self.content)
            .await
            .map_err(|e| EditorError::IoError(e.to_string()))?;
        tracing::info!("Saved LaTeX file to {}", output_path);
        Ok(())
    }
}

// ============================================================================
// EPUB Editor Implementation
// ============================================================================

/// EPUB Editor state
#[derive(Debug)]
pub struct EPUBEditor {
    /// Path to the source file
    source_path: String,
    /// Pending edit operations
    operations: Vec<EPUBEditOperation>,
    /// Undo stack
    undo_stack: Vec<EPUBEditOperation>,
    /// Editor configuration
    config: EditorConfig,
    /// Whether document has unsaved changes
    has_changes: bool,
}

impl EPUBEditor {
    /// Create a new EPUB editor
    pub fn new(path: &str) -> Result<Self, EditorError> {
        if !Path::new(path).exists() {
            return Err(EditorError::FileNotFound(path.to_string()));
        }

        Ok(Self {
            source_path: path.to_string(),
            operations: Vec::new(),
            undo_stack: Vec::new(),
            config: EditorConfig::default(),
            has_changes: false,
        })
    }

    /// Add an edit operation
    pub fn add_operation(&mut self, operation: EPUBEditOperation) {
        self.operations.push(operation);
        self.undo_stack.clear();
        self.has_changes = true;
    }

    /// Get pending operations
    pub fn get_operations(&self) -> &[EPUBEditOperation] {
        &self.operations
    }
}

#[async_trait]
impl DocumentEditor for EPUBEditor {
    fn document_type(&self) -> crate::document::DocumentType {
        crate::document::DocumentType::Epub
    }

    fn can_edit(&self) -> bool {
        true
    }

    fn undo(&mut self) -> Option<()> {
        if let Some(op) = self.operations.pop() {
            self.undo_stack.push(op);
            if self.operations.is_empty() {
                self.has_changes = false;
            }
            Some(())
        } else {
            None
        }
    }

    fn redo(&mut self) -> Option<()> {
        if let Some(op) = self.undo_stack.pop() {
            self.operations.push(op);
            self.has_changes = true;
            Some(())
        } else {
            None
        }
    }

    fn has_unsaved_changes(&self) -> bool {
        self.has_changes
    }

    fn operation_count(&self) -> usize {
        self.operations.len()
    }

    fn clear_operations(&mut self) {
        self.operations.clear();
        self.undo_stack.clear();
        self.has_changes = false;
    }

    async fn save(&mut self) -> Result<(), EditorError> {
        // TODO: Implement with epub crate
        self.save_as(&self.source_path.clone()).await?;
        self.has_changes = false;
        Ok(())
    }

    async fn save_as(&self, output_path: &str) -> Result<(), EditorError> {
        // TODO: Implement actual EPUB manipulation
        tracing::info!(
            "Saving EPUB with {} operations to {}",
            self.operations.len(),
            output_path
        );
        Ok(())
    }
}

// ============================================================================
// PDF Utilities
// ============================================================================

/// Image format for conversion
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImageFormat {
    Png,
    Jpeg,
    Webp,
    Tiff,
}

/// PDF merging and splitting utilities
pub struct PDFUtils;

impl PDFUtils {
    /// Merge multiple PDFs into one
    pub async fn merge(input_paths: &[&str], output_path: &str) -> Result<(), EditorError> {
        for path in input_paths {
            if !Path::new(path).exists() {
                return Err(EditorError::FileNotFound(path.to_string()));
            }
        }
        tracing::info!("Merging {} PDFs into {}", input_paths.len(), output_path);
        // TODO: Implement with lopdf
        Ok(())
    }

    /// Split a PDF into multiple files
    pub async fn split(
        input_path: &str,
        ranges: &[(u32, u32)],
        output_prefix: &str,
    ) -> Result<Vec<String>, EditorError> {
        if !Path::new(input_path).exists() {
            return Err(EditorError::FileNotFound(input_path.to_string()));
        }
        tracing::info!("Splitting {} into {} parts", input_path, ranges.len());
        let output_paths: Vec<String> = ranges
            .iter()
            .enumerate()
            .map(|(i, _)| format!("{}_{}.pdf", output_prefix, i + 1))
            .collect();
        Ok(output_paths)
    }

    /// Extract pages from a PDF
    pub async fn extract_pages(
        input_path: &str,
        pages: &[u32],
        output_path: &str,
    ) -> Result<(), EditorError> {
        if !Path::new(input_path).exists() {
            return Err(EditorError::FileNotFound(input_path.to_string()));
        }
        tracing::info!("Extracting {} pages from {}", pages.len(), input_path);
        // TODO: Implement
        Ok(())
    }

    /// Compress a PDF to reduce file size
    pub async fn compress(
        input_path: &str,
        output_path: &str,
        quality: u8,
    ) -> Result<(), EditorError> {
        if !Path::new(input_path).exists() {
            return Err(EditorError::FileNotFound(input_path.to_string()));
        }
        tracing::info!("Compressing {} with quality {}", input_path, quality);
        // TODO: Implement compression
        Ok(())
    }

    /// Convert PDF to images
    pub async fn to_images(
        input_path: &str,
        output_dir: &str,
        format: ImageFormat,
        dpi: u32,
    ) -> Result<Vec<String>, EditorError> {
        if !Path::new(input_path).exists() {
            return Err(EditorError::FileNotFound(input_path.to_string()));
        }
        tracing::info!("Converting {} to images at {} DPI", input_path, dpi);
        // TODO: Implement with pdfium or poppler
        Ok(vec![])
    }

    /// Convert images to PDF
    pub async fn from_images(image_paths: &[&str], output_path: &str) -> Result<(), EditorError> {
        for path in image_paths {
            if !Path::new(path).exists() {
                return Err(EditorError::FileNotFound(path.to_string()));
            }
        }
        tracing::info!("Creating PDF from {} images", image_paths.len());
        // TODO: Implement
        Ok(())
    }
}

// ============================================================================
// Conversion Utilities
// ============================================================================

/// Document conversion utilities
pub struct ConversionUtils;

impl ConversionUtils {
    /// Convert Markdown to PDF
    pub async fn markdown_to_pdf(input: &str, output: &str) -> Result<(), EditorError> {
        if !Path::new(input).exists() {
            return Err(EditorError::FileNotFound(input.to_string()));
        }
        tracing::info!("Converting {} to PDF: {}", input, output);
        // TODO: Implement with pulldown-cmark + pdf generation
        Ok(())
    }

    /// Convert Markdown to DOCX
    pub async fn markdown_to_docx(input: &str, output: &str) -> Result<(), EditorError> {
        if !Path::new(input).exists() {
            return Err(EditorError::FileNotFound(input.to_string()));
        }
        tracing::info!("Converting {} to DOCX: {}", input, output);
        // TODO: Implement
        Ok(())
    }

    /// Convert DOCX to PDF
    pub async fn docx_to_pdf(input: &str, output: &str) -> Result<(), EditorError> {
        if !Path::new(input).exists() {
            return Err(EditorError::FileNotFound(input.to_string()));
        }
        tracing::info!("Converting {} to PDF: {}", input, output);
        // TODO: Implement
        Ok(())
    }

    /// Convert LaTeX to PDF
    pub async fn latex_to_pdf(input: &str, output: &str) -> Result<(), EditorError> {
        if !Path::new(input).exists() {
            return Err(EditorError::FileNotFound(input.to_string()));
        }
        tracing::info!("Converting {} to PDF: {}", input, output);
        // TODO: Shell out to pdflatex or use tectonic
        Ok(())
    }

    /// Convert TXT to Markdown
    pub async fn txt_to_markdown(input: &str, output: &str) -> Result<(), EditorError> {
        if !Path::new(input).exists() {
            return Err(EditorError::FileNotFound(input.to_string()));
        }
        // Simple conversion - just copy with .md extension
        let content = tokio::fs::read_to_string(input)
            .await
            .map_err(|e| EditorError::IoError(e.to_string()))?;
        tokio::fs::write(output, content)
            .await
            .map_err(|e| EditorError::IoError(e.to_string()))?;
        Ok(())
    }
}

// ============================================================================
// Operation Info for Frontend
// ============================================================================

/// Serializable version of edit operation for frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditOperationInfo {
    pub id: String,
    pub operation_type: String,
    pub doc_type: String,
    pub page: Option<u32>,
    pub description: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl EditOperationInfo {
    /// Create info from a unified edit operation
    pub fn from_operation(op: &EditOperation) -> Self {
        match op {
            EditOperation::Pdf(pdf_op) => Self::from_pdf_operation(pdf_op),
            EditOperation::Text(text_op) => Self::from_text_operation(text_op),
            EditOperation::Docx(docx_op) => Self::from_docx_operation(docx_op),
            EditOperation::Latex(latex_op) => Self::from_latex_operation(latex_op),
            EditOperation::Epub(epub_op) => Self::from_epub_operation(epub_op),
        }
    }

    fn from_pdf_operation(op: &PDFEditOperation) -> Self {
        let (op_type, page, desc) = match op {
            PDFEditOperation::AddText { page, text, .. } => {
                let preview = if text.len() > 20 { &text[..20] } else { text };
                ("add_text", Some(*page), format!("Add text: {}...", preview))
            }
            PDFEditOperation::AddImage { page, .. } => {
                ("add_image", Some(*page), "Add image".to_string())
            }
            PDFEditOperation::AddHighlight { page, .. } => {
                ("add_highlight", Some(*page), "Add highlight".to_string())
            }
            PDFEditOperation::AddAnnotation { page, content, .. } => {
                let preview = if content.len() > 20 { &content[..20] } else { content };
                ("add_annotation", Some(*page), format!("Add note: {}...", preview))
            }
            PDFEditOperation::DeletePage { page } => {
                ("delete_page", Some(*page), format!("Delete page {}", page))
            }
            PDFEditOperation::InsertPage { after_page, .. } => {
                ("insert_page", Some(*after_page), format!("Insert page after {}", after_page))
            }
            PDFEditOperation::RotatePage { page, degrees } => {
                ("rotate_page", Some(*page), format!("Rotate page {} by {}°", page, degrees))
            }
            PDFEditOperation::AddWatermark { text, .. } => {
                ("add_watermark", None, format!("Add watermark: {}", text))
            }
            PDFEditOperation::Redact { page, .. } => {
                ("redact", Some(*page), format!("Redact on page {}", page))
            }
            PDFEditOperation::AddSignature { page, .. } => {
                ("add_signature", Some(*page), format!("Add signature on page {}", page))
            }
            PDFEditOperation::AddShape { page, shape_type, .. } => {
                ("add_shape", Some(*page), format!("Add {:?} on page {}", shape_type, page))
            }
            PDFEditOperation::AddLine { page, .. } => {
                ("add_line", Some(*page), format!("Add line on page {}", page))
            }
            PDFEditOperation::FillFormField { field_name, .. } => {
                ("fill_form", None, format!("Fill field: {}", field_name))
            }
            PDFEditOperation::AddLink { page, url, .. } => {
                ("add_link", Some(*page), format!("Add link to {}", url))
            }
            PDFEditOperation::AddBookmark { title, page, .. } => {
                ("add_bookmark", Some(*page), format!("Add bookmark: {}", title))
            }
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type: op_type.to_string(),
            doc_type: "pdf".to_string(),
            page,
            description: desc,
            timestamp: chrono::Utc::now(),
        }
    }

    fn from_text_operation(op: &TextEditOperation) -> Self {
        let (op_type, desc) = match op {
            TextEditOperation::Common(CommonEditOperation::InsertText { text, .. }) => {
                let preview = if text.len() > 20 { &text[..20] } else { text };
                ("insert_text", format!("Insert: {}...", preview))
            }
            TextEditOperation::Common(CommonEditOperation::DeleteText { .. }) => {
                ("delete_text", "Delete text".to_string())
            }
            TextEditOperation::Common(CommonEditOperation::ReplaceText { new_text, .. }) => {
                let preview = if new_text.len() > 20 { &new_text[..20] } else { new_text };
                ("replace_text", format!("Replace with: {}...", preview))
            }
            TextEditOperation::InsertHeading { level, text, .. } => {
                ("insert_heading", format!("H{}: {}", level, text))
            }
            TextEditOperation::InsertCodeBlock { language, .. } => {
                ("insert_code", format!("Code block ({})", language))
            }
            TextEditOperation::InsertLink { text, url, .. } => {
                ("insert_link", format!("Link: {} -> {}", text, url))
            }
            TextEditOperation::ToggleBold { .. } => ("toggle_bold", "Toggle bold".to_string()),
            TextEditOperation::ToggleItalic { .. } => ("toggle_italic", "Toggle italic".to_string()),
            _ => ("edit", "Edit text".to_string()),
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type: op_type.to_string(),
            doc_type: "text".to_string(),
            page: None,
            description: desc,
            timestamp: chrono::Utc::now(),
        }
    }

    fn from_docx_operation(op: &DOCXEditOperation) -> Self {
        let (op_type, desc) = match op {
            DOCXEditOperation::Common(_) => ("edit", "Edit content".to_string()),
            DOCXEditOperation::ApplyStyle { style_name, .. } => {
                ("apply_style", format!("Apply style: {}", style_name))
            }
            DOCXEditOperation::InsertTable { rows, cols, .. } => {
                ("insert_table", format!("Insert {}x{} table", rows, cols))
            }
            DOCXEditOperation::InsertPageBreak { .. } => {
                ("page_break", "Insert page break".to_string())
            }
            _ => ("edit", "Edit document".to_string()),
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type: op_type.to_string(),
            doc_type: "docx".to_string(),
            page: None,
            description: desc,
            timestamp: chrono::Utc::now(),
        }
    }

    fn from_latex_operation(op: &LaTeXEditOperation) -> Self {
        let (op_type, desc) = match op {
            LaTeXEditOperation::Common(_) => ("edit", "Edit content".to_string()),
            LaTeXEditOperation::InsertEnvironment { env_name, .. } => {
                ("insert_env", format!("Insert \\begin{{{}}}...\\end{{{}}}", env_name, env_name))
            }
            LaTeXEditOperation::InsertCommand { command, .. } => {
                ("insert_cmd", format!("Insert {}", command))
            }
            LaTeXEditOperation::WrapInMath { display_mode, .. } => {
                let mode = if *display_mode { "display" } else { "inline" };
                ("wrap_math", format!("Wrap in {} math", mode))
            }
            LaTeXEditOperation::InsertCitation { cite_key, .. } => {
                ("insert_cite", format!("Cite: {}", cite_key))
            }
            _ => ("edit", "Edit LaTeX".to_string()),
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type: op_type.to_string(),
            doc_type: "latex".to_string(),
            page: None,
            description: desc,
            timestamp: chrono::Utc::now(),
        }
    }

    fn from_epub_operation(op: &EPUBEditOperation) -> Self {
        let (op_type, desc) = match op {
            EPUBEditOperation::Common(_) => ("edit", "Edit content".to_string()),
            EPUBEditOperation::ModifyMetadata { field, value } => {
                ("modify_metadata", format!("Set {:?}: {}", field, value))
            }
            EPUBEditOperation::UpdateTOC { .. } => ("update_toc", "Update table of contents".to_string()),
            EPUBEditOperation::SetCoverImage { .. } => ("set_cover", "Set cover image".to_string()),
            EPUBEditOperation::AddChapter { title, .. } => {
                ("add_chapter", format!("Add chapter: {}", title))
            }
            _ => ("edit", "Edit EPUB".to_string()),
        };

        Self {
            id: uuid::Uuid::new_v4().to_string(),
            operation_type: op_type.to_string(),
            doc_type: "epub".to_string(),
            page: None,
            description: desc,
            timestamp: chrono::Utc::now(),
        }
    }
}
