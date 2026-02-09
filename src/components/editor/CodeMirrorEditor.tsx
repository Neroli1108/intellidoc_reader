import { useCallback, useEffect, useMemo, useRef } from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { closeBrackets } from "@codemirror/autocomplete";
import { history, historyKeymap } from "@codemirror/commands";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { bracketMatching } from "@codemirror/language";

import { getTheme } from "./editor-theme";
import { createLatexAutocomplete } from "./latex-autocomplete";
import { snippetExtension } from "./snippet-engine";
import { createVimExtension, initializeVim } from "./vim-config";
import { FloatingVimModeIndicator } from "./VimModeIndicator";
import { useEditorStore, type VimMode } from "../../stores/editorStore";
import { useSettingsStore } from "../../stores/settingsStore";

export type EditorLanguage = "latex" | "markdown" | "text";

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  vimEnabled?: boolean;
  autoCompleteEnabled?: boolean;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  readOnly?: boolean;
}

// Initialize vim once when module loads
let vimInitialized = false;

export function CodeMirrorEditor({
  value,
  onChange,
  language = "latex",
  vimEnabled,
  autoCompleteEnabled,
  placeholder,
  className = "",
  minHeight = "200px",
  maxHeight,
  readOnly = false,
}: CodeMirrorEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get state from stores
  const theme = useSettingsStore((state) => state.theme);
  const settingsVimEnabled = useSettingsStore((state) => state.vimModeEnabled);
  const settingsAutoComplete = useSettingsStore((state) => state.autoCompleteEnabled);

  const {
    vimMode,
    setVimMode,
    recentCompletions,
    documentLabels,
    documentCitations,
    userMacros,
    scanDocumentForCompletions,
  } = useEditorStore();

  // Use props if provided, otherwise fall back to settings
  const isVimEnabled = vimEnabled ?? settingsVimEnabled ?? false;
  const isAutoCompleteEnabled = autoCompleteEnabled ?? settingsAutoComplete ?? true;

  // Initialize vim configuration
  useEffect(() => {
    if (!vimInitialized && isVimEnabled) {
      initializeVim();
      vimInitialized = true;
    }
  }, [isVimEnabled]);

  // Scan document for completions when content changes significantly
  useEffect(() => {
    if (language === "latex" && value.length > 0) {
      // Debounce the scan
      const timer = setTimeout(() => {
        scanDocumentForCompletions(value);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [value, language, scanDocumentForCompletions]);

  // Handle vim mode changes
  const handleVimModeChange = useCallback(
    (mode: VimMode) => {
      setVimMode(mode);
    },
    [setVimMode]
  );

  // Build extensions based on configuration
  const extensions = useMemo(() => {
    const exts: Extension[] = [
      // Basic editor setup
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      bracketMatching(),
      closeBrackets(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),

      // Line wrapping
      EditorView.lineWrapping,

      // Theme
      getTheme(theme === "dark"),
    ];

    // Language support
    if (language === "markdown" || language === "latex") {
      exts.push(markdown());
    }

    // LaTeX autocomplete
    if (isAutoCompleteEnabled && (language === "latex" || language === "markdown")) {
      exts.push(
        createLatexAutocomplete({
          recentCompletions,
          documentLabels,
          documentCitations,
          userMacros,
        })
      );
      exts.push(snippetExtension());
    }

    // Vim mode
    if (isVimEnabled) {
      exts.push(createVimExtension(handleVimModeChange));
    }

    // Read-only mode
    if (readOnly) {
      exts.push(EditorView.editable.of(false));
    }

    return exts;
  }, [
    theme,
    language,
    isVimEnabled,
    isAutoCompleteEnabled,
    readOnly,
    handleVimModeChange,
    recentCompletions,
    documentLabels,
    documentCitations,
    userMacros,
  ]);

  // Handle value changes
  const handleChange = useCallback(
    (val: string) => {
      onChange(val);
    },
    [onChange]
  );

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden border border-stone-300 dark:border-stone-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent ${className}`}
      style={{ minHeight, maxHeight }}
    >
      <CodeMirror
        ref={editorRef}
        value={value}
        onChange={handleChange}
        extensions={extensions}
        placeholder={placeholder}
        basicSetup={false}
        className="h-full"
        style={{ minHeight, maxHeight, overflow: "auto" }}
      />

      {/* Vim mode indicator */}
      {isVimEnabled && <FloatingVimModeIndicator mode={vimMode} />}
    </div>
  );
}

// Export a simpler version for quick use
interface SimpleEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SimpleLatexEditor({ value, onChange, placeholder, className }: SimpleEditorProps) {
  return (
    <CodeMirrorEditor
      value={value}
      onChange={onChange}
      language="latex"
      placeholder={placeholder}
      className={className}
    />
  );
}

export function SimpleMarkdownEditor({ value, onChange, placeholder, className }: SimpleEditorProps) {
  return (
    <CodeMirrorEditor
      value={value}
      onChange={onChange}
      language="markdown"
      placeholder={placeholder}
      className={className}
    />
  );
}
