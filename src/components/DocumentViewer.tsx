import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  StickyNote,
  MessageSquare,
  Eye,
  Edit3,
  Play,
  Pause,
  Square,
  Volume2,
  Download,
  Underline,
  Strikethrough,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { MarkdownPreview, LaTeXPreview } from "./MarkdownPreview";
import { AddNoteDialog } from "./LineNotes";
import { CodeMirrorEditor } from "./editor";
import { useAnnotationStore } from "../stores/annotationStore";
import type { PDFAnnotation } from "../stores/annotationStore";
import type { HighlightCategory } from "../stores/categoryStore";
import { CategoryPickerInline } from "./highlights";
import { hexToRgba } from "../constants/colors";

// Set PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface Document {
  id: string;
  doc_type: string;
  path: string;
  title: string;
  pages: Page[];
  metadata: { page_count: number; word_count: number };
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

// Legacy color name mapping for backward compatibility
const LEGACY_COLORS: Record<string, string> = {
  yellow: "rgba(253, 224, 71, 0.35)",
  green: "rgba(74, 222, 128, 0.35)",
  blue: "rgba(96, 165, 250, 0.35)",
  purple: "rgba(192, 132, 252, 0.35)",
  red: "rgba(248, 113, 113, 0.35)",
  orange: "rgba(251, 146, 60, 0.35)",
};

function getHighlightRgba(colorOrHex: string): string {
  // Check if it's a legacy color name
  if (LEGACY_COLORS[colorOrHex]) {
    return LEGACY_COLORS[colorOrHex];
  }
  // Check if it's a hex color
  if (colorOrHex.startsWith("#")) {
    return hexToRgba(colorOrHex, 0.35);
  }
  // Default fallback
  return "rgba(253, 224, 71, 0.35)";
}

// ─── Selection highlight helpers (shared by highlights & notes) ─────────

/** Get the normal (non-selected) background for an annotation */
function getNormalBg(annotation: PDFAnnotation): string {
  if (annotation.type === "highlight") {
    return getHighlightRgba(annotation.color);
  }
  return "";
}

/** Apply the "selected" visual style to an annotation's spans */
function selectAnnotationSpans(annotationId: string) {
  const spans = globalThis.document.querySelectorAll(
    `[data-annotation-id="${annotationId}"]`
  ) as NodeListOf<HTMLElement>;
  spans.forEach(span => {
    span.style.backgroundColor = "rgba(99, 102, 241, 0.35)";
    span.style.outline = "2px solid rgba(99, 102, 241, 0.6)";
    span.style.outlineOffset = "1px";
    span.style.borderRadius = "2px";
  });
}

/** Remove the "selected" visual style, restore normal annotation appearance */
function deselectAnnotationSpans(annotation: PDFAnnotation) {
  const spans = globalThis.document.querySelectorAll(
    `[data-annotation-id="${annotation.id}"]`
  ) as NodeListOf<HTMLElement>;
  spans.forEach(span => {
    span.style.outline = "";
    span.style.outlineOffset = "";
    span.style.backgroundColor = getNormalBg(annotation);
    if (annotation.type === "highlight") {
      span.style.borderRadius = "2px";
    }
  });
}

// ─── DOM annotation helpers ─────────

/** Apply visual annotation styles to the currently selected spans */
function applyAnnotationToSelectedSpans(
  type: "highlight" | "underline" | "strikethrough",
  color: string,
  annotationId: string
): string[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return [];

  const range = sel.getRangeAt(0);
  const spanTexts: string[] = [];

  const ancestor = range.commonAncestorContainer;
  const container = ancestor.nodeType === Node.TEXT_NODE
    ? ancestor.parentElement?.parentElement
    : ancestor;
  if (!container) return [];

  const walker = globalThis.document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const selectedSpans: HTMLSpanElement[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (range.intersectsNode(node) && node.parentElement?.tagName === "SPAN") {
      selectedSpans.push(node.parentElement);
      spanTexts.push(node.textContent || "");
    }
  }

  selectedSpans.forEach(span => {
    span.setAttribute("data-annotation-id", annotationId);
    span.setAttribute("data-annotation-type", type);
    switch (type) {
      case "highlight":
        span.style.backgroundColor = getHighlightRgba(color);
        span.style.borderRadius = "2px";
        break;
      case "underline":
        span.style.borderBottom = "2px solid #4f46e5";
        break;
      case "strikethrough":
        span.style.backgroundImage =
          "linear-gradient(transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)";
        break;
    }
  });

  return spanTexts;
}

