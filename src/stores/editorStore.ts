import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'VISUAL_LINE' | 'REPLACE';

interface EditorState {
  // Vim state
  vimMode: VimMode;

  // Autocomplete state
  recentCompletions: string[];
  documentLabels: string[];
  documentCitations: string[];
  userMacros: Record<string, string>;

  // Actions
  setVimMode: (mode: VimMode) => void;
  addRecentCompletion: (completion: string) => void;
  setDocumentLabels: (labels: string[]) => void;
  setDocumentCitations: (citations: string[]) => void;
  addUserMacro: (name: string, definition: string) => void;
  clearUserMacros: () => void;
  scanDocumentForCompletions: (content: string) => void;
}

// Extract labels from LaTeX content (\label{...})
function extractLabels(content: string): string[] {
  const labelRegex = /\\label\{([^}]+)\}/g;
  const labels: string[] = [];
  let match;
  while ((match = labelRegex.exec(content)) !== null) {
    labels.push(match[1]);
  }
  return [...new Set(labels)];
}

// Extract citations from LaTeX content (from .bib files or \bibitem)
function extractCitations(content: string): string[] {
  const bibitemRegex = /\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g;
  const citations: string[] = [];
  let match;
  while ((match = bibitemRegex.exec(content)) !== null) {
    citations.push(match[1]);
  }
  return [...new Set(citations)];
}

// Extract user-defined macros (\newcommand, \renewcommand, \def)
function extractMacros(content: string): Record<string, string> {
  const macros: Record<string, string> = {};

  // \newcommand{\name}[args]{definition} or \newcommand\name[args]{definition}
  const newcommandRegex = /\\(?:re)?newcommand\*?\{?\\([a-zA-Z]+)\}?(?:\[\d+\])?\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  let match;
  while ((match = newcommandRegex.exec(content)) !== null) {
    macros[`\\${match[1]}`] = match[2];
  }

  // \def\name{definition}
  const defRegex = /\\def\\([a-zA-Z]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
  while ((match = defRegex.exec(content)) !== null) {
    macros[`\\${match[1]}`] = match[2];
  }

  return macros;
}

export const useEditorStore = create<EditorState>()(
  persist(
    (set) => ({
      // Initial state
      vimMode: 'NORMAL',
      recentCompletions: [],
      documentLabels: [],
      documentCitations: [],
      userMacros: {},

      // Actions
      setVimMode: (mode) => set({ vimMode: mode }),

      addRecentCompletion: (completion) => set((state) => {
        const filtered = state.recentCompletions.filter(c => c !== completion);
        const updated = [completion, ...filtered].slice(0, 50); // Keep last 50
        return { recentCompletions: updated };
      }),

      setDocumentLabels: (labels) => set({ documentLabels: labels }),

      setDocumentCitations: (citations) => set({ documentCitations: citations }),

      addUserMacro: (name, definition) => set((state) => ({
        userMacros: { ...state.userMacros, [name]: definition }
      })),

      clearUserMacros: () => set({ userMacros: {} }),

      scanDocumentForCompletions: (content) => {
        const labels = extractLabels(content);
        const citations = extractCitations(content);
        const macros = extractMacros(content);

        set({
          documentLabels: labels,
          documentCitations: citations,
          userMacros: macros,
        });
      },
    }),
    {
      name: "intellidoc-editor",
      partialize: (state) => ({
        recentCompletions: state.recentCompletions,
      }),
    }
  )
);
