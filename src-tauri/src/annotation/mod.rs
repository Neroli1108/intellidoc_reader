//! Annotation management module

pub mod export;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Highlight colors available for annotations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum HighlightColor {
    Yellow,
    Green,
    Blue,
    Purple,
    Red,
}

impl Default for HighlightColor {
    fn default() -> Self {
        Self::Yellow
    }
}

impl HighlightColor {
    pub fn to_css(&self) -> &'static str {
        match self {
            Self::Yellow => "rgba(250, 204, 21, 0.4)",
            Self::Green => "rgba(34, 197, 94, 0.4)",
            Self::Blue => "rgba(59, 130, 246, 0.4)",
            Self::Purple => "rgba(168, 85, 247, 0.4)",
            Self::Red => "rgba(239, 68, 68, 0.4)",
        }
    }
}

/// Main annotation structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Annotation {
    /// Unique annotation ID
    pub id: Uuid,
    /// Reference to the document
    pub document_id: String,
    /// Page number where annotation is located
    pub page_number: u32,
    /// Paragraph ID (optional, for more precise location)
    pub paragraph_id: Option<String>,
    /// Start character offset in the text
    pub start_offset: usize,
    /// End character offset in the text
    pub end_offset: usize,
    /// The selected/highlighted text
    pub selected_text: String,
    /// Highlight color (None if note-only)
    pub highlight_color: Option<HighlightColor>,
    /// Note content (None if highlight-only)
    pub note: Option<String>,
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    /// Last update timestamp
    pub updated_at: DateTime<Utc>,
}

impl Annotation {
    /// Create a new annotation
    pub fn new(
        document_id: String,
        page_number: u32,
        start_offset: usize,
        end_offset: usize,
        selected_text: String,
        highlight_color: Option<HighlightColor>,
        note: Option<String>,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            document_id,
            page_number,
            paragraph_id: None,
            start_offset,
            end_offset,
            selected_text,
            highlight_color,
            note,
            created_at: now,
            updated_at: now,
        }
    }

    /// Check if this annotation has a highlight
    pub fn has_highlight(&self) -> bool {
        self.highlight_color.is_some()
    }

    /// Check if this annotation has a note
    pub fn has_note(&self) -> bool {
        self.note.is_some() && !self.note.as_ref().unwrap().is_empty()
    }
}

/// Update payload for modifying annotations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnnotationUpdate {
    /// New highlight color (None to keep existing)
    pub highlight_color: Option<Option<HighlightColor>>,
    /// New note content (None to keep existing)
    pub note: Option<Option<String>>,
}

impl AnnotationUpdate {
    /// Apply updates to an annotation
    pub fn apply_to(self, annotation: &mut Annotation) {
        if let Some(color) = self.highlight_color {
            annotation.highlight_color = color;
        }
        if let Some(note) = self.note {
            annotation.note = note;
        }
        annotation.updated_at = Utc::now();
    }
}
