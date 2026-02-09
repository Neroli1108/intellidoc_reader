// Main editor component
export { CodeMirrorEditor, SimpleLatexEditor, SimpleMarkdownEditor } from "./CodeMirrorEditor";
export type { EditorLanguage } from "./CodeMirrorEditor";

// Vim components
export { VimModeIndicator, FloatingVimModeIndicator, VimModeIndicatorCompact } from "./VimModeIndicator";
export { VimShortcutsPanel, VimShortcutsHint } from "./VimShortcutsPanel";

// Utilities
export { getTheme, lightTheme, darkTheme } from "./editor-theme";
export { createLatexAutocomplete } from "./latex-autocomplete";
export { snippetExtension, insertSnippet, isInSnippetMode } from "./snippet-engine";
export { createVimExtension, initializeVim, getVimMode, executeVimCommand } from "./vim-config";
