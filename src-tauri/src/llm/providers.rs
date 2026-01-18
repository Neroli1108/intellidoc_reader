//! External LLM Provider Integrations
//!
//! Supports multiple LLM backends:
//! - Local: llama.cpp (Mistral, Llama, CodeLlama)
//! - OpenAI: GPT-4, GPT-4 Turbo, GPT-3.5
//! - Google: Gemini Pro, Gemini Ultra
//! - Anthropic: Claude 3 Opus, Sonnet, Haiku
//! - Groq: Fast inference (Llama, Mixtral)
//! - Ollama: Local model server

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Available LLM providers
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum LLMProvider {
    /// Local llama.cpp models
    Local,
    /// OpenAI API (GPT-4, etc.)
    OpenAI,
    /// Google Gemini API
    Gemini,
    /// Anthropic Claude API
    Anthropic,
    /// Groq API (fast inference)
    Groq,
    /// Local Ollama server
    Ollama,
    /// Azure OpenAI
    AzureOpenAI,
    /// Custom OpenAI-compatible API
    Custom,
}

impl Default for LLMProvider {
    fn default() -> Self {
        Self::Local
    }
}

/// Configuration for an LLM provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    /// Provider type
    pub provider: LLMProvider,
    /// API key (for cloud providers)
    pub api_key: Option<String>,
    /// API endpoint URL (for custom/self-hosted)
    pub api_url: Option<String>,
    /// Model name/ID
    pub model: String,
    /// Maximum tokens in response
    pub max_tokens: u32,
    /// Temperature (0.0 - 2.0)
    pub temperature: f32,
    /// Organization ID (for OpenAI)
    pub organization: Option<String>,
    /// Additional headers
    pub headers: HashMap<String, String>,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            provider: LLMProvider::Local,
            api_key: None,
            api_url: None,
            model: "mistral-7b-q4".to_string(),
            max_tokens: 2048,
            temperature: 0.7,
            organization: None,
            headers: HashMap::new(),
        }
    }
}

/// Provider-specific configurations
impl ProviderConfig {
    /// Create OpenAI configuration
    pub fn openai(api_key: String, model: &str) -> Self {
        Self {
            provider: LLMProvider::OpenAI,
            api_key: Some(api_key),
            api_url: Some("https://api.openai.com/v1".to_string()),
            model: model.to_string(),
            max_tokens: 4096,
            temperature: 0.7,
            ..Default::default()
        }
    }

    /// Create Gemini configuration
    pub fn gemini(api_key: String, model: &str) -> Self {
        Self {
            provider: LLMProvider::Gemini,
            api_key: Some(api_key),
            api_url: Some("https://generativelanguage.googleapis.com/v1beta".to_string()),
            model: model.to_string(),
            max_tokens: 8192,
            temperature: 0.7,
            ..Default::default()
        }
    }

    /// Create Anthropic Claude configuration
    pub fn anthropic(api_key: String, model: &str) -> Self {
        Self {
            provider: LLMProvider::Anthropic,
            api_key: Some(api_key),
            api_url: Some("https://api.anthropic.com/v1".to_string()),
            model: model.to_string(),
            max_tokens: 4096,
            temperature: 0.7,
            ..Default::default()
        }
    }

    /// Create Groq configuration
    pub fn groq(api_key: String, model: &str) -> Self {
        Self {
            provider: LLMProvider::Groq,
            api_key: Some(api_key),
            api_url: Some("https://api.groq.com/openai/v1".to_string()),
            model: model.to_string(),
            max_tokens: 4096,
            temperature: 0.7,
            ..Default::default()
        }
    }

    /// Create Ollama configuration (local)
    pub fn ollama(model: &str) -> Self {
        Self {
            provider: LLMProvider::Ollama,
            api_key: None,
            api_url: Some("http://localhost:11434/api".to_string()),
            model: model.to_string(),
            max_tokens: 4096,
            temperature: 0.7,
            ..Default::default()
        }
    }
}

/// Available models for each provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvailableModels {
    pub provider: LLMProvider,
    pub models: Vec<ModelInfo>,
}

/// Model information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub context_length: u32,
    pub supports_vision: bool,
    pub supports_code: bool,
    pub cost_per_1k_input: Option<f64>,
    pub cost_per_1k_output: Option<f64>,
}

