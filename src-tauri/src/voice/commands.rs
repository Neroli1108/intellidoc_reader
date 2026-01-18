//! Voice Command Parser
//!
//! Parses transcribed speech into structured voice commands.

use serde::{Deserialize, Serialize};

/// Voice commands recognized by the system
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum VoiceCommand {
    /// "Note down: [content]" - Add annotation at cursor
    NoteDown {
        content: String,
    },

    /// "Highlight this" - Highlight current selection/sentence
    Highlight {
        color: Option<String>,
    },

    /// "Read from here" - Start reading from cursor position
    StartReading,

    /// "Stop reading" / "Pause"
    StopReading,

    /// "Skip to next section"
    SkipSection,

    /// "Go back" - Return to previous position
    GoBack,

    /// "Go to page [number]"
    GoToPage {
        page: u32,
    },

    /// "Ask: [question]" - Query the LLM
    AskQuestion {
        question: String,
    },

    /// "Explain this" - Explain current selection
    ExplainSelection,

    /// "Summarize" - Summarize current page/section
    Summarize {
        scope: SummarizeScope,
    },

    /// "Speed up" / "Slow down"
    AdjustSpeed {
        delta: f32,
    },

    /// "Set speed to [number]"
    SetSpeed {
        speed: f32,
    },

    /// "Repeat" - Repeat last spoken content
    Repeat,

    /// "Define [word]" - Define a word
    Define {
        word: String,
    },

    /// "Translate to [language]"
    Translate {
        target_language: String,
    },

    /// "Search for [text]"
    Search {
        query: String,
    },

    /// "Next page" / "Previous page"
    NavigatePage {
        direction: PageDirection,
    },

    /// "Zoom in" / "Zoom out"
    Zoom {
        direction: ZoomDirection,
    },

    /// Raw text that doesn't match any command
    FreeText {
        text: String,
    },

    /// Unrecognized / unclear command
    Unknown {
        text: String,
    },
}

/// Scope for summarization command
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SummarizeScope {
    /// Summarize selected text
    #[default]
    Selection,
    /// Summarize current page
    Page,
    /// Summarize current section
    Section,
    /// Summarize entire document
    Document,
}

/// Page navigation direction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PageDirection {
    Next,
    Previous,
}

/// Zoom direction
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ZoomDirection {
    In,
    Out,
}

/// Voice command parser
pub struct VoiceCommandParser {
    /// Language for parsing
    language: String,
}

impl VoiceCommandParser {
    /// Create a new voice command parser
    pub fn new(language: String) -> Self {
        Self { language }
    }

    /// Parse transcribed text into a voice command
    pub fn parse(&self, text: &str) -> VoiceCommand {
        let text = text.trim();
        let lower = text.to_lowercase();

        // Note-taking commands
        if let Some(content) = self.parse_note_command(&lower, text) {
            return VoiceCommand::NoteDown { content };
        }

        // Question/Ask commands
        if let Some(question) = self.parse_question_command(&lower, text) {
            return VoiceCommand::AskQuestion { question };
        }

        // Highlight command
        if let Some(color) = self.parse_highlight_command(&lower) {
            return VoiceCommand::Highlight { color };
        }

        // Reading control commands
        if let Some(cmd) = self.parse_reading_command(&lower) {
            return cmd;
        }

        // Navigation commands
        if let Some(cmd) = self.parse_navigation_command(&lower) {
            return cmd;
        }

        // Speed commands
        if let Some(cmd) = self.parse_speed_command(&lower) {
            return cmd;
        }

        // Summarize command
        if let Some(cmd) = self.parse_summarize_command(&lower) {
            return cmd;
        }

        // Define command
        if let Some(word) = self.parse_define_command(&lower, text) {
            return VoiceCommand::Define { word };
        }

        // Translate command
        if let Some(language) = self.parse_translate_command(&lower, text) {
            return VoiceCommand::Translate {
                target_language: language,
            };
        }

        // Search command
        if let Some(query) = self.parse_search_command(&lower, text) {
            return VoiceCommand::Search { query };
        }

        // Zoom commands
        if let Some(cmd) = self.parse_zoom_command(&lower) {
            return cmd;
        }

        // Check if it's a question (ends with ?)
        if text.ends_with('?') {
            return VoiceCommand::AskQuestion {
                question: text.to_string(),
            };
        }

        // Default to free text
        VoiceCommand::FreeText {
            text: text.to_string(),
        }
    }

    /// Parse note-taking commands
    fn parse_note_command(&self, lower: &str, original: &str) -> Option<String> {
        let prefixes = [
            "note down",
            "note",
            "write down",
            "write",
            "add note",
            "take note",
            "remember",
            "记下", // Chinese
            "メモ", // Japanese
        ];

        for prefix in prefixes {
            if lower.starts_with(prefix) {
                let content = if lower.contains(':') {
                    original
                        .split_once(':')
                        .map(|(_, c)| c.trim().to_string())
                } else {
                    let skip_len = prefix.len();
                    Some(original[skip_len..].trim().to_string())
                };

                if let Some(content) = content {
                    if !content.is_empty() {
                        return Some(content);
                    }
                }
            }
        }

        None
    }

