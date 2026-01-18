import {
  Menu,
  Moon,
  Sun,
  FolderOpen,
  Save,
  Search,
  PanelLeftClose,
  PanelRightClose,
  Settings,
  FileText,
  Edit3,
  Bot,
} from "lucide-react";

interface ToolbarProps {
  onOpenDocument: () => void;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  onOpenEditor?: () => void;
  onOpenLLMSettings?: () => void;
  theme: "light" | "dark";
  hasDocument: boolean;
}

export function Toolbar({
  onOpenDocument,
  onToggleTheme,
  onToggleSidebar,
  onToggleChat,
  onOpenEditor,
  onOpenLLMSettings,
  theme,
  hasDocument,
}: ToolbarProps) {
  return (
    <header className="h-12 px-4 flex items-center justify-between bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 drag-region">
      {/* Left section */}
      <div className="flex items-center gap-2 no-drag">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Toggle Sidebar"
        >
          <PanelLeftClose className="w-5 h-5 text-stone-600 dark:text-stone-400" />
        </button>

        <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

        <button
          onClick={onOpenDocument}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Open
          </span>
        </button>

        <button
          disabled={!hasDocument}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Export
          </span>
        </button>

        <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

        <button
          onClick={onOpenEditor}
          disabled={!hasDocument}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Edit PDF"
        >
          <Edit3 className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Edit
          </span>
        </button>
      </div>

      {/* Center - Title */}
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-indigo-500" />
        <span className="font-display font-semibold text-lg text-stone-800 dark:text-stone-100">
          IntelliDoc Reader
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 no-drag">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search..."
            disabled={!hasDocument}
            className="w-48 pl-9 pr-3 py-1.5 text-sm rounded-lg bg-stone-100 dark:bg-stone-800 border border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-stone-900 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          ) : (
            <Sun className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          )}
        </button>

        <button
          onClick={onToggleChat}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Toggle AI Chat"
        >
          <PanelRightClose className="w-5 h-5 text-stone-600 dark:text-stone-400" />
        </button>

        <button
          onClick={onOpenLLMSettings}
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="LLM Settings"
        >
          <Bot className="w-5 h-5 text-stone-600 dark:text-stone-400" />
        </button>

        <button
          className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5 text-stone-600 dark:text-stone-400" />
        </button>
      </div>
    </header>
  );
}
