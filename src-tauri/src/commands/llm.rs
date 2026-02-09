//! LLM-related Tauri commands

use crate::error::AppError;
use crate::llm::prompts;
use crate::llm::{CodeGenerationRequest, CodeSnippet, LlmResponse, ModelStatus, QueryMode};
use crate::llm::providers::{
    create_client, get_available_models, AvailableModels, ChatMessage, LLMProvider, ProviderConfig,
};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, State};

/// Application-wide LLM state
pub struct LLMState {
    config: Mutex<ProviderConfig>,
}

impl LLMState {
    pub fn new() -> Self {
        Self {
            config: Mutex::new(ProviderConfig::from_env()),
        }
    }
}

/// Current LLM configuration for serialization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMConfig {
    pub provider: LLMProvider,
    pub config: ProviderConfig,
}

/// Helper: build messages and call the LLM
async fn call_llm(
    config: &ProviderConfig,
    system_prompt: &str,
    context: &str,
    user_query: &str,
) -> Result<(String, u64), AppError> {
    tracing::info!(
        "LLM call: provider={:?}, model={}, has_key={}",
        config.provider,
        config.model,
        config.api_key.is_some()
    );

    let client = create_client(&config.provider);

    let messages = vec![
        ChatMessage {
            role: "system".to_string(),
            content: system_prompt.to_string(),
        },
        ChatMessage {
            role: "user".to_string(),
            content: prompts::build_prompt("", context, user_query),
        },
    ];

    let start = Instant::now();
    let answer = client.chat(messages, config).await.map_err(|e| {
        tracing::error!("LLM call failed: {}", e);
        crate::error::LlmError::InferenceError(e.to_string())
    })?;
    let elapsed = start.elapsed().as_millis() as u64;

    tracing::info!("LLM response received in {}ms ({} chars)", elapsed, answer.len());
    Ok((answer, elapsed))
}

/// Query the LLM with a question about the document
#[tauri::command]
pub async fn query_llm(
    _app: AppHandle,
    state: State<'_, LLMState>,
    question: String,
    context: String,
    mode: QueryMode,
) -> Result<LlmResponse, AppError> {
    tracing::info!("LLM query in {:?} mode: {}", mode, question);

    let config = state.config.lock().unwrap().clone();

    let system_prompt = match mode {
        QueryMode::QuickAnswer => prompts::QA_PROMPT,
        QueryMode::Explain => prompts::PROFESSOR_PROMPT,
        QueryMode::Summarize => prompts::SUMMARIZE_PROMPT,
        QueryMode::GenerateCode => prompts::CODE_GENERATOR_PROMPT,
    };

    let (answer, elapsed) = call_llm(&config, system_prompt, &context, &question).await?;

    Ok(LlmResponse {
        answer,
        tokens_used: 0, // Token counting is provider-specific
        inference_time_ms: elapsed,
    })
}

/// Get a detailed explanation of selected text (Professor Mode)
#[tauri::command]
pub async fn explain_text(
    _app: AppHandle,
    state: State<'_, LLMState>,
    text: String,
    document_context: String,
) -> Result<LlmResponse, AppError> {
    tracing::info!("Explaining text: {}...", &text[..text.len().min(50)]);

    let config = state.config.lock().unwrap().clone();
    let query = format!("Please explain the following text in detail:\n\n\"{}\"", text);
    let (answer, elapsed) =
        call_llm(&config, prompts::PROFESSOR_PROMPT, &document_context, &query).await?;

    Ok(LlmResponse {
        answer,
        tokens_used: 0,
        inference_time_ms: elapsed,
    })
}

/// Generate code implementation for CS papers
#[tauri::command]
pub async fn generate_code(
    _app: AppHandle,
    state: State<'_, LLMState>,
    request: CodeGenerationRequest,
) -> Result<CodeSnippet, AppError> {
    tracing::info!(
        "Generating {} code for: {}",
        request.language,
        request.description
    );

    let config = state.config.lock().unwrap().clone();
    let query = format!(
        "Generate a {} implementation for: {}\n\nFramework: {}\nSection reference: {}",
        request.language,
        request.description,
        request.framework.as_deref().unwrap_or("none"),
        request.section_reference.as_deref().unwrap_or("general"),
    );

    let (code, _elapsed) =
        call_llm(&config, prompts::CODE_GENERATOR_PROMPT, &request.context, &query).await?;

    Ok(CodeSnippet {
        language: request.language,
        framework: request.framework,
        code,
        description: request.description,
        section_reference: request.section_reference,
    })
}

/// Get the current status of the LLM model
#[tauri::command]
pub async fn get_model_status(
    _app: AppHandle,
    state: State<'_, LLMState>,
) -> Result<ModelStatus, AppError> {
    let config = state.config.lock().unwrap();
    Ok(ModelStatus {
        loaded: config.api_key.is_some() || config.provider == LLMProvider::Bedrock || config.provider == LLMProvider::Ollama,
        model_name: Some(config.model.clone()),
        model_size_mb: None,
        vram_usage_mb: None,
        context_length: None,
    })
}

