//! Annotation export functionality

use super::Annotation;
use crate::error::AppError;

/// Export annotations to Markdown format
pub fn to_markdown(annotations: &[Annotation]) -> String {
    let mut output = String::from("# Document Annotations\n\n");

    // Group by page
    let mut by_page: std::collections::BTreeMap<u32, Vec<&Annotation>> =
        std::collections::BTreeMap::new();

    for annotation in annotations {
        by_page
            .entry(annotation.page_number)
            .or_default()
            .push(annotation);
    }

    for (page, page_annotations) in by_page {
        output.push_str(&format!("## Page {}\n\n", page));

        for annotation in page_annotations {
            // Add highlighted text
            if annotation.has_highlight() {
                let color_name = annotation
                    .highlight_color
                    .as_ref()
                    .map(|c| format!("{:?}", c).to_lowercase())
                    .unwrap_or_else(|| "default".to_string());

                output.push_str(&format!(
                    "> **[{}]** \"{}\"\n",
                    color_name,
                    annotation.selected_text.replace('\n', " ")
                ));
            }

            // Add note
            if annotation.has_note() {
                output.push_str(&format!(
                    "\n📝 **Note:** {}\n",
                    annotation.note.as_ref().unwrap()
                ));
            }

            output.push_str("\n---\n\n");
        }
    }

    output
}

/// Export annotations to JSON format
pub fn to_json(annotations: &[Annotation]) -> Result<String, AppError> {
    serde_json::to_string_pretty(annotations).map_err(|e| {
        crate::error::StorageError::Serialization(e.to_string()).into()
    })
}