/// Get available models for a provider
pub fn get_available_models(provider: &LLMProvider) -> AvailableModels {
    let models = match provider {
        LLMProvider::OpenAI => vec![
            ModelInfo {
                id: "gpt-4-turbo-preview".to_string(),
                name: "GPT-4 Turbo".to_string(),
                description: "Most capable GPT-4 model, optimized for speed".to_string(),
                context_length: 128000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.01),
                cost_per_1k_output: Some(0.03),
            },
            ModelInfo {
                id: "gpt-4o".to_string(),
                name: "GPT-4o".to_string(),
                description: "Multimodal flagship model".to_string(),
                context_length: 128000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.005),
                cost_per_1k_output: Some(0.015),
            },
            ModelInfo {
                id: "gpt-4o-mini".to_string(),
                name: "GPT-4o Mini".to_string(),
                description: "Fast and affordable".to_string(),
                context_length: 128000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.00015),
                cost_per_1k_output: Some(0.0006),
            },
            ModelInfo {
                id: "gpt-3.5-turbo".to_string(),
                name: "GPT-3.5 Turbo".to_string(),
                description: "Fast and cost-effective".to_string(),
                context_length: 16385,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: Some(0.0005),
                cost_per_1k_output: Some(0.0015),
            },
        ],
        LLMProvider::Gemini => vec![
            ModelInfo {
                id: "gemini-1.5-pro".to_string(),
                name: "Gemini 1.5 Pro".to_string(),
                description: "Best for complex tasks with long context".to_string(),
                context_length: 2000000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.00125),
                cost_per_1k_output: Some(0.005),
            },
            ModelInfo {
                id: "gemini-1.5-flash".to_string(),
                name: "Gemini 1.5 Flash".to_string(),
                description: "Fast and versatile".to_string(),
                context_length: 1000000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.000075),
                cost_per_1k_output: Some(0.0003),
            },
            ModelInfo {
                id: "gemini-2.0-flash-exp".to_string(),
                name: "Gemini 2.0 Flash".to_string(),
                description: "Next-gen speed and quality".to_string(),
                context_length: 1000000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            },
        ],
        LLMProvider::Anthropic => vec![
            ModelInfo {
                id: "claude-3-5-sonnet-20241022".to_string(),
                name: "Claude 3.5 Sonnet".to_string(),
                description: "Best balance of intelligence and speed".to_string(),
                context_length: 200000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.003),
                cost_per_1k_output: Some(0.015),
            },
            ModelInfo {
                id: "claude-3-opus-20240229".to_string(),
                name: "Claude 3 Opus".to_string(),
                description: "Most powerful for complex tasks".to_string(),
                context_length: 200000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.015),
                cost_per_1k_output: Some(0.075),
            },
            ModelInfo {
                id: "claude-3-haiku-20240307".to_string(),
                name: "Claude 3 Haiku".to_string(),
                description: "Fastest, most compact".to_string(),
                context_length: 200000,
                supports_vision: true,
                supports_code: true,
                cost_per_1k_input: Some(0.00025),
                cost_per_1k_output: Some(0.00125),
            },
        ],
        LLMProvider::Groq => vec![
            ModelInfo {
                id: "llama-3.3-70b-versatile".to_string(),
                name: "Llama 3.3 70B".to_string(),
                description: "Powerful open model with fast inference".to_string(),
                context_length: 128000,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: Some(0.00059),
                cost_per_1k_output: Some(0.00079),
            },
            ModelInfo {
                id: "mixtral-8x7b-32768".to_string(),
                name: "Mixtral 8x7B".to_string(),
                description: "Fast mixture-of-experts model".to_string(),
                context_length: 32768,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: Some(0.00024),
                cost_per_1k_output: Some(0.00024),
            },
            ModelInfo {
                id: "llama-3.1-8b-instant".to_string(),
                name: "Llama 3.1 8B".to_string(),
                description: "Ultra-fast small model".to_string(),
                context_length: 128000,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: Some(0.00005),
                cost_per_1k_output: Some(0.00008),
            },
        ],
        LLMProvider::Local | LLMProvider::Ollama => vec![
            ModelInfo {
                id: "mistral-7b-instruct".to_string(),
                name: "Mistral 7B".to_string(),
                description: "Great balance of speed and quality".to_string(),
                context_length: 32768,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            },
            ModelInfo {
                id: "llama-3.2-3b".to_string(),
                name: "Llama 3.2 3B".to_string(),
                description: "Fast, lightweight model".to_string(),
                context_length: 128000,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            },
            ModelInfo {
                id: "codellama-7b".to_string(),
                name: "CodeLlama 7B".to_string(),
                description: "Optimized for code generation".to_string(),
                context_length: 16384,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            },
            ModelInfo {
                id: "qwen2.5-7b".to_string(),
                name: "Qwen 2.5 7B".to_string(),
                description: "Strong multilingual capabilities".to_string(),
                context_length: 32768,
                supports_vision: false,
                supports_code: true,
                cost_per_1k_input: None,
                cost_per_1k_output: None,
            },
        ],
        _ => vec![],
    };

    AvailableModels {
        provider: provider.clone(),
        models,
    }
}

/// Chat message for API requests
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// LLM API client trait
#[async_trait::async_trait]
pub trait LLMClient: Send + Sync {
    async fn chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<String, LLMError>;
    async fn stream_chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<tokio::sync::mpsc::Receiver<String>, LLMError>;
}

/// LLM errors
#[derive(Debug, thiserror::Error)]
pub enum LLMError {
    #[error("API error: {0}")]
    ApiError(String),
    
    #[error("Invalid API key")]
    InvalidApiKey,
    
    #[error("Rate limited: {0}")]
    RateLimited(String),
    