/// Get list of available LLM providers
#[tauri::command]
pub async fn get_available_providers() -> Result<Vec<ProviderInfo>, AppError> {
    Ok(vec![
        ProviderInfo {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            description: "GPT-4o, GPT-4o Mini, GPT-4 Turbo".to_string(),
            requires_api_key: true,
            supports_streaming: true,
        },
        ProviderInfo {
            id: "bedrock".to_string(),
            name: "AWS Bedrock".to_string(),
            description: "Claude, Titan, Llama, Mistral via AWS".to_string(),
            requires_api_key: false,
            supports_streaming: true,
        },
        ProviderInfo {
            id: "anthropic".to_string(),
            name: "Anthropic Claude".to_string(),
            description: "Claude 3.5 Sonnet, Opus, Haiku".to_string(),
            requires_api_key: true,
            supports_streaming: true,
        },
        ProviderInfo {
            id: "gemini".to_string(),
            name: "Google Gemini".to_string(),
            description: "Gemini 1.5 Pro, Flash, 2.0".to_string(),
            requires_api_key: true,
            supports_streaming: true,
        },
        ProviderInfo {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            description: "Ultra-fast inference (Llama, Mixtral)".to_string(),
            requires_api_key: true,
            supports_streaming: true,
        },
        ProviderInfo {
            id: "ollama".to_string(),
            name: "Ollama".to_string(),
            description: "Local Ollama server".to_string(),
            requires_api_key: false,
            supports_streaming: true,
        },
    ])
}

/// Provider information for UI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    pub requires_api_key: bool,
    pub supports_streaming: bool,
}

/// Get available models for a provider
#[tauri::command]
pub async fn get_provider_models(provider: String) -> Result<AvailableModels, AppError> {
    let llm_provider = parse_provider(&provider);
    Ok(get_available_models(&llm_provider))
}

/// Set LLM configuration
#[tauri::command]
pub async fn set_llm_config(
    _app: AppHandle,
    state: State<'_, LLMState>,
    provider: String,
    model: String,
    api_key: Option<String>,
    api_url: Option<String>,
) -> Result<(), AppError> {
    tracing::info!("Setting LLM config: provider={}, model={}", provider, model);

    let llm_provider = parse_provider(&provider);

    // Resolve API key: use provided key, or fall back to env var
    let resolved_key = api_key.or_else(|| match llm_provider {
        LLMProvider::OpenAI => std::env::var("OPENAI_API_KEY").ok(),
        LLMProvider::Anthropic => std::env::var("ANTHROPIC_API_KEY").ok(),
        LLMProvider::Gemini => std::env::var("GEMINI_API_KEY").ok(),
        LLMProvider::Groq => std::env::var("GROQ_API_KEY").ok(),
        _ => None,
    });

    let config = ProviderConfig {
        provider: llm_provider,
        api_key: resolved_key,
        api_url,
        model,
        ..Default::default()
    };

    *state.config.lock().unwrap() = config;
    tracing::info!("LLM config updated successfully");

    Ok(())
}

/// Get current LLM configuration
#[tauri::command]
pub async fn get_llm_config(
    _app: AppHandle,
    state: State<'_, LLMState>,
) -> Result<LLMConfig, AppError> {
    let config = state.config.lock().unwrap().clone();
    // Return config with API key redacted for security
    let mut safe_config = config.clone();
    if let Some(ref key) = safe_config.api_key {
        if key.len() > 8 {
            safe_config.api_key = Some(format!("{}...{}", &key[..4], &key[key.len()-4..]));
        }
    }
    Ok(LLMConfig {
        provider: safe_config.provider.clone(),
        config: safe_config,
    })
}

/// Test the LLM connection
#[tauri::command]
pub async fn test_llm_connection(
    _app: AppHandle,
    state: State<'_, LLMState>,
) -> Result<String, AppError> {
    tracing::info!("Testing LLM connection...");

    let config = state.config.lock().unwrap().clone();
    let client = create_client(&config.provider);

    let messages = vec![ChatMessage {
        role: "user".to_string(),
        content: "Say 'Connection successful!' in exactly those words.".to_string(),
    }];

    let start = Instant::now();
    let result = client
        .chat(messages, &config)
        .await
        .map_err(|e| crate::error::LlmError::InferenceError(e.to_string()))?;
    let elapsed = start.elapsed().as_millis();

    Ok(format!(
        "Connected to {} ({}) in {}ms. Response: {}",
        format!("{:?}", config.provider),
        config.model,
        elapsed,
        &result[..result.len().min(100)]
    ))
}

fn parse_provider(provider: &str) -> LLMProvider {
    match provider.to_lowercase().as_str() {
        "openai" => LLMProvider::OpenAI,
        "bedrock" => LLMProvider::Bedrock,
        "gemini" => LLMProvider::Gemini,
        "anthropic" => LLMProvider::Anthropic,
        "groq" => LLMProvider::Groq,
        "ollama" => LLMProvider::Ollama,
        "local" => LLMProvider::Local,
        _ => LLMProvider::OpenAI,
    }
}
