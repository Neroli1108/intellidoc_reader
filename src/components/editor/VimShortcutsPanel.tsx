import { useState } from "react";
import { ChevronDown, ChevronUp, Keyboard } from "lucide-react";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ keys: string; description: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: "h / j / k / l", description: "Left / Down / Up / Right" },
      { keys: "w / b / e", description: "Next word / Back word / End of word" },
      { keys: "0 / ^ / $", description: "Line start / First char / Line end" },
      { keys: "gg / G", description: "File start / File end" },
      { keys: "{ / }", description: "Previous / Next paragraph" },
      { keys: "Ctrl-d / Ctrl-u", description: "Half page down / up" },
      { keys: "% ", description: "Jump to matching bracket" },
    ],
  },
  {
    title: "Editing",
    shortcuts: [
      { keys: "i / a", description: "Insert before / after cursor" },
      { keys: "I / A", description: "Insert at line start / end" },
      { keys: "o / O", description: "New line below / above" },
      { keys: "x / X", description: "Delete char forward / back" },
      { keys: "dd / yy / p", description: "Delete line / Yank line / Paste" },
      { keys: "d{motion}", description: "Delete (dw, d$, diw, etc.)" },
      { keys: "c{motion}", description: "Change (cw, c$, ciw, etc.)" },
      { keys: "u / Ctrl-r", description: "Undo / Redo" },
      { keys: ".", description: "Repeat last change" },
    ],
  },
  {
    title: "Visual Mode",
    shortcuts: [
      { keys: "v", description: "Start visual (char)" },
      { keys: "V", description: "Start visual (line)" },
      { keys: "Ctrl-v", description: "Start visual (block)" },
      { keys: "y / d / c", description: "Yank / Delete / Change selection" },
      { keys: "> / <", description: "Indent / Outdent selection" },
    ],
  },
  {
    title: "Search & Replace",
    shortcuts: [
      { keys: "/pattern", description: "Search forward" },
      { keys: "?pattern", description: "Search backward" },
      { keys: "n / N", description: "Next / Previous match" },
      { keys: "* / #", description: "Search word under cursor" },
      { keys: ":s/old/new/g", description: "Replace in line" },
      { keys: ":%s/old/new/g", description: "Replace in file" },
    ],
  },
  {
    title: "Text Objects",
    shortcuts: [
      { keys: "iw / aw", description: "Inner / A word" },
      { keys: 'i" / a"', description: "Inner / A quoted string" },
      { keys: "i( / a(", description: "Inner / A parentheses" },
      { keys: "i{ / a{", description: "Inner / A braces" },
      { keys: "it / at", description: "Inner / A HTML tag" },
    ],
  },
];

interface VimShortcutsPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export function VimShortcutsPanel({ collapsed = false, onToggle }: VimShortcutsPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Navigation", "Editing"]));

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
        title="Show Vim Shortcuts"
      >
        <Keyboard className="w-4 h-4" />
        <span>Vim Shortcuts</span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Keyboard className="w-4 h-4 text-indigo-500" />
          <span className="font-medium text-sm text-stone-700 dark:text-stone-300">Vim Shortcuts</span>
        </div>
        <ChevronUp className="w-4 h-4 text-stone-500" />
      </div>

      {/* Shortcut groups */}
      <div className="max-h-[400px] overflow-y-auto">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title} className="border-b border-stone-100 dark:border-stone-800 last:border-b-0">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
            >
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                {group.title}
              </span>
              {expandedGroups.has(group.title) ? (
                <ChevronUp className="w-3 h-3 text-stone-400" />
              ) : (
                <ChevronDown className="w-3 h-3 text-stone-400" />
              )}
            </button>

            {/* Shortcuts */}
            {expandedGroups.has(group.title) && (
              <div className="px-4 pb-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 py-1.5 text-sm"
                  >
                    <code className="flex-shrink-0 min-w-[120px] px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded text-xs font-mono text-indigo-600 dark:text-indigo-400">
                      {shortcut.keys}
                    </code>
                    <span className="text-stone-600 dark:text-stone-400 text-xs">
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-2 bg-stone-50 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700">
        <p className="text-[10px] text-stone-500 dark:text-stone-500">
          Press <code className="px-1 bg-stone-200 dark:bg-stone-700 rounded">Esc</code> to return to NORMAL mode
        </p>
      </div>
    </div>
  );
}

// Compact inline shortcuts hint
export function VimShortcutsHint() {
  return (
    <div className="flex items-center gap-3 text-[10px] text-stone-400">
      <span>
        <code className="px-1 bg-stone-100 dark:bg-stone-800 rounded">i</code> insert
      </span>
      <span>
        <code className="px-1 bg-stone-100 dark:bg-stone-800 rounded">Esc</code> normal
      </span>
      <span>
        <code className="px-1 bg-stone-100 dark:bg-stone-800 rounded">/</code> search
      </span>
      <span>
        <code className="px-1 bg-stone-100 dark:bg-stone-800 rounded">:w</code> save
      </span>
    </div>
  );
}