    #[error("Model not found: {0}")]
    ModelNotFound(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("Context too long")]
    ContextTooLong,
}

/// OpenAI-compatible API client implementation
pub struct OpenAIClient {
    client: reqwest::Client,
}

impl OpenAIClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    fn get_api_url(&self, config: &ProviderConfig) -> String {
        config.api_url.clone().unwrap_or_else(|| "https://api.openai.com/v1".to_string())
    }
}

#[async_trait::async_trait]
impl LLMClient for OpenAIClient {
    async fn chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<String, LLMError> {
        let api_url = format!("{}/chat/completions", self.get_api_url(config));
        let api_key = config.api_key.as_ref().ok_or(LLMError::InvalidApiKey)?;

        let body = serde_json::json!({
            "model": config.model,
            "messages": messages,
            "max_tokens": config.max_tokens,
            "temperature": config.temperature,
        });

        let response = self.client
            .post(&api_url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LLMError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LLMError::ApiError(error_text));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| LLMError::ApiError(e.to_string()))?;

        result["choices"][0]["message"]["content"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| LLMError::ApiError("Invalid response format".to_string()))
    }

    async fn stream_chat(&self, _messages: Vec<ChatMessage>, _config: &ProviderConfig) -> Result<tokio::sync::mpsc::Receiver<String>, LLMError> {
        // TODO: Implement streaming
        Err(LLMError::ApiError("Streaming not implemented".to_string()))
    }
}

/// Gemini API client
pub struct GeminiClient {
    client: reqwest::Client,
}

impl GeminiClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait::async_trait]
impl LLMClient for GeminiClient {
    async fn chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<String, LLMError> {
        let api_key = config.api_key.as_ref().ok_or(LLMError::InvalidApiKey)?;
        let api_url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            config.model, api_key
        );

        // Convert to Gemini format
        let contents: Vec<serde_json::Value> = messages.iter().map(|m| {
            serde_json::json!({
                "role": if m.role == "assistant" { "model" } else { "user" },
                "parts": [{"text": m.content}]
            })
        }).collect();

        let body = serde_json::json!({
            "contents": contents,
            "generationConfig": {
                "maxOutputTokens": config.max_tokens,
                "temperature": config.temperature,
            }
        });

        let response = self.client
            .post(&api_url)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LLMError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LLMError::ApiError(error_text));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| LLMError::ApiError(e.to_string()))?;

        result["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| LLMError::ApiError("Invalid response format".to_string()))
    }

    async fn stream_chat(&self, _messages: Vec<ChatMessage>, _config: &ProviderConfig) -> Result<tokio::sync::mpsc::Receiver<String>, LLMError> {
        Err(LLMError::ApiError("Streaming not implemented".to_string()))
    }
}

/// Anthropic Claude API client
pub struct AnthropicClient {
    client: reqwest::Client,
}

impl AnthropicClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

#[async_trait::async_trait]
impl LLMClient for AnthropicClient {
    async fn chat(&self, messages: Vec<ChatMessage>, config: &ProviderConfig) -> Result<String, LLMError> {
        let api_key = config.api_key.as_ref().ok_or(LLMError::InvalidApiKey)?;
        let api_url = "https://api.anthropic.com/v1/messages";

        // Extract system message if present
        let system_msg = messages.iter()
            .find(|m| m.role == "system")
            .map(|m| m.content.clone());

        let chat_messages: Vec<serde_json::Value> = messages.iter()
            .filter(|m| m.role != "system")
            .map(|m| serde_json::json!({
                "role": m.role,
                "content": m.content
            }))
            .collect();

        let mut body = serde_json::json!({
            "model": config.model,
            "max_tokens": config.max_tokens,
            "messages": chat_messages,
        });

        if let Some(sys) = system_msg {
            body["system"] = serde_json::Value::String(sys);
        }

        let response = self.client
            .post(api_url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| LLMError::NetworkError(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(LLMError::ApiError(error_text));
        }

        let result: serde_json::Value = response.json().await
            .map_err(|e| LLMError::ApiError(e.to_string()))?;

        result["content"][0]["text"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| LLMError::ApiError("Invalid response format".to_string()))
    }

    async fn stream_chat(&self, _messages: Vec<ChatMessage>, _config: &ProviderConfig) -> Result<tokio::sync::mpsc::Receiver<String>, LLMError> {
        Err(LLMError::ApiError("Streaming not implemented".to_string()))
    }
}

/// Create appropriate client for provider
pub fn create_client(provider: &LLMProvider) -> Box<dyn LLMClient> {
    match provider {
        LLMProvider::OpenAI | LLMProvider::Groq | LLMProvider::AzureOpenAI | LLMProvider::Custom | LLMProvider::Ollama => {
            Box::new(OpenAIClient::new())
        }
        LLMProvider::Gemini => Box::new(GeminiClient::new()),
        LLMProvider::Anthropic => Box::new(AnthropicClient::new()),
        LLMProvider::Local => Box::new(OpenAIClient::new()), // Fallback, local uses different path
    }
}