    /// Parse question/ask commands
    fn parse_question_command(&self, lower: &str, original: &str) -> Option<String> {
        let prefixes = ["ask", "question", "what is", "what are", "how do", "how does", "why"];

        for prefix in prefixes {
            if lower.starts_with(prefix) {
                let question = if lower.contains(':') {
                    original
                        .split_once(':')
                        .map(|(_, q)| q.trim().to_string())
                        .unwrap_or_else(|| original.to_string())
                } else {
                    original.to_string()
                };

                return Some(question);
            }
        }

        None
    }

    /// Parse highlight command
    fn parse_highlight_command(&self, lower: &str) -> Option<Option<String>> {
        if lower.contains("highlight") {
            // Check for color specification
            let colors = [
                ("yellow", "yellow"),
                ("green", "green"),
                ("blue", "blue"),
                ("red", "red"),
                ("purple", "purple"),
                ("orange", "orange"),
                ("pink", "pink"),
            ];

            for (name, color) in colors {
                if lower.contains(name) {
                    return Some(Some(color.to_string()));
                }
            }

            return Some(None);
        }

        None
    }

    /// Parse reading control commands
    fn parse_reading_command(&self, lower: &str) -> Option<VoiceCommand> {
        let start_phrases = [
            "read from here",
            "start reading",
            "read this",
            "read aloud",
            "read",
            "play",
        ];

        let stop_phrases = [
            "stop reading",
            "stop",
            "pause",
            "pause reading",
            "quiet",
            "silence",
        ];

        let repeat_phrases = ["repeat", "say again", "again", "replay"];

        let skip_phrases = [
            "skip section",
            "skip to next",
            "next section",
            "skip",
        ];

        let back_phrases = ["go back", "back", "previous", "rewind"];

        for phrase in start_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::StartReading);
            }
        }

        for phrase in stop_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::StopReading);
            }
        }

        for phrase in repeat_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::Repeat);
            }
        }

        for phrase in skip_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::SkipSection);
            }
        }

        for phrase in back_phrases {
            if lower == phrase {
                return Some(VoiceCommand::GoBack);
            }
        }

        // Explain selection
        if lower == "explain this" || lower == "explain" || lower.starts_with("explain this") {
            return Some(VoiceCommand::ExplainSelection);
        }

        None
    }

    /// Parse navigation commands
    fn parse_navigation_command(&self, lower: &str) -> Option<VoiceCommand> {
        // Page navigation
        if lower == "next page" || lower == "page down" {
            return Some(VoiceCommand::NavigatePage {
                direction: PageDirection::Next,
            });
        }

        if lower == "previous page" || lower == "page up" || lower == "last page" {
            return Some(VoiceCommand::NavigatePage {
                direction: PageDirection::Previous,
            });
        }

        // Go to specific page
        if lower.starts_with("go to page") || lower.starts_with("page") {
            if let Some(num) = self.extract_number(lower) {
                return Some(VoiceCommand::GoToPage { page: num });
            }
        }

        None
    }

    /// Parse speed adjustment commands
    fn parse_speed_command(&self, lower: &str) -> Option<VoiceCommand> {
        let speed_up_phrases = ["speed up", "faster", "increase speed", "quicker"];
        let slow_down_phrases = ["slow down", "slower", "decrease speed", "reduce speed"];

        for phrase in speed_up_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::AdjustSpeed { delta: 0.25 });
            }
        }

        for phrase in slow_down_phrases {
            if lower == phrase || lower.starts_with(phrase) {
                return Some(VoiceCommand::AdjustSpeed { delta: -0.25 });
            }
        }

        // Set specific speed
        if lower.starts_with("set speed to") || lower.starts_with("speed") {
            if let Some(speed) = self.extract_float(lower) {
                if speed >= 0.25 && speed <= 3.0 {
                    return Some(VoiceCommand::SetSpeed { speed });
                }
            }
        }

        None
    }

    /// Parse summarize command
    fn parse_summarize_command(&self, lower: &str) -> Option<VoiceCommand> {
        if !lower.contains("summar") {
            return None;
        }

        let scope = if lower.contains("document") || lower.contains("entire") {
            SummarizeScope::Document
        } else if lower.contains("section") {
            SummarizeScope::Section
        } else if lower.contains("page") {
            SummarizeScope::Page
        } else {
            SummarizeScope::Selection
        };

        Some(VoiceCommand::Summarize { scope })
    }

    /// Parse define command
    fn parse_define_command(&self, lower: &str, original: &str) -> Option<String> {
        if lower.starts_with("define") || lower.starts_with("what does") || lower.starts_with("what is") {
            let word = original
                .split_whitespace()
                .last()
                .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()))
                .filter(|w| !w.is_empty())
                .map(String::from);

            return word;
        }

        None
    }

    /// Parse translate command
    fn parse_translate_command(&self, lower: &str, _original: &str) -> Option<String> {
        if !lower.contains("translate") {
            return None;
        }

        let languages = [
            ("spanish", "es"),
            ("french", "fr"),
            ("german", "de"),
            ("chinese", "zh"),
            ("japanese", "ja"),
            ("korean", "ko"),
            ("italian", "it"),
            ("portuguese", "pt"),
            ("russian", "ru"),
            ("arabic", "ar"),
        ];

        for (name, code) in languages {
            if lower.contains(name) {
                return Some(code.to_string());
            }
        }

        // Try to extract language after "to"
        if let Some(pos) = lower.find(" to ") {
            let lang = lower[pos + 4..].trim().to_string();
            if !lang.is_empty() {
                return Some(lang);
            }
        }

        None
    }

    /// Parse search command
    fn parse_search_command(&self, lower: &str, original: &str) -> Option<String> {
        let prefixes = ["search for", "search", "find", "look for"];

        for prefix in prefixes {
            if lower.starts_with(prefix) {
                let query = original[prefix.len()..].trim().to_string();
                if !query.is_empty() {
                    return Some(query);
                }
            }
        }

        None
    }

    /// Parse zoom command
    fn parse_zoom_command(&self, lower: &str) -> Option<VoiceCommand> {
        if lower.contains("zoom in") || lower == "bigger" || lower == "larger" {
            return Some(VoiceCommand::Zoom {
                direction: ZoomDirection::In,
            });
        }

        if lower.contains("zoom out") || lower == "smaller" {
            return Some(VoiceCommand::Zoom {
                direction: ZoomDirection::Out,
            });
        }

        None
    }

    /// Extract a number from text
    fn extract_number(&self, text: &str) -> Option<u32> {
        // Try to find digits
        let digits: String = text.chars().filter(|c| c.is_ascii_digit()).collect();
        if !digits.is_empty() {
            return digits.parse().ok();
        }

        // Try word numbers
        let word_numbers = [
            ("one", 1),
            ("two", 2),
            ("three", 3),
            ("four", 4),
            ("five", 5),
            ("six", 6),
            ("seven", 7),
            ("eight", 8),
            ("nine", 9),
            ("ten", 10),
        ];

        for (word, num) in word_numbers {
            if text.contains(word) {
                return Some(num);
            }
        }

        None
    }

    /// Extract a float from text
    fn extract_float(&self, text: &str) -> Option<f32> {
        // Find patterns like "1.5" or "1.5x" or "1x"
        let re_pattern = regex::Regex::new(r"(\d+\.?\d*)").ok()?;

        if let Some(caps) = re_pattern.captures(text) {
            if let Some(m) = caps.get(1) {
                return m.as_str().parse().ok();
            }
        }

        None
    }
}

