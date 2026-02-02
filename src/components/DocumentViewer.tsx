import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  StickyNote,
  MessageSquare,
  Play,
  Volume2,
} from "lucide-react";
import { useVoiceReadingStore, parseSentences, Sentence } from "../stores/voiceReadingStore";
import { ReadingControls } from "./ReadingControls";

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

export function DocumentViewer({ document, annotations: _annotations }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
    rect: DOMRect;
  } | null>(null);
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const [showReadingControls, setShowReadingControls] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  // Voice reading store
  const {
    status,
    currentSentenceIndex,
    sentences,
    setSentences,
    startReading,
    jumpToSentence: _jumpToSentence,
    initializeListeners,
    cleanup,
  } = useVoiceReadingStore();

  const isReading = status === "playing" || status === "paused";
  const totalPages = document.metadata.page_count || document.pages.length;
  const currentPageData = document.pages[currentPage - 1];

  // Parse sentences from current page
  useEffect(() => {
    if (currentPageData) {
      const allSentences: Sentence[] = [];
      currentPageData.paragraphs.forEach((paragraph) => {
        const paragraphSentences = parseSentences(paragraph.text, paragraph.id);
        allSentences.push(...paragraphSentences);
      });
      setSentences(allSentences);
    }
  }, [currentPageData, setSentences]);

  // Initialize event listeners for reading position updates
  useEffect(() => {
    let unlistenFns: (() => void)[] = [];

    const setup = async () => {
      unlistenFns = await initializeListeners();
    };

    setup();

    return () => {
      unlistenFns.forEach((fn) => fn());
      cleanup();
    };
  }, [initializeListeners, cleanup]);

  // Auto-scroll to current sentence during reading
  useEffect(() => {
    if (currentSentenceIndex >= 0 && sentences[currentSentenceIndex]) {
      const sentenceId = sentences[currentSentenceIndex].id;
      const element = sentenceRefs.current.get(sentenceId);
      
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }, [currentSentenceIndex, sentences]);

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
        start: 0,
        end: text.length,
        rect,
      });
      setShowAnnotationPopup(true);
    }
  }, []);

  // Handle sentence click to start reading from that point
  const handleSentenceClick = useCallback(
    async (sentenceIndex: number) => {
      if (!showReadingControls) {
        setShowReadingControls(true);
      }
      
      // Start reading from this sentence
      await startReading(document.id, "", sentenceIndex);
    },
    [document.id, showReadingControls, startReading]
  );

  // Start reading from current position
  const handleStartReading = useCallback(async () => {
    setShowReadingControls(true);
    await startReading(document.id, "", 0);
  }, [document.id, startReading]);

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

  // Store ref for a sentence element
  const setSentenceRef = useCallback((id: string, el: HTMLSpanElement | null) => {
    if (el) {
      sentenceRefs.current.set(id, el);
    } else {
      sentenceRefs.current.delete(id);
    }
  }, []);

  // Render paragraph with sentences wrapped for highlighting
  const renderParagraphWithSentences = (paragraph: Paragraph, _paragraphIndex: number) => {
    const paragraphSentences = parseSentences(paragraph.text, paragraph.id);
    
    // Track the global sentence index for this paragraph
    let globalSentenceStartIndex = 0;
    for (let i = 0; i < currentPageData.paragraphs.length; i++) {
      if (currentPageData.paragraphs[i].id === paragraph.id) break;
      globalSentenceStartIndex += parseSentences(
        currentPageData.paragraphs[i].text,
        currentPageData.paragraphs[i].id
      ).length;
    }

    return paragraphSentences.map((sentence, localIndex) => {
      const globalIndex = globalSentenceStartIndex + localIndex;
      const isActive = globalIndex === currentSentenceIndex && isReading;
      
      return (
        <span
          key={sentence.id}
          ref={(el) => setSentenceRef(sentence.id, el)}
          data-sentence-id={sentence.id}
          data-sentence-index={globalIndex}
          className={`sentence reading-clickable ${isActive ? "reading-active" : ""}`}
          onClick={() => handleSentenceClick(globalIndex)}
          title="Click to read from here"
        >
          {sentence.text}{" "}
        </span>
      );
    });
  };

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
          {/* Read aloud button */}
          <button
            onClick={handleStartReading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
            title="Read aloud"
          >
            {isReading ? (
              <>
                <Volume2 className="w-4 h-4" />
                Reading...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Read Aloud
              </>
            )}
          </button>

          <div className="w-px h-6 bg-stone-200 dark:bg-stone-700" />

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
                  {renderParagraphWithSentences(paragraph, index)}
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

      {/* Reading controls bar */}
      {showReadingControls && (
        <ReadingControls
          documentId={document.id}
          onClose={() => setShowReadingControls(false)}
        />
      )}
    </div>
  );
}

// Render text with highlighted portions (for annotations)
function _renderTextWithHighlights(
  text: string,
  annotations: Annotation[]
): React.ReactNode {
  if (annotations.length === 0) {
    return text;
  }

  let result: React.ReactNode[] = [];
  let lastIndex = 0;

  annotations.forEach((annotation, i) => {
    if (!annotation.selected_text) return;

    const index = text.indexOf(annotation.selected_text, lastIndex);
    if (index === -1) return;

    if (index > lastIndex) {
      result.push(text.slice(lastIndex, index));
    }

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

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result.length > 0 ? result : text;
}
