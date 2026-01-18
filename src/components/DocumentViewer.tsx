import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Highlighter,
  StickyNote,
  MessageSquare,
} from "lucide-react";

interface Document {
  id: string;
  title: string;
  pages: Page[];
  metadata: { page_count: number };
}

interface Page {
  number: number;
  text: string;
  paragraphs: Paragraph[];
}

interface Paragraph {
  id: string;
  text: string;
}

interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  highlight_color: string | null;
  note: string | null;
}

interface DocumentViewerProps {
  document: Document;
  annotations: Annotation[];
}

const HIGHLIGHT_COLORS = [
  { name: "yellow", class: "bg-yellow-300/40", css: "rgba(250, 204, 21, 0.4)" },
  { name: "green", class: "bg-green-300/40", css: "rgba(34, 197, 94, 0.4)" },
  { name: "blue", class: "bg-blue-300/40", css: "rgba(59, 130, 246, 0.4)" },
  { name: "purple", class: "bg-purple-300/40", css: "rgba(168, 85, 247, 0.4)" },
  { name: "red", class: "bg-red-300/40", css: "rgba(239, 68, 68, 0.4)" },
];

export function DocumentViewer({ document, annotations }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    rect: DOMRect;
  } | null>(null);
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const totalPages = document.metadata.page_count || document.pages.length;
  const currentPageData = document.pages[currentPage - 1];

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      setShowAnnotationPopup(false);
      return;
    }

    const text = windowSelection.toString().trim();
    if (text.length > 0) {
      const range = windowSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelection({
        text,
        start: 0, // Would need proper offset calculation
        end: text.length,
        rect,
      });
      setShowAnnotationPopup(true);
    }
  }, []);

  // Add highlight
  const handleAddHighlight = async (color: string) => {
    if (!selection) return;

    try {
      await invoke("add_annotation", {
        documentId: document.id,
        pageNumber: currentPage,
        startOffset: selection.start,
        endOffset: selection.end,
        selectedText: selection.text,
        highlightColor: color,
        note: null,
      });

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setShowAnnotationPopup(false);
    } catch (error) {
      console.error("Failed to add highlight:", error);
    }
  };

  // Add note
  const handleAddNote = async () => {
    if (!selection) return;

    const note = prompt("Enter your note:");
    if (!note) return;

    try {
      await invoke("add_annotation", {
        documentId: document.id,
        pageNumber: currentPage,
        startOffset: selection.start,
        endOffset: selection.end,
        selectedText: selection.text,
        highlightColor: "yellow",
        note,
      });

      window.getSelection()?.removeAllRanges();
      setSelection(null);
      setShowAnnotationPopup(false);
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  // Ask AI about selection
  const handleAskAI = async () => {
    if (!selection) return;
    // This would trigger the chat panel with the selected text as context
    console.log("Ask AI about:", selection.text);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages]);

  return (
    <div className="flex-1 flex flex-col bg-stone-100 dark:bg-stone-950">
      {/* Page controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <span className="text-sm text-stone-600 dark:text-stone-400 min-w-[100px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ZoomOut className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <span className="text-sm text-stone-600 dark:text-stone-400 min-w-[50px] text-center">
            {zoom}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(200, z + 10))}
            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ZoomIn className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
        </div>
      </div>

      {/* Document content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-auto p-8"
        onMouseUp={handleMouseUp}
      >
        <div
          className="document-page relative"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
        >
          {currentPageData ? (
            <div className="prose dark:prose-invert prose-stone max-w-none">
              {currentPageData.paragraphs.map((paragraph, index) => (
                <p
                  key={paragraph.id || index}
                  className="relative mb-4 leading-relaxed"
                  data-paragraph-id={paragraph.id}
                >
                  {renderTextWithHighlights(
                    paragraph.text,
                    annotations.filter(
                      (a) =>
                        a.page_number === currentPage &&
                        a.selected_text &&
                        paragraph.text.includes(a.selected_text)
                    )
                  )}
                </p>
              ))}
              {currentPageData.paragraphs.length === 0 && (
                <p className="text-stone-500">{currentPageData.text || "No content on this page"}</p>
              )}
            </div>
          ) : (
            <div className="text-center text-stone-400 py-12">
              No content available for this page
            </div>
          )}
        </div>
      </div>

      {/* Selection annotation popup */}
      {showAnnotationPopup && selection && (
        <div
          className="fixed z-50 animate-fade-in"
          style={{
            left: selection.rect.left + selection.rect.width / 2,
            top: selection.rect.top - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 p-2 flex items-center gap-1">
            {/* Color options */}
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => handleAddHighlight(color.name)}
                className={`w-6 h-6 rounded-full ${color.class} hover:ring-2 ring-offset-2 ring-stone-400 transition-all`}
                title={`Highlight ${color.name}`}
              />
            ))}

            <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

            {/* Add note */}
            <button
              onClick={handleAddNote}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              title="Add note"
            >
              <StickyNote className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            </button>

            {/* Ask AI */}
            <button
              onClick={handleAskAI}
              className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              title="Ask AI"
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Render text with highlighted portions
function renderTextWithHighlights(
  text: string,
  annotations: Annotation[]
): React.ReactNode {
  if (annotations.length === 0) {
    return text;
  }

  // Find and highlight matching text
  let result: React.ReactNode[] = [];
  let lastIndex = 0;

  annotations.forEach((annotation, i) => {
    if (!annotation.selected_text) return;

    const index = text.indexOf(annotation.selected_text, lastIndex);
    if (index === -1) return;

    // Add text before highlight
    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index));
    }

    // Add highlighted text
    const colorClass = `highlight-${annotation.highlight_color || "yellow"}`;
    result.push(
      <span
        key={`${annotation.id}-${i}`}
        className={`${colorClass} relative cursor-pointer rounded-sm`}
        title={annotation.note || undefined}
      >
        {annotation.selected_text}
        {annotation.note && (
          <span className="note-indicator">📝</span>
        )}
      </span>
    );

    lastIndex = index + annotation.selected_text.length;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : text;
}
