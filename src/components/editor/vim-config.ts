import { vim, Vim, getCM } from "@replit/codemirror-vim";
import { Extension } from "@codemirror/state";
import { EditorView, ViewUpdate } from "@codemirror/view";
import type { VimMode } from "../../stores/editorStore";

// Map vim mode strings to our VimMode type
function mapVimMode(mode: string): VimMode {
  switch (mode) {
    case "normal":
      return "NORMAL";
    case "insert":
      return "INSERT";
    case "visual":
      return "VISUAL";
    case "visual line":
    case "visual-line":
      return "VISUAL_LINE";
    case "replace":
      return "REPLACE";
    default:
      return "NORMAL";
  }
}

// Callback type for mode changes
type VimModeCallback = (mode: VimMode) => void;

// Create vim extension with mode change listener
export function createVimExtension(onModeChange?: VimModeCallback): Extension {
  const extensions: Extension[] = [vim()];

  // Add mode change listener via update listener
  if (onModeChange) {
    extensions.push(
      EditorView.updateListener.of((update: ViewUpdate) => {
        const cm = getCM(update.view);
        if (cm) {
          const vimState = cm.state.vim;
          if (vimState) {
            const mode = vimState.mode || "normal";
            const subMode = vimState.visualLine ? "visual line" : "";
            const mappedMode = mapVimMode(subMode || mode);
            onModeChange(mappedMode);
          }
        }
      })
    );
  }

  return extensions;
}

// Configure vim with custom settings
export function configureVim() {
  // Custom key mappings
  // jk to exit insert mode (common vim mapping)
  Vim.map("jk", "<Esc>", "insert");

  // Improve search experience
  Vim.defineOption("ignorecase", true, "boolean");
  Vim.defineOption("smartcase", true, "boolean");
  Vim.defineOption("incsearch", true, "boolean");
  Vim.defineOption("hlsearch", true, "boolean");

  // Better indentation
  Vim.defineOption("tabstop", 2, "number");
  Vim.defineOption("shiftwidth", 2, "number");
  Vim.defineOption("expandtab", true, "boolean");
}

// Clipboard helpers using modern Clipboard API
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    // Fallback to execCommand
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch (fallbackErr) {
      console.error("Fallback copy failed:", fallbackErr);
      return false;
    }
  }
}

// Register clipboard commands with vim
export function setupClipboardIntegration() {
  // Override yank to use system clipboard using the correct API
  // The defineRegister expects a specific structure
  try {
    // Use a simpler approach - just define a custom operator for clipboard
    Vim.defineOperator("clipboardYank", function(_cm: any, args: any) {
      const text = args.selectedText || "";
      if (text) {
        copyToClipboard(text);
      }
    });
  } catch (e) {
    // Silently fail if API doesn't match expected
    console.debug("Clipboard integration setup skipped:", e);
  }
}

// Handle Escape key properly with autocomplete
export function createEscapeHandler(
  _view: EditorView,
  isAutocompleteOpen: () => boolean,
  closeAutocomplete: () => void
): boolean {
  // If autocomplete is open, close it first
  if (isAutocompleteOpen()) {
    closeAutocomplete();
    return true;
  }

  // Otherwise, let vim handle it (return to NORMAL mode)
  return false;
}

// Get current vim mode from editor view
export function getVimMode(view: EditorView): VimMode {
  const cm = getCM(view);
  if (cm) {
    const vimState = cm.state.vim;
    if (vimState) {
      const mode = vimState.mode || "normal";
      const subMode = vimState.visualLine ? "visual line" : "";
      return mapVimMode(subMode || mode);
    }
  }
  return "NORMAL";
}

// Execute a vim command programmatically
export function executeVimCommand(view: EditorView, command: string) {
  const cm = getCM(view);
  if (cm) {
    try {
      // Use type assertion since the API types may not be exact
      (Vim as any).handleEx(cm, command);
    } catch (e) {
      console.debug("Vim command execution failed:", e);
    }
  }
}

// Initialize vim configuration
export function initializeVim() {
  configureVim();
  setupClipboardIntegration();
}

// Export types
export type { VimModeCallback };
