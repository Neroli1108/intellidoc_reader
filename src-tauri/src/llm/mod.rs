//! LLM integration module

pub mod prompts;
pub mod providers;

pub use providers::{LLMProvider, ProviderConfig, AvailableModels, ModelInfo, get_available_models};

use serde::{Deserialize, Serialize};

/// Query mode for LLM interactions
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QueryMode {
    /// Quick, direct answer
    QuickAnswer,
    /// Detailed professor-style explanation
    Explain,
    /// Summarize content
    Summarize,
    /// Generate implementation code
    GenerateCode,
}

/// Response from LLM query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmResponse {
    /// The generated answer/explanation
    pub answer: String,
    /// Number of tokens used
    pub tokens_used: u32,
    /// Inference time in milliseconds
    pub inference_time_ms: u64,
}

/// Request for code generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeGenerationRequest {
    /// Description of what to implement
    pub description: String,
    /// Document context (relevant sections)
    pub context: String,
    /// Target programming language
    pub language: String,
    /// Optional framework (e.g., PyTorch, TensorFlow)
    pub framework: Option<String>,
    /// Reference to paper section
    pub section_reference: Option<String>,
}

/// Generated code snippet
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeSnippet {
    /// Programming language
    pub language: String,
    /// Framework used (if any)
    pub framework: Option<String>,
    /// The generated code
    pub code: String,
    /// Description of what the code does
    pub description: String,
    /// Reference to paper section it implements
    pub section_reference: Option<String>,
}

/// LLM model status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelStatus {
    /// Whether a model is currently loaded
    pub loaded: bool,
    /// Name of the loaded model
    pub model_name: Option<String>,
    /// Model file size in MB
    pub model_size_mb: Option<u64>,
    /// Current VRAM usage in MB
    pub vram_usage_mb: Option<u64>,
    /// Maximum context length
    pub context_length: Option<u32>,
}

/// Supported programming languages for code generation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProgrammingLanguage {
    Python,
    Rust,
    Cpp,
    Java,
    JavaScript,
    TypeScript,
    Go,
    Julia,
}

impl Default for ProgrammingLanguage {
    fn default() -> Self {
        Self::Python
    }
}