impl Default for VoiceCommandParser {
    fn default() -> Self {
        Self::new("en-US".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_note_down_command() {
        let parser = VoiceCommandParser::default();

        let cmd = parser.parse("Note down: This is important");
        match cmd {
            VoiceCommand::NoteDown { content } => {
                assert_eq!(content, "This is important");
            }
            _ => panic!("Expected NoteDown command"),
        }

        let cmd = parser.parse("write down remember to review this");
        match cmd {
            VoiceCommand::NoteDown { content } => {
                assert!(content.contains("remember"));
            }
            _ => panic!("Expected NoteDown command"),
        }
    }

    #[test]
    fn test_reading_commands() {
        let parser = VoiceCommandParser::default();

        assert!(matches!(
            parser.parse("start reading"),
            VoiceCommand::StartReading
        ));
        assert!(matches!(
            parser.parse("stop"),
            VoiceCommand::StopReading
        ));
        assert!(matches!(parser.parse("repeat"), VoiceCommand::Repeat));
    }

    #[test]
    fn test_speed_commands() {
        let parser = VoiceCommandParser::default();

        match parser.parse("speed up") {
            VoiceCommand::AdjustSpeed { delta } => assert!(delta > 0.0),
            _ => panic!("Expected AdjustSpeed command"),
        }

        match parser.parse("slow down") {
            VoiceCommand::AdjustSpeed { delta } => assert!(delta < 0.0),
            _ => panic!("Expected AdjustSpeed command"),
        }
    }

    #[test]
    fn test_question_detection() {
        let parser = VoiceCommandParser::default();

        match parser.parse("What is machine learning?") {
            VoiceCommand::AskQuestion { question } => {
                assert!(question.contains("machine learning"));
            }
            _ => panic!("Expected AskQuestion command"),
        }
    }
}
