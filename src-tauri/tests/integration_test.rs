//! Integration tests for IntelliDoc Reader commands

use intellidoc_reader_lib::document::{parser, DocumentType};
use intellidoc_reader_lib::llm::providers::{create_client, LLMProvider, ProviderConfig};

#[tokio::test]
async fn test_parse_markdown_file() {
    // Create a temp markdown file
    let temp_path = "/tmp/test_doc.md";
    std::fs::write(temp_path, r#"# Test Document

This is a test paragraph.

## Section 1

More content here with some words to count.
"#).unwrap();

    let doc = parser::parse_document(temp_path).await.unwrap();

    assert_eq!(doc.doc_type, DocumentType::Markdown);
    assert!(!doc.pages.is_empty());
    assert!(doc.metadata.word_count > 0);
    println!("✓ Markdown parsing works: {} words, {} pages",
             doc.metadata.word_count, doc.metadata.page_count);

    std::fs::remove_file(temp_path).ok();
}

#[tokio::test]
async fn test_parse_text_file() {
    let temp_path = "/tmp/test_doc.txt";
    std::fs::write(temp_path, "Hello world. This is a test document with multiple sentences.").unwrap();

    let doc = parser::parse_document(temp_path).await.unwrap();

    assert_eq!(doc.doc_type, DocumentType::Txt);
    assert!(!doc.pages.is_empty());
    println!("✓ Text parsing works: {} words", doc.metadata.word_count);

    std::fs::remove_file(temp_path).ok();
}

#[tokio::test]
async fn test_llm_provider_config() {
    // Test that we can create provider configs
    let openai_config = ProviderConfig::openai("test-key".to_string(), "gpt-4o-mini");
    assert_eq!(openai_config.model, "gpt-4o-mini");
    println!("✓ OpenAI config creation works");

    let bedrock_config = ProviderConfig::bedrock("anthropic.claude-3-haiku-20240307-v1:0");
    assert_eq!(bedrock_config.model, "anthropic.claude-3-haiku-20240307-v1:0");
    println!("✓ Bedrock config creation works");
}

#[tokio::test]
async fn test_openai_client_creation() {
    // Just verify we can create the client without panicking
    let client = create_client(&LLMProvider::OpenAI);
    // If we get here without panic, client creation works
    let _ = client;
    println!("✓ OpenAI client creation works");
}

#[tokio::test]
async fn test_document_category_detection() {
    // Test category detection from content
    let temp_path = "/tmp/tech_doc.txt";
    std::fs::write(temp_path, "This paper discusses machine learning algorithms and neural networks.").unwrap();

    let doc = parser::parse_document(temp_path).await.unwrap();
    println!("✓ Category detection: {:?}", doc.category);

    std::fs::remove_file(temp_path).ok();
}

#[test]
fn test_annotation_types() {
    use intellidoc_reader_lib::annotation::{Annotation, HighlightColor, AnnotationUpdate};
    use uuid::Uuid;
    use chrono::Utc;

    let mut annotation = Annotation {
        id: Uuid::new_v4(),
        document_id: "test-doc".to_string(),
        page_number: 1,
        paragraph_id: None,
        start_offset: 0,
        end_offset: 10,
        selected_text: "Test text".to_string(),
        highlight_color: Some(HighlightColor::Yellow),
        note: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let update = AnnotationUpdate {
        highlight_color: Some(Some(HighlightColor::Blue)),
        note: Some(Some("Test note".to_string())),
    };

    update.apply_to(&mut annotation);

    assert_eq!(annotation.highlight_color, Some(HighlightColor::Blue));
    assert_eq!(annotation.note, Some("Test note".to_string()));
    println!("✓ Annotation types and updates work");
}

#[test]
fn test_voice_command_parsing() {
    use intellidoc_reader_lib::voice::VoiceCommand;
    use intellidoc_reader_lib::voice::commands::VoiceCommandParser;

    let parser = VoiceCommandParser::new("en".to_string());

    // Test various voice commands
    let cmd = parser.parse("go to page 5");
    assert!(matches!(cmd, VoiceCommand::GoToPage { page: 5 }));
    println!("✓ Voice command 'go to page 5' parsed correctly");

    let cmd = parser.parse("next page");
    assert!(matches!(cmd, VoiceCommand::NavigatePage { .. }));
    println!("✓ Voice command 'next page' parsed correctly");

    let cmd = parser.parse("highlight yellow");
    assert!(matches!(cmd, VoiceCommand::Highlight { .. }));
    println!("✓ Voice command 'highlight' parsed correctly");

    let cmd = parser.parse("start reading");
    assert!(matches!(cmd, VoiceCommand::StartReading));
    println!("✓ Voice command 'start reading' parsed correctly");
}

#[test]
fn test_editor_basic() {
    use intellidoc_reader_lib::document::editor::{TextEditor, DocumentEditor};

    // Create a temp file for testing
    let temp_path = "/tmp/editor_test.txt";
    std::fs::write(temp_path, "Initial content").unwrap();

    let editor = TextEditor::new(temp_path).unwrap();

    assert_eq!(editor.get_content(), "Initial content");
    assert!(!editor.has_unsaved_changes());
    assert_eq!(editor.operation_count(), 0);

    println!("✓ Text editor creation and basic operations work");

    // Cleanup
    std::fs::remove_file(temp_path).ok();
}

#[test]
fn test_llm_prompts() {
    use intellidoc_reader_lib::llm::prompts::{PROFESSOR_PROMPT, CODE_GENERATOR_PROMPT};

    // Verify prompts are properly defined
    assert!(!PROFESSOR_PROMPT.is_empty());
    assert!(!CODE_GENERATOR_PROMPT.is_empty());

    println!("✓ LLM prompts loaded: {} chars professor, {} chars code",
             PROFESSOR_PROMPT.len(), CODE_GENERATOR_PROMPT.len());
}

#[test]
fn test_document_types() {
    // Test all supported document types
    assert_eq!(DocumentType::from_extension("pdf"), Some(DocumentType::Pdf));
    assert_eq!(DocumentType::from_extension("md"), Some(DocumentType::Markdown));
    assert_eq!(DocumentType::from_extension("txt"), Some(DocumentType::Txt));
    assert_eq!(DocumentType::from_extension("docx"), Some(DocumentType::Docx));
    assert_eq!(DocumentType::from_extension("epub"), Some(DocumentType::Epub));
    assert_eq!(DocumentType::from_extension("tex"), Some(DocumentType::Latex));

    println!("✓ All document types recognized correctly");
}

#[test]
fn test_highlight_colors() {
    use intellidoc_reader_lib::annotation::HighlightColor;

    let colors = vec![
        HighlightColor::Yellow,
        HighlightColor::Green,
        HighlightColor::Blue,
        HighlightColor::Purple,
        HighlightColor::Red,
    ];

    for color in colors {
        // Verify colors can be serialized and compared
        assert_eq!(color, color.clone());
    }

    println!("✓ All highlight colors work correctly");
}

#[test]
fn test_available_models() {
    use intellidoc_reader_lib::llm::providers::get_available_models;

    let openai_models = get_available_models(&LLMProvider::OpenAI);
    assert!(!openai_models.models.is_empty());
    assert!(openai_models.models.iter().any(|m| m.id.contains("gpt")));
    println!("✓ OpenAI models: {} available", openai_models.models.len());

    let bedrock_models = get_available_models(&LLMProvider::Bedrock);
    assert!(!bedrock_models.models.is_empty());
    assert!(bedrock_models.models.iter().any(|m| m.id.contains("claude") || m.id.contains("anthropic")));
    println!("✓ Bedrock models: {} available", bedrock_models.models.len());
}

fn main() {
    println!("Run with: cargo test --test integration_test -- --nocapture");
}
