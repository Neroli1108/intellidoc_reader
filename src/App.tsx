import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Sidebar } from "./components/Sidebar";
import { DocumentViewer } from "./components/DocumentViewer";
import { ChatPanel } from "./components/ChatPanel";
import { Toolbar } from "./components/Toolbar";
import { LLMSettings } from "./components/LLMSettings";
import { useDocumentStore } from "./stores/documentStore";
import { useSettingsStore } from "./stores/settingsStore";

function App() {
  const { currentDocument, setCurrentDocument, annotations, loadAnnotations } =
    useDocumentStore();
  const { theme, toggleTheme } = useSettingsStore();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState(false);

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const handleOpenDocument = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          {
            name: "Documents",
            extensions: ["pdf", "epub", "docx", "txt", "md", "tex"],
          },
        ],
      });

      if (selected) {
        const doc = await invoke<Document>("open_document", {
          path: selected,
        });
        setCurrentDocument(doc);

        // Load annotations for this document
        const docAnnotations = await invoke<Annotation[]>("get_annotations", {
          documentId: doc.id,
        });
        loadAnnotations(docAnnotations);
      }
    } catch (error) {
      console.error("Failed to open document:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      {/* Top Toolbar */}
      <Toolbar
        onOpenDocument={handleOpenDocument}
        onToggleTheme={toggleTheme}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        onOpenLLMSettings={() => setIsLLMSettingsOpen(true)}
        theme={theme}
        hasDocument={!!currentDocument}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Outline & Metadata */}
        {isSidebarOpen && (
          <Sidebar
            document={currentDocument}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Document Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentDocument ? (
            <DocumentViewer
              document={currentDocument}
              annotations={annotations}
            />
          ) : (
            <WelcomeScreen onOpenDocument={handleOpenDocument} />
          )}
        </div>

        {/* AI Chat Panel */}
        {isChatOpen && currentDocument && (
          <ChatPanel
            document={currentDocument}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>

      {/* Status Bar */}
      <StatusBar document={currentDocument} />

      {/* LLM Settings Modal */}
      <LLMSettings
        isOpen={isLLMSettingsOpen}
        onClose={() => setIsLLMSettingsOpen(false)}
      />
    </div>
  );
}

// Welcome screen when no document is open
function WelcomeScreen({ onOpenDocument }: { onOpenDocument: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-950">
      <div className="text-center animate-fade-in">
        <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-display font-semibold mb-2 text-stone-800 dark:text-stone-100">
          IntelliDoc Reader
        </h1>
        <p className="text-stone-600 dark:text-stone-400 mb-8 max-w-md">
          Your AI-powered research assistant. Open a document to get started
          with intelligent reading, annotations, and explanations.
        </p>
        <button
          onClick={onOpenDocument}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg hover:shadow-xl"
        >
          Open Document
        </button>
        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-stone-500 dark:text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            PDF
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            EPUB
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            Markdown
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            DOCX
          </span>
        </div>
      </div>
    </div>
  );
}

// Status bar at the bottom
function StatusBar({ document }: { document: Document | null }) {
  const [llmStatus, setLlmStatus] = useState<{
    loaded: boolean;
    model_name: string | null;
  }>({ loaded: false, model_name: null });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await invoke<{
          loaded: boolean;
          model_name: string | null;
        }>("get_model_status");
        setLlmStatus(status);
      } catch {
        setLlmStatus({ loaded: false, model_name: null });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 px-4 flex items-center justify-between bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 text-xs text-stone-500 dark:text-stone-500">
      <div className="flex items-center gap-4">
        <span>
          {document ? document.title : "No document open"}
        </span>
        {document && (
          <>
            <span>|</span>
            <span>{document.metadata.page_count} pages</span>
            <span>|</span>
            <span>{document.metadata.word_count.toLocaleString()} words</span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              llmStatus.loaded
                ? "bg-emerald-500"
                : "bg-amber-500 animate-pulse"
            }`}
          />
          {llmStatus.loaded
            ? `LLM: ${llmStatus.model_name || "Ready"}`
            : "LLM: Not configured"}
        </span>
      </div>
    </div>
  );
}

// Type definitions
interface Document {
  id: string;
  doc_type: string;
  path: string;
  title: string;
  authors: string[];
  pages: Page[];
  metadata: DocumentMetadata;
  category: string;
}

interface Page {
  number: number;
  text: string;
  paragraphs: Paragraph[];
}

interface Paragraph {
  id: string;
  text: string;
  bounding_box: BoundingBox | null;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DocumentMetadata {
  page_count: number;
  word_count: number;
  creation_date: string | null;
  modification_date: string | null;
  subject: string | null;
  keywords: string[];
}

interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  paragraph_id: string | null;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  highlight_color: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export default App;
