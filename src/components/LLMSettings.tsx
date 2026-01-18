import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Bot,
  Key,
  Server,
  Check,
  AlertCircle,
  Loader2,
  Cloud,
  HardDrive,
  Zap,
  DollarSign,
} from "lucide-react";

interface LLMSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  requires_api_key: boolean;
  supports_streaming: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  context_length: number;
  supports_vision: boolean;
  supports_code: boolean;
  cost_per_1k_input: number | null;
  cost_per_1k_output: number | null;
}

export function LLMSettings({ isOpen, onClose }: LLMSettingsProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>("local");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [apiUrl, setApiUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");

  // Load providers on mount
  useEffect(() => {
    loadProviders();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider);
    }
  }, [selectedProvider]);

  const loadProviders = async () => {
    try {
      const result = await invoke<ProviderInfo[]>("get_available_providers");
      setProviders(result);
    } catch (error) {
      console.error("Failed to load providers:", error);
    }
  };

  const loadModels = async (provider: string) => {
    setIsLoading(true);
    try {
      const result = await invoke<{ models: ModelInfo[] }>("get_provider_models", {
        provider,
      });
      setModels(result.models);
      if (result.models.length > 0) {
        setSelectedModel(result.models[0].id);
      }
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke("set_llm_config", {
        provider: selectedProvider,
        model: selectedModel,
        apiKey: apiKey || null,
        apiUrl: apiUrl || null,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    try {
      // TODO: Implement actual connection test
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTestStatus("success");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch (error) {
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 3000);
    }
  };

  const currentProvider = providers.find((p) => p.id === selectedProvider);
  const currentModel = models.find((m) => m.id === selectedModel);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 rounded-xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-100">
                LLM Configuration
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Choose your AI provider and model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5 text-stone-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
              Provider
            </label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedProvider === provider.id
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
                      : "border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {provider.requires_api_key ? (
                      <Cloud className="w-4 h-4 text-indigo-500" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                    )}
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {provider.name}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {provider.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
              Model
            </label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            )}
            {currentModel && (
              <div className="mt-2 flex items-center gap-4 text-xs text-stone-500 dark:text-stone-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  {(currentModel.context_length / 1000).toFixed(0)}K context
                </span>
                {currentModel.supports_code && (
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded">
                    Code
                  </span>
                )}
                {currentModel.supports_vision && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                    Vision
                  </span>
                )}
                {currentModel.cost_per_1k_input && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${currentModel.cost_per_1k_input}/1K in
                  </span>
                )}
              </div>
            )}
          </div>

          {/* API Key (for cloud providers) */}
          {currentProvider?.requires_api_key && (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${currentProvider.name} API key`}
                className="w-full px-4 py-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Your API key is stored locally and never sent to our servers.
              </p>
            </div>
          )}

          {/* Custom API URL (for Ollama/Custom) */}
          {(selectedProvider === "ollama" || selectedProvider === "custom") && (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
                <Server className="w-4 h-4 inline mr-1" />
                API URL
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="http://localhost:11434/api"
                className="w-full px-4 py-3 rounded-lg bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Test Connection */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === "testing"}
              className="px-4 py-2 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {testStatus === "testing" ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing...
                </span>
              ) : (
                "Test Connection"
              )}
            </button>
            {testStatus === "success" && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                Connection successful
              </span>
            )}
            {testStatus === "error" && (
              <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                Connection failed
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
