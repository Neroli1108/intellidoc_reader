import { EditorView, KeyBinding, keymap, Decoration, DecorationSet, WidgetType } from "@codemirror/view";
import { StateField, StateEffect, EditorState } from "@codemirror/state";
import { Extension } from "@codemirror/state";

// Snippet placeholder structure
interface Placeholder {
  id: number;
  from: number;
  to: number;
  defaultText: string;
}

// Snippet session state
interface SnippetSession {
  placeholders: Placeholder[];
  currentIndex: number;
  basePos: number;
}

// State effects for snippet management
const startSnippetEffect = StateEffect.define<SnippetSession>();
const nextPlaceholderEffect = StateEffect.define<void>();
const prevPlaceholderEffect = StateEffect.define<void>();
const exitSnippetEffect = StateEffect.define<void>();

// Parse VSCode-style snippet syntax: ${1:text}, ${2:text}, $0
function parseSnippet(template: string): { text: string; placeholders: Array<{ id: number; from: number; to: number; defaultText: string }> } {
  const placeholders: Array<{ id: number; from: number; to: number; defaultText: string }> = [];
  let text = "";
  let i = 0;

  while (i < template.length) {
    if (template[i] === '$') {
      if (template[i + 1] === '{') {
        // ${n:text} or ${n}
        i += 2;
        let idStr = "";
        while (i < template.length && /\d/.test(template[i])) {
          idStr += template[i];
          i++;
        }
        const id = parseInt(idStr, 10);

        let defaultText = "";
        if (template[i] === ':') {
          i++; // skip ':'
          let depth = 1;
          while (i < template.length && depth > 0) {
            if (template[i] === '{') depth++;
            else if (template[i] === '}') depth--;
            if (depth > 0) {
              defaultText += template[i];
              i++;
            }
          }
        }
        if (template[i] === '}') i++; // skip closing '}'

        const from = text.length;
        text += defaultText;
        const to = text.length;

        placeholders.push({ id, from, to, defaultText });
      } else if (/\d/.test(template[i + 1])) {
        // $n (simple placeholder)
        i++; // skip '$'
        let idStr = "";
        while (i < template.length && /\d/.test(template[i])) {
          idStr += template[i];
          i++;
        }
        const id = parseInt(idStr, 10);
        const from = text.length;
        placeholders.push({ id, from, to: from, defaultText: "" });
      } else {
        text += template[i];
        i++;
      }
    } else if (template[i] === '\\' && i + 1 < template.length) {
      // Escape sequences
      const next = template[i + 1];
      if (next === '$' || next === '{' || next === '}' || next === '\\') {
        text += next;
        i += 2;
      } else {
        text += template[i];
        i++;
      }
    } else {
      text += template[i];
      i++;
    }
  }

  // Sort placeholders by id (but keep $0 at the end)
  placeholders.sort((a, b) => {
    if (a.id === 0) return 1;
    if (b.id === 0) return -1;
    return a.id - b.id;
  });

  return { text, placeholders };
}

// State field to track active snippet session
const snippetSessionField = StateField.define<SnippetSession | null>({
  create() {
    return null;
  },

  update(session, tr) {
    // Handle effects
    for (const effect of tr.effects) {
      if (effect.is(startSnippetEffect)) {
        return effect.value;
      }
      if (effect.is(exitSnippetEffect)) {
        return null;
      }
      if (effect.is(nextPlaceholderEffect) && session) {
        const nextIndex = session.currentIndex + 1;
        if (nextIndex >= session.placeholders.length) {
          return null; // Exit snippet mode
        }
        return { ...session, currentIndex: nextIndex };
      }
      if (effect.is(prevPlaceholderEffect) && session) {
        const prevIndex = Math.max(0, session.currentIndex - 1);
        return { ...session, currentIndex: prevIndex };
      }
    }

    // Update placeholder positions based on document changes
    if (session && tr.docChanged) {
      const updatedPlaceholders = session.placeholders.map(p => ({
        ...p,
        from: tr.changes.mapPos(session.basePos + p.from) - session.basePos,
        to: tr.changes.mapPos(session.basePos + p.to) - session.basePos,
      }));

      // Check if cursor moved outside all placeholders
      const sel = tr.state.selection.main;
      const allOutside = updatedPlaceholders.every(p => {
        const from = session.basePos + p.from;
        const to = session.basePos + p.to;
        return sel.from < from || sel.from > to;
      });

      if (allOutside) {
        return null; // Exit snippet mode
      }

      return { ...session, placeholders: updatedPlaceholders };
    }

    return session;
  },
});

