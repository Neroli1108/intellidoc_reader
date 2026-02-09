import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// Light theme colors (stone palette)
const lightColors = {
  background: "#ffffff",
  foreground: "#1c1917",
  selection: "rgba(99, 102, 241, 0.2)",
  cursor: "#1c1917",
  cursorLine: "#fafaf9",
  lineNumber: "#a8a29e",
  lineNumberActive: "#57534e",
  comment: "#78716c",
  keyword: "#7c3aed",
  string: "#059669",
  number: "#d97706",
  operator: "#dc2626",
  function: "#2563eb",
  variable: "#1c1917",
  type: "#0891b2",
  bracket: "#57534e",
  error: "#dc2626",
  // LaTeX specific
  command: "#7c3aed",
  mathDelimiter: "#d97706",
  environment: "#059669",
};

// Dark theme colors (stone dark palette)
const darkColors = {
  background: "#1c1917",
  foreground: "#fafaf9",
  selection: "rgba(99, 102, 241, 0.3)",
  cursor: "#fafaf9",
  cursorLine: "#292524",
  lineNumber: "#78716c",
  lineNumberActive: "#a8a29e",
  comment: "#a8a29e",
  keyword: "#a78bfa",
  string: "#34d399",
  number: "#fbbf24",
  operator: "#f87171",
  function: "#60a5fa",
  variable: "#fafaf9",
  type: "#22d3ee",
  bracket: "#a8a29e",
  error: "#f87171",
  // LaTeX specific
  command: "#a78bfa",
  mathDelimiter: "#fbbf24",
  environment: "#34d399",
};

// Create editor theme
function createEditorTheme(isDark: boolean): Extension {
  const colors = isDark ? darkColors : lightColors;

  return EditorView.theme({
    "&": {
      color: colors.foreground,
      backgroundColor: colors.background,
      fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, Consolas, monospace',
      fontSize: "14px",
    },
    ".cm-content": {
      caretColor: colors.cursor,
      padding: "16px 0",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: colors.cursor,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: colors.selection,
    },
    ".cm-activeLine": {
      backgroundColor: colors.cursorLine,
    },
    ".cm-gutters": {
      backgroundColor: colors.background,
      color: colors.lineNumber,
      border: "none",
      paddingRight: "8px",
    },
    ".cm-activeLineGutter": {
      backgroundColor: colors.cursorLine,
      color: colors.lineNumberActive,
    },
    ".cm-lineNumbers .cm-gutterElement": {
      padding: "0 8px 0 16px",
      minWidth: "40px",
    },
    ".cm-foldGutter": {
      padding: "0 4px",
    },
    // Autocomplete popup
    ".cm-tooltip": {
      backgroundColor: isDark ? "#292524" : "#ffffff",
      border: `1px solid ${isDark ? "#44403c" : "#e7e5e4"}`,
      borderRadius: "8px",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      overflow: "hidden",
    },
    ".cm-tooltip-autocomplete": {
      "& > ul": {
        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
        fontSize: "13px",
        maxHeight: "300px",
        maxWidth: "400px",
      },
      "& > ul > li": {
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      },
      "& > ul > li[aria-selected]": {
        backgroundColor: isDark ? "#44403c" : "#f5f5f4",
        color: colors.foreground,
      },
    },
    ".cm-completionIcon": {
      width: "20px",
      height: "20px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      opacity: 0.7,
    },
    ".cm-completionLabel": {
      flex: 1,
    },
    ".cm-completionDetail": {
      fontSize: "11px",
      color: colors.comment,
      marginLeft: "8px",
    },
    ".cm-completionMatchedText": {
      color: "#6366f1",
      fontWeight: "600",
    },
    // Snippet placeholders
    ".cm-snippet-placeholder": {
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.3)" : "rgba(99, 102, 241, 0.2)",
      borderRadius: "2px",
      border: `1px solid ${isDark ? "#818cf8" : "#6366f1"}`,
    },
    ".cm-snippet-placeholder-active": {
      backgroundColor: isDark ? "rgba(99, 102, 241, 0.5)" : "rgba(99, 102, 241, 0.35)",
      outline: `2px solid ${isDark ? "#818cf8" : "#6366f1"}`,
      outlineOffset: "1px",
    },
    // Search
    ".cm-searchMatch": {
      backgroundColor: isDark ? "rgba(251, 191, 36, 0.3)" : "rgba(251, 191, 36, 0.4)",
      outline: `1px solid ${isDark ? "#fbbf24" : "#d97706"}`,
    },
    ".cm-searchMatch-selected": {
      backgroundColor: isDark ? "rgba(251, 191, 36, 0.5)" : "rgba(251, 191, 36, 0.6)",
    },
    // Vim specific
    ".cm-fat-cursor": {
      backgroundColor: isDark ? "rgba(250, 250, 249, 0.7)" : "rgba(28, 25, 23, 0.7)",
      color: isDark ? "#1c1917" : "#fafaf9",
    },
    "&:not(.cm-focused) .cm-fat-cursor": {
      backgroundColor: "transparent",
      outline: `1px solid ${colors.cursor}`,
    },
    // Vim visual mode selection
    ".cm-vim-visual .cm-selectionBackground": {
      backgroundColor: isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(168, 85, 247, 0.3)",
    },
  }, { dark: isDark });
}

// Syntax highlighting for light theme
const lightHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: lightColors.keyword, fontWeight: "500" },
  { tag: tags.comment, color: lightColors.comment, fontStyle: "italic" },
  { tag: tags.string, color: lightColors.string },
  { tag: tags.number, color: lightColors.number },
  { tag: tags.operator, color: lightColors.operator },
  { tag: tags.function(tags.variableName), color: lightColors.function },
  { tag: tags.variableName, color: lightColors.variable },
  { tag: tags.typeName, color: lightColors.type },
  { tag: tags.bracket, color: lightColors.bracket },
  { tag: tags.invalid, color: lightColors.error },
  { tag: tags.definition(tags.variableName), color: lightColors.function, fontWeight: "500" },
  { tag: tags.processingInstruction, color: lightColors.command }, // LaTeX commands
  { tag: tags.meta, color: lightColors.mathDelimiter }, // Math delimiters
  { tag: tags.labelName, color: lightColors.environment }, // Environment names
]);

// Syntax highlighting for dark theme
const darkHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: darkColors.keyword, fontWeight: "500" },
  { tag: tags.comment, color: darkColors.comment, fontStyle: "italic" },
  { tag: tags.string, color: darkColors.string },
  { tag: tags.number, color: darkColors.number },
  { tag: tags.operator, color: darkColors.operator },
  { tag: tags.function(tags.variableName), color: darkColors.function },
  { tag: tags.variableName, color: darkColors.variable },
  { tag: tags.typeName, color: darkColors.type },
  { tag: tags.bracket, color: darkColors.bracket },
  { tag: tags.invalid, color: darkColors.error },
  { tag: tags.definition(tags.variableName), color: darkColors.function, fontWeight: "500" },
  { tag: tags.processingInstruction, color: darkColors.command }, // LaTeX commands
  { tag: tags.meta, color: darkColors.mathDelimiter }, // Math delimiters
  { tag: tags.labelName, color: darkColors.environment }, // Environment names
]);

// Export theme extensions
export const lightTheme: Extension = [
  createEditorTheme(false),
  syntaxHighlighting(lightHighlightStyle),
];

export const darkTheme: Extension = [
  createEditorTheme(true),
  syntaxHighlighting(darkHighlightStyle),
];

export function getTheme(isDark: boolean): Extension {
  return isDark ? darkTheme : lightTheme;
}