/** Re-apply annotations after text layer re-render */
function reapplyAnnotations(
  textLayerEl: HTMLDivElement,
  annotations: PDFAnnotation[],
  pageNum: number,
  selectedAnnotationId?: string | null
) {
  const pageAnnotations = annotations.filter(a => a.pageNum === pageNum);
  if (pageAnnotations.length === 0) return;

  const spans = Array.from(textLayerEl.querySelectorAll("span")) as HTMLSpanElement[];
  if (spans.length === 0) return;

  for (const annotation of pageAnnotations) {
    if (!annotation.spanTexts || annotation.spanTexts.length === 0) continue;

    const targetTexts = annotation.spanTexts;
    for (let i = 0; i <= spans.length - targetTexts.length; i++) {
      let match = true;
      for (let j = 0; j < targetTexts.length; j++) {
        if ((spans[i + j].textContent || "") !== targetTexts[j]) { match = false; break; }
      }
      if (match) {
        for (let j = 0; j < targetTexts.length; j++) {
          const span = spans[i + j];
          span.setAttribute("data-annotation-id", annotation.id);
          span.setAttribute("data-annotation-type", annotation.type);
          switch (annotation.type) {
            case "highlight":
              span.style.backgroundColor = getHighlightRgba(annotation.color);
              span.style.borderRadius = "2px";
              break;
            case "underline":
              span.style.borderBottom = "2px solid #4f46e5";
              break;
            case "strikethrough":
              span.style.backgroundImage =
                "linear-gradient(transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)";
              break;
          }
        }
        // If this annotation is currently selected, apply selection styling
        if (selectedAnnotationId === annotation.id) {
          selectAnnotationSpans(annotation.id);
        }
        break;
      }
    }
  }
}

// ─── PDF Page Component ─────────

function PDFPage({
  pdfDoc, pageNum, scale, id, annotations, selectedAnnotationId,
}: {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNum: number;
  scale: number;
  id: string;
  annotations: PDFAnnotation[];
  selectedAnnotationId: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const renderPage = async () => {
      if (!canvasRef.current || !textLayerRef.current) return;
      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        if (cancelled) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        if (!context) return;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport, canvas }).promise;
        if (cancelled) return;

        const textLayer = textLayerRef.current;
        textLayer.innerHTML = "";
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        textContent.items.forEach((item: any) => {
          if (!item.str) return;
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const span = globalThis.document.createElement("span");
          span.textContent = item.str;
          span.style.position = "absolute";
          span.style.left = `${tx[4]}px`;
          span.style.top = `${tx[5] - Math.abs(tx[3])}px`;
          span.style.fontSize = `${Math.abs(tx[0])}px`;
          span.style.fontFamily = "sans-serif";
          span.style.color = "transparent";
          span.style.cursor = "text";
          span.style.whiteSpace = "pre";
          span.style.lineHeight = "1";
          textLayer.appendChild(span);
        });

        if (annotations.length > 0) {
          reapplyAnnotations(textLayer, annotations, pageNum, selectedAnnotationId);
        }
      } catch (err) {
        if (!cancelled) console.error(`Failed to render page ${pageNum}:`, err);
      }
    };
    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, scale, annotations, selectedAnnotationId]);

  return (
    <div ref={containerRef} id={id} className="relative mb-6 shadow-xl bg-white inline-block" data-page={pageNum}>
      <canvas ref={canvasRef} className="block" />
      <div ref={textLayerRef} className="absolute top-0 left-0 overflow-hidden select-text" style={{ mixBlendMode: "multiply" }} />
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
        Page {pageNum}
      </div>
    </div>
  );
}

