import { create } from "zustand";
import { persist } from "zustand/middleware";

type LLMProvider = "local" | "ollama" | "openai" | "gemini" | "anthropic" | "groq" | "custom";

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string | null;
  apiUrl: string | null;
  maxTokens: number;
  temperature: number;
}

interface SettingsStore {
  // Appearance
  theme: "light" | "dark";
  fontSize: number;
  fontFamily: string;
  
  // UI
  showOutline: boolean;
  showChat: boolean;
  
  // Annotations
  defaultHighlightColor: "yellow" | "green" | "blue" | "purple" | "red";
  autoSaveAnnotations: boolean;
  
  // LLM Configuration
  llmConfig: LLMConfig;
  defaultQueryMode: "quick" | "explain";
  preferredCodeLanguage: string;
  
  // PDF Editor
  defaultEditorTool: string;
  editorStrokeWidth: number;
  editorFontSize: number;
  
  // Actions
  toggleTheme: () => void;
  setTheme: (theme: "light" | "dark") => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setShowOutline: (show: boolean) => void;
  setShowChat: (show: boolean) => void;
  setDefaultHighlightColor: (color: "yellow" | "green" | "blue" | "purple" | "red") => void;
  setAutoSaveAnnotations: (autoSave: boolean) => void;
  setLLMConfig: (config: Partial<LLMConfig>) => void;
  setDefaultQueryMode: (mode: "quick" | "explain") => void;
  setPreferredCodeLanguage: (language: string) => void;
  setDefaultEditorTool: (tool: string) => void;
  setEditorStrokeWidth: (width: number) => void;
  setEditorFontSize: (size: number) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Default values
      theme: "dark",
      fontSize: 16,
      fontFamily: "Inter",
      showOutline: true,
      showChat: true,
      defaultHighlightColor: "yellow",
      autoSaveAnnotations: true,
      llmConfig: {
        provider: "local",
        model: "mistral-7b-instruct",
        apiKey: null,
        apiUrl: null,
        maxTokens: 2048,
        temperature: 0.7,
      },
      defaultQueryMode: "explain",
      preferredCodeLanguage: "python",
      defaultEditorTool: "select",
      editorStrokeWidth: 2,
      editorFontSize: 12,
      
      // Actions
      toggleTheme: () => set((state) => ({
        theme: state.theme === "light" ? "dark" : "light"
      })),
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setShowOutline: (showOutline) => set({ showOutline }),
      setShowChat: (showChat) => set({ showChat }),
      setDefaultHighlightColor: (defaultHighlightColor) => set({ defaultHighlightColor }),
      setAutoSaveAnnotations: (autoSaveAnnotations) => set({ autoSaveAnnotations }),
      setLLMConfig: (config) => set((state) => ({
        llmConfig: { ...state.llmConfig, ...config }
      })),
      setDefaultQueryMode: (defaultQueryMode) => set({ defaultQueryMode }),
      setPreferredCodeLanguage: (preferredCodeLanguage) => set({ preferredCodeLanguage }),
      setDefaultEditorTool: (defaultEditorTool) => set({ defaultEditorTool }),
      setEditorStrokeWidth: (editorStrokeWidth) => set({ editorStrokeWidth }),
      setEditorFontSize: (editorFontSize) => set({ editorFontSize }),
    }),
    {
      name: "intellidoc-settings",
    }
  )
);