// Decorations for placeholder highlighting
const snippetDecorations = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },

  update(_decorations, tr) {
    const session = tr.state.field(snippetSessionField);
    if (!session) return Decoration.none;

    const decos: any[] = [];
    session.placeholders.forEach((p, index) => {
      const from = session.basePos + p.from;
      const to = session.basePos + p.to;

      if (from <= to && from >= 0 && to <= tr.state.doc.length) {
        const isActive = index === session.currentIndex;
        const className = isActive ? "cm-snippet-placeholder-active" : "cm-snippet-placeholder";

        if (from === to) {
          // Empty placeholder - use widget or line decoration
          decos.push(Decoration.widget({
            widget: new PlaceholderWidget(isActive),
            side: 1,
          }).range(from));
        } else {
          decos.push(Decoration.mark({ class: className }).range(from, to));
        }
      }
    });

    return Decoration.set(decos, true);
  },

  provide: f => EditorView.decorations.from(f),
});

// Widget for empty placeholders
class PlaceholderWidget extends WidgetType {
  constructor(private isActive: boolean) {
    super();
  }

  eq(other: PlaceholderWidget) {
    return this.isActive === other.isActive;
  }

  toDOM() {
    const span = document.createElement("span");
    span.className = this.isActive ? "cm-snippet-placeholder-active" : "cm-snippet-placeholder";
    span.style.display = "inline-block";
    span.style.width = "2px";
    span.style.height = "1em";
    span.style.verticalAlign = "text-bottom";
    return span;
  }

  ignoreEvent() {
    return false;
  }
}

// Insert a snippet at the current cursor position
export function insertSnippet(view: EditorView, template: string): boolean {
  const { text, placeholders } = parseSnippet(template);

  if (placeholders.length === 0) {
    // No placeholders, just insert text
    view.dispatch({
      changes: { from: view.state.selection.main.from, to: view.state.selection.main.to, insert: text },
    });
    return true;
  }

  const from = view.state.selection.main.from;
  const to = view.state.selection.main.to;

  // Start snippet session
  const session: SnippetSession = {
    placeholders,
    currentIndex: 0,
    basePos: from,
  };

  const firstPlaceholder = placeholders[0];

  view.dispatch({
    changes: { from, to, insert: text },
    selection: {
      anchor: from + firstPlaceholder.from,
      head: from + firstPlaceholder.to,
    },
    effects: startSnippetEffect.of(session),
  });

  return true;
}

// Move to next placeholder
function nextPlaceholder(view: EditorView): boolean {
  const session = view.state.field(snippetSessionField);
  if (!session) return false;

  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.placeholders.length) {
    // Exit snippet mode
    view.dispatch({ effects: exitSnippetEffect.of(undefined) });
    return true;
  }

  const nextP = session.placeholders[nextIndex];
  view.dispatch({
    selection: {
      anchor: session.basePos + nextP.from,
      head: session.basePos + nextP.to,
    },
    effects: nextPlaceholderEffect.of(undefined),
  });

  return true;
}

// Move to previous placeholder
function prevPlaceholder(view: EditorView): boolean {
  const session = view.state.field(snippetSessionField);
  if (!session || session.currentIndex === 0) return false;

  const prevIndex = session.currentIndex - 1;
  const prevP = session.placeholders[prevIndex];

  view.dispatch({
    selection: {
      anchor: session.basePos + prevP.from,
      head: session.basePos + prevP.to,
    },
    effects: prevPlaceholderEffect.of(undefined),
  });

  return true;
}

// Exit snippet mode
function exitSnippetMode(view: EditorView): boolean {
  const session = view.state.field(snippetSessionField);
  if (!session) return false;

  view.dispatch({ effects: exitSnippetEffect.of(undefined) });
  return true;
}

// Check if currently in snippet mode
export function isInSnippetMode(state: EditorState): boolean {
  return state.field(snippetSessionField) !== null;
}

// Keymap for snippet navigation
const snippetKeymap: KeyBinding[] = [
  {
    key: "Tab",
    run: nextPlaceholder,
  },
  {
    key: "Shift-Tab",
    run: prevPlaceholder,
  },
  {
    key: "Escape",
    run: exitSnippetMode,
  },
];

// Export snippet extension
export function snippetExtension(): Extension {
  return [
    snippetSessionField,
    snippetDecorations,
    keymap.of(snippetKeymap),
  ];
}

// Export for use in autocomplete
export { parseSnippet };