// ─── DocumentViewer ─────────

export function DocumentViewer({ document, annotations: _annotations }: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [selection, setSelection] = useState<{ text: string; pageNum: number; rect: DOMRect } | null>(null);
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);

  // For adding notes to existing highlights
  const [editingAnnotation, setEditingAnnotation] = useState<PDFAnnotation | null>(null);
  const [showHighlightMenu, setShowHighlightMenu] = useState<{ x: number; y: number } | null>(null);

  // Shared annotation store
  const {
    pdfAnnotations,
    addAnnotation,
    updateAnnotation,
    jumpTarget,
    setJumpTarget,
    selectedAnnotationId,
    setSelectedAnnotationId,
    initForDocument,
  } = useAnnotationStore();

  // View mode
  const [pdfViewMode, setPdfViewMode] = useState<"pdf" | "edit">("pdf");
  const [viewMode, setViewMode] = useState<"preview" | "source">("preview");
  const [rawContent, setRawContent] = useState("");
  const [editableContent, setEditableContent] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);

  // Voice
  const [isReading, setIsReading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(1.0);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // PDF
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const isPDF = document.doc_type === "pdf";
  const isMarkdown = document.doc_type === "markdown";
  const isLatex = document.doc_type === "latex";
  const totalPages = isPDF ? pdfNumPages : (document.metadata.page_count || document.pages.length);
  const pdfScale = (zoom / 100) * 1.5;

  const getAllText = useCallback(() => document.pages.map(p => p.text).join("\n\n"), [document.pages]);

  // ─── Unified deselect: any click anywhere clears selection ───
  const clearSelection = useCallback(() => {
    if (!selectedAnnotationId) return;
    const prev = pdfAnnotations.find(a => a.id === selectedAnnotationId);
    if (prev) deselectAnnotationSpans(prev);
    setSelectedAnnotationId(null);
  }, [selectedAnnotationId, pdfAnnotations, setSelectedAnnotationId]);

  // ─── Select a specific annotation (deselects any previous) ───
  const selectAnnotation = useCallback((annotationId: string) => {
    // First, deselect the currently selected one (if any and different)
    if (selectedAnnotationId && selectedAnnotationId !== annotationId) {
      const prev = pdfAnnotations.find(a => a.id === selectedAnnotationId);
      if (prev) deselectAnnotationSpans(prev);
    }
    // Now select the new one
    setSelectedAnnotationId(annotationId);
    selectAnnotationSpans(annotationId);
  }, [selectedAnnotationId, pdfAnnotations, setSelectedAnnotationId]);

  // Mousedown within content area: select annotated span OR deselect
  const handleContentMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't deselect if clicking inside the annotation popup or highlight menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-annotation-popup]') || target.closest('[data-highlight-menu]')) return;

    // Close highlight menu if open
    setShowHighlightMenu(null);

    // Check if clicked on an annotated span
    const annotatedSpan = target.closest('[data-annotation-id]') as HTMLElement | null;
    if (annotatedSpan) {
      const annotationId = annotatedSpan.getAttribute('data-annotation-id');
      if (annotationId) {
        const annotation = pdfAnnotations.find(a => a.id === annotationId);
        if (annotation) {
          // Select this annotation (exclusive)
          selectAnnotation(annotationId);
          // Show context menu for highlights
          if (annotation.type === 'highlight') {
            setEditingAnnotation(annotation);
            setShowHighlightMenu({ x: e.clientX, y: e.clientY });
          }
        }
        return;
      }
    }

    // Not on an annotated span -> clear selection
    clearSelection();
    setEditingAnnotation(null);
  }, [clearSelection, selectAnnotation, pdfAnnotations]);

  // ─── Init persistence ───
  useEffect(() => {
    const contentSample = document.pages.map(p => p.text).join("\n").slice(0, 2000);
    initForDocument(document.path, contentSample);
  }, [document.id, document.path]);

  // ─── Load content ───
  useEffect(() => {
    const loadContent = async () => {
      if (isMarkdown || isLatex || document.doc_type === "txt") {
        try {
          const content = await readFile(document.path);
          const text = new TextDecoder().decode(content);
          setRawContent(text);
          setEditableContent(text);
        } catch {
          const fallback = document.pages.map(p => p.text).join("\n\n");
          setRawContent(fallback);
          setEditableContent(fallback);
        }
      } else if (isPDF) {
        setEditableContent(document.pages.map(p => p.text).join("\n\n---\n\n"));
      }
    };
    loadContent();
  }, [document.path, isMarkdown, isLatex, document.doc_type, document.pages, isPDF]);

  // ─── Load PDF ───
  useEffect(() => {
    if (!isPDF) return;
    let cancelled = false;
    const loadPDF = async () => {
      setPdfLoading(true);
      setPdfError(null);
      try {
        const fileData = await readFile(document.path);
        const pdf = await pdfjsLib.getDocument({ data: fileData, useSystemFonts: true }).promise;
        if (cancelled) { pdf.destroy(); return; }
        setPdfDoc(pdf);
        setPdfNumPages(pdf.numPages);
      } catch (err: any) {
        if (!cancelled) setPdfError(err?.message || "Failed to load PDF");
      } finally {
        if (!cancelled) setPdfLoading(false);
      }
    };
    loadPDF();
    return () => { cancelled = true; pdfDoc?.destroy(); };
  }, [document.path, isPDF]);

  // ─── Page nav ───
  const scrollToPage = useCallback((pageNum: number) => {
    const el = globalThis.document.getElementById(`pdf-page-${pageNum}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrentPage(pageNum);
  }, []);

  useEffect(() => {
    if (!isPDF || pdfViewMode !== "pdf" || !contentRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setCurrentPage(parseInt(entry.target.getAttribute("data-page") || "1"));
            break;
          }
        }
      },
      { root: contentRef.current, threshold: 0.5 }
    );
    const timer = setTimeout(() => {
      contentRef.current?.querySelectorAll("[data-page]").forEach(p => observer.observe(p));
    }, 500);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, [isPDF, pdfViewMode, pdfNumPages, pdfDoc]);

  // ─── Voice ───
  const startReading = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    const text = getAllText();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = readingSpeed;
    utterance.onend = () => { setIsReading(false); setIsPaused(false); };
    speechSynthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsReading(true); setIsPaused(false);
  }, [getAllText, readingSpeed]);
  const pauseReading = useCallback(() => { window.speechSynthesis.pause(); setIsPaused(true); }, []);
  const resumeReading = useCallback(() => { window.speechSynthesis.resume(); setIsPaused(false); }, []);
  const stopReading = useCallback(() => { window.speechSynthesis.cancel(); setIsReading(false); setIsPaused(false); }, []);

  // ─── Text selection handler ───
  const handleMouseUp = useCallback(() => {
    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      setTimeout(() => {
        if (!window.getSelection()?.toString().trim()) {
          setSelection(null);
          setShowAnnotationPopup(false);
        }
      }, 200);
      return;
    }
    const text = windowSelection.toString().trim();
    if (text.length > 0) {
      const range = windowSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      let pageNum = currentPage;
      let node: Node | null = range.startContainer;
      while (node) {
        if (node instanceof HTMLElement) {
          const p = node.getAttribute("data-page");
          if (p) { pageNum = parseInt(p); break; }
        }
        node = node.parentNode;
      }
      setSelection({ text, pageNum, rect });
      setShowAnnotationPopup(true);
    }
  }, [currentPage]);

  // ─── Annotation actions ───

  const handleAddHighlight = async (category: HighlightCategory) => {
    if (!selection) return;
    const annotationId = Date.now().toString();
    const spanTexts = applyAnnotationToSelectedSpans("highlight", category.color, annotationId);

    addAnnotation({
      id: annotationId,
      pageNum: selection.pageNum,
      text: selection.text,
      type: "highlight",
      color: category.color,
      categoryId: category.id,
      spanTexts,
    });

    // Select the new annotation (deselects any previous)
    selectAnnotation(annotationId);

    try {
      await invoke("add_annotation", {
        documentId: document.id, pageNumber: selection.pageNum,
        startOffset: 0, endOffset: selection.text.length,
        selectedText: selection.text, highlightColor: category.color, note: null,
      });
    } catch (error) { console.error("Failed to save annotation:", error); }

    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowAnnotationPopup(false);
  };

  const handleAddUnderline = () => {
    if (!selection) return;
    const annotationId = Date.now().toString();
    const spanTexts = applyAnnotationToSelectedSpans("underline", "indigo", annotationId);
    addAnnotation({ id: annotationId, pageNum: selection.pageNum, text: selection.text, type: "underline", color: "indigo", spanTexts });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowAnnotationPopup(false);
  };

  const handleAddStrikethrough = () => {
    if (!selection) return;
    const annotationId = Date.now().toString();
    const spanTexts = applyAnnotationToSelectedSpans("strikethrough", "red", annotationId);
    addAnnotation({ id: annotationId, pageNum: selection.pageNum, text: selection.text, type: "strikethrough", color: "red", spanTexts });
    window.getSelection()?.removeAllRanges();
    setSelection(null);
    setShowAnnotationPopup(false);
  };

  // Open note dialog for existing highlight
  const handleAddNoteToHighlight = () => {
    setShowHighlightMenu(null);
    setShowNoteDialog(true);
  };

  // Save note - either to existing highlight or with selection
  const handleSaveNote = async (note: string, _color: string) => {
    // If editing an existing annotation, just update it with the note
    if (editingAnnotation) {
      updateAnnotation(editingAnnotation.id, { note });

      try {
        await invoke("add_annotation", {
          documentId: document.id, pageNumber: editingAnnotation.pageNum,
          startOffset: 0, endOffset: editingAnnotation.text.length,
          selectedText: editingAnnotation.text, highlightColor: editingAnnotation.color, note,
        });
      } catch (error) { console.error("Failed to save note:", error); }

      setEditingAnnotation(null);
      return;
    }

    // Otherwise, this shouldn't happen (no selection for standalone note)
    // But handle gracefully
    if (!selection) return;

    window.getSelection()?.removeAllRanges();
    setSelection(null);
  };

  // ─── Watch jumpTarget from Sidebar ───
  useEffect(() => {
    if (!jumpTarget) return;

    // Capture the current values from closure
    const prevSelectedId = selectedAnnotationId;
    const currentAnnotations = pdfAnnotations;

    // ALWAYS deselect any currently selected annotation first (visual cleanup)
    if (prevSelectedId) {
      const prev = currentAnnotations.find(a => a.id === prevSelectedId);
      if (prev) {
        deselectAnnotationSpans(prev);
      }
    }

    // Now set the new selection in store
    setSelectedAnnotationId(jumpTarget.id);

    // Scroll to the target page
    scrollToPage(jumpTarget.pageNum);

    // Helper to find and select annotation spans
    const findAndSelectSpans = (): boolean => {
      // First, try to find spans that are already tagged with this annotation ID
      let spans = globalThis.document.querySelectorAll(
        `[data-annotation-id="${jumpTarget.id}"]`
      ) as NodeListOf<HTMLElement>;

      if (spans.length > 0) {
        // Spans found - scroll to them and apply selection styling
        spans[0].scrollIntoView({ behavior: "smooth", block: "center" });
        selectAnnotationSpans(jumpTarget.id);
        return true;
      }

      // Spans not tagged yet - find them by text content and tag them
      if (jumpTarget.spanTexts && jumpTarget.spanTexts.length > 0) {
        const pageEl = globalThis.document.getElementById(`pdf-page-${jumpTarget.pageNum}`);
        if (!pageEl) {
          return false;
        }
        const allSpans = Array.from(pageEl.querySelectorAll("span")) as HTMLElement[];
        if (allSpans.length === 0) {
          return false; // Page not rendered yet
        }

        const target = jumpTarget.spanTexts;

        for (let i = 0; i <= allSpans.length - target.length; i++) {
          let match = true;
          for (let j = 0; j < target.length; j++) {
            if ((allSpans[i + j].textContent || "") !== target[j]) { match = false; break; }
          }
          if (match) {
            // Tag the spans with the annotation ID and apply base styling
            for (let j = 0; j < target.length; j++) {
              const span = allSpans[i + j];
              span.setAttribute("data-annotation-id", jumpTarget.id);
              span.setAttribute("data-annotation-type", jumpTarget.type);
              // Apply base annotation style (for note/highlight)
              if (jumpTarget.type === "highlight") {
                span.style.backgroundColor = getHighlightRgba(jumpTarget.color);
                span.style.borderRadius = "2px";
              } else if (jumpTarget.type === "underline") {
                span.style.borderBottom = "2px solid #4f46e5";
              } else if (jumpTarget.type === "strikethrough") {
                span.style.backgroundImage =
                  "linear-gradient(transparent 45%, #ef4444 45%, #ef4444 55%, transparent 55%)";
              }
            }
            allSpans[i].scrollIntoView({ behavior: "smooth", block: "center" });
            // Now apply selection styling on top
            selectAnnotationSpans(jumpTarget.id);
            return true;
          }
        }
      }
      return false;
    };

    // Try to find spans with retry logic
    let retryCount = 0;
    const maxRetries = 5;
    const retryDelay = 200;

    const attemptSelection = () => {
      const found = findAndSelectSpans();
      if (!found && retryCount < maxRetries) {
        retryCount++;
        setTimeout(attemptSelection, retryDelay);
      } else {
        setJumpTarget(null);
      }
    };

    // Initial attempt after scroll
    const timer = setTimeout(attemptSelection, 300);

    return () => clearTimeout(timer);
  }, [jumpTarget]);

  const handleCompileToPDF = async () => {
    setIsCompiling(true);
    try {
      await invoke("compile_to_pdf", {
        content: editableContent,
        outputPath: document.path.replace(".pdf", "_edited.pdf"),
      });
      alert("PDF compiled successfully!");
    } catch (error) {
      console.error("Failed to compile PDF:", error);
      alert("Failed to compile PDF. Make sure LaTeX is installed.");
    } finally {
      setIsCompiling(false);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowLeft" && currentPage > 1) scrollToPage(currentPage - 1);
      else if (e.key === "ArrowRight" && currentPage < totalPages) scrollToPage(currentPage + 1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, totalPages, scrollToPage]);

  useEffect(() => { return () => { window.speechSynthesis?.cancel(); }; }, []);

  return (
    <div className="flex-1 flex flex-col bg-stone-100 dark:bg-stone-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 flex-shrink-0">
        {/* Left: Page navigation */}
        <div className="flex items-center gap-2">
          <button onClick={() => scrollToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-stone-600 dark:text-stone-400 min-w-[100px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-50 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Center: View mode tabs */}
        {isPDF && (
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
            <button onClick={() => setPdfViewMode("pdf")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pdfViewMode === "pdf" ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"}`}>
              <Eye className="w-4 h-4" /> PDF
            </button>
            <button onClick={() => setPdfViewMode("edit")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${pdfViewMode === "edit" ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"}`}>
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          </div>
        )}

        {(isMarkdown || isLatex) && (
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
            <button onClick={() => setViewMode("preview")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "preview" ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"}`}>
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button onClick={() => setViewMode("source")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "source" ? "bg-white dark:bg-stone-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-stone-600 dark:text-stone-400 hover:text-stone-900"}`}>
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          </div>
        )}

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Voice */}
          <div className="flex items-center gap-1 mr-2">
            {!isReading ? (
              <button onClick={startReading} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-green-600" title="Read aloud">
                <Play className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button onClick={isPaused ? resumeReading : pauseReading} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-yellow-600" title={isPaused ? "Resume" : "Pause"}>
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button onClick={stopReading} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors text-red-600" title="Stop">
                  <Square className="w-5 h-5" />
                </button>
              </>
            )}
            <select value={readingSpeed} onChange={(e) => setReadingSpeed(parseFloat(e.target.value))} className="text-xs bg-stone-100 dark:bg-stone-800 rounded px-1 py-1" title="Speed">
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Zoom */}
          <button onClick={() => setZoom(z => Math.max(50, z - 25))} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-sm text-stone-600 dark:text-stone-400 min-w-[50px] text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(200, z + 25))} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
            <ZoomIn className="w-5 h-5" />
          </button>

          {isPDF && pdfViewMode === "edit" && (
            <>
              <div className="w-px h-6 bg-stone-200 dark:bg-stone-700" />
              <button onClick={handleCompileToPDF} disabled={isCompiling} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                <Download className="w-4 h-4" />
                {isCompiling ? "Compiling..." : "Export PDF"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <div ref={contentRef} className="flex-1 overflow-auto" onMouseDown={handleContentMouseDown} onMouseUp={handleMouseUp}>
          {/* PDF Viewer */}
          {isPDF && pdfViewMode === "pdf" && (
            <div className="bg-stone-300 dark:bg-stone-800 p-4">
              {pdfLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
                  <span className="ml-3 text-stone-600 dark:text-stone-400">Loading PDF...</span>
                </div>
              ) : pdfError ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-red-500 mb-4">Error: {pdfError}</p>
                  <div className="max-w-3xl bg-white dark:bg-stone-900 p-8 rounded-lg shadow-lg text-left">
                    <div className="prose dark:prose-invert whitespace-pre-wrap">
                      {document.pages.map(p => p.text).join("\n\n")}
                    </div>
                  </div>
                </div>
              ) : pdfDoc ? (
                <div className="flex flex-col items-center">
                  {Array.from({ length: pdfNumPages }, (_, i) => (
                    <PDFPage key={`${i}-${zoom}`} pdfDoc={pdfDoc} pageNum={i + 1} scale={pdfScale} id={`pdf-page-${i + 1}`} annotations={pdfAnnotations} selectedAnnotationId={selectedAnnotationId} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <p className="text-stone-500">No PDF loaded</p>
                </div>
              )}
            </div>
          )}

          {/* PDF Edit Mode */}
          {isPDF && pdfViewMode === "edit" && (
            <div className="flex h-full">
              <div className="flex-1 p-4">
                <CodeMirrorEditor
                  value={editableContent}
                  onChange={setEditableContent}
                  language="latex"
                  placeholder="Edit content here. Use LaTeX formatting..."
                  className="h-full"
                  minHeight="100%"
                />
              </div>
              <div className="w-1/2 p-4 border-l border-stone-300 dark:border-stone-700 overflow-auto">
                <div className="bg-white dark:bg-stone-900 rounded-lg shadow-lg min-h-full">
                  <LaTeXPreview content={editableContent} />
                </div>
              </div>
            </div>
          )}

          {/* Markdown Preview */}
          {isMarkdown && viewMode === "preview" && (
            <div className="max-w-4xl mx-auto bg-white dark:bg-stone-900 shadow-lg my-4 rounded-lg">
              <MarkdownPreview content={rawContent} onLineClick={(_, text) => { setSelection({ text, pageNum: 1, rect: new DOMRect(0, 0, 0, 0) }); setShowNoteDialog(true); }} />
            </div>
          )}

          {/* LaTeX Preview */}
          {isLatex && viewMode === "preview" && (
            <div className="max-w-4xl mx-auto bg-white dark:bg-stone-900 shadow-lg my-4 rounded-lg">
              <LaTeXPreview content={rawContent} onLineClick={(_, text) => { setSelection({ text, pageNum: 1, rect: new DOMRect(0, 0, 0, 0) }); setShowNoteDialog(true); }} />
            </div>
          )}

          {/* Source/Edit view */}
          {(isMarkdown || isLatex) && viewMode === "source" && (
            <div className="flex h-full">
              <div className="flex-1 p-4">
                <CodeMirrorEditor
                  value={rawContent}
                  onChange={setRawContent}
                  language={isLatex ? "latex" : "markdown"}
                  className="h-full"
                  minHeight="100%"
                />
              </div>
              <div className="w-1/2 p-4 border-l border-stone-300 dark:border-stone-700 overflow-auto">
                <div className="bg-white dark:bg-stone-900 rounded-lg shadow-lg min-h-full">
                  {isMarkdown ? <MarkdownPreview content={rawContent} /> : <LaTeXPreview content={rawContent} />}
                </div>
              </div>
            </div>
          )}

          {/* Plain text */}
          {!isPDF && !isMarkdown && !isLatex && (
            <div className="p-8">
              <div className="document-page relative pl-16 max-w-4xl mx-auto bg-white dark:bg-stone-900 rounded-lg shadow-lg p-8" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
                <div className="prose dark:prose-invert prose-stone max-w-none whitespace-pre-wrap">
                  {document.pages.map((page, pi) => (
                    <div key={pi} className="mb-8">
                      {page.paragraphs.map((paragraph, idx) => (
                        <div key={paragraph.id || idx} className="group relative mb-4">
                          <span className="absolute -left-12 top-0 text-xs text-stone-400 select-none w-8 text-right">{idx + 1}</span>
                          <p className="leading-relaxed hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors">{paragraph.text}</p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reading indicator */}
      {isReading && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-4 py-2 rounded-full flex items-center gap-2 shadow-lg z-50">
          <Volume2 className="w-4 h-4 animate-pulse" />
          <span className="text-sm">{isPaused ? "Paused" : "Reading..."}</span>
        </div>
      )}

      {/* Selection popup - for new highlights */}
      {showAnnotationPopup && selection && selection.rect.width > 0 && (
        <div
          className="fixed z-50 animate-fade-in"
          style={{
            left: selection.rect.left + selection.rect.width / 2,
            top: selection.rect.top - 10,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 p-2"
            data-annotation-popup="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Category picker for highlights */}
            <CategoryPickerInline onSelectCategory={handleAddHighlight} />

            <div className="h-px bg-stone-200 dark:bg-stone-700 my-2" />

            <div className="flex items-center gap-1">
              <button onClick={handleAddUnderline} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors" title="Underline">
                <Underline className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>

              <button onClick={handleAddStrikethrough} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors" title="Strikethrough">
                <Strikethrough className="w-4 h-4 text-stone-600 dark:text-stone-400" />
              </button>

              <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-1" />

              <button onClick={() => console.log("Ask AI:", selection?.text)} className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors" title="Ask AI">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Highlight context menu - for existing highlights */}
      {showHighlightMenu && editingAnnotation && (
        <div
          className="fixed z-50 animate-fade-in"
          style={{
            left: showHighlightMenu.x,
            top: showHighlightMenu.y + 10,
          }}
        >
          <div
            className="bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 py-1 min-w-[140px]"
            data-highlight-menu="true"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleAddNoteToHighlight}
              className="w-full px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"
            >
              <StickyNote className="w-4 h-4 text-stone-500" />
              {editingAnnotation.note ? "Edit Note" : "Add Note"}
            </button>
            <button
              onClick={() => console.log("Ask AI:", editingAnnotation?.text)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-700 flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4 text-indigo-500" />
              Ask AI
            </button>
          </div>
        </div>
      )}

      {/* Add Note Dialog */}
      <AddNoteDialog
        isOpen={showNoteDialog}
        selectedText={editingAnnotation?.text || selection?.text || ""}
        lineNumber={editingAnnotation?.pageNum || selection?.pageNum || 1}
        initialNote={editingAnnotation?.note || ""}
        onClose={() => { setShowNoteDialog(false); setSelection(null); setEditingAnnotation(null); }}
        onSave={handleSaveNote}
      />
    </div>
  );
}
