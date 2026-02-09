import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  User,
  Calendar,
  Hash,
  Tag,
  BookOpen,
  StickyNote,
  X,
  Highlighter,
  Underline,
  Strikethrough,
  MessageSquare,
  Palette,
} from "lucide-react";
import { useAnnotationStore } from "../stores/annotationStore";
import type { PDFAnnotation } from "../stores/annotationStore";
import { useCategoryStore } from "../stores/categoryStore";
import { invoke } from "@tauri-apps/api/core";
import { HighlightLegend } from "./highlights";

interface Document {
  id: string;
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
}

interface DocumentMetadata {
  page_count: number;
  word_count: number;
  creation_date: string | null;
  keywords: string[];
}

interface SidebarProps {
  document: Document | null;
  onClose: () => void;
}

export function Sidebar({ document, onClose: _onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"outline" | "metadata" | "notes" | "legend">(
    "outline"
  );

  return (
    <aside className="w-64 flex flex-col bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 animate-slide-in-right">
      {/* Tab Header */}
      <div className="flex items-center border-b border-stone-200 dark:border-stone-800">
        <button
          onClick={() => setActiveTab("outline")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "outline"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <BookOpen className="w-4 h-4 inline mr-1.5" />
          Outline
        </button>
        <button
          onClick={() => setActiveTab("metadata")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "metadata"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <Tag className="w-4 h-4 inline mr-1.5" />
          Info
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "notes"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <StickyNote className="w-4 h-4 inline mr-1.5" />
          Notes
        </button>
        <button
          onClick={() => setActiveTab("legend")}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === "legend"
              ? "text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400"
              : "text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200"
          }`}
        >
          <Palette className="w-4 h-4 inline mr-1.5" />
          Legend
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!document ? (
          <div className="text-center text-stone-400 dark:text-stone-500 py-8">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No document open</p>
          </div>
        ) : activeTab === "outline" ? (
          <OutlineView document={document} />
        ) : activeTab === "metadata" ? (
          <MetadataView document={document} />
        ) : activeTab === "legend" ? (
          <HighlightLegend />
        ) : (
          <NotesView document={document} />
        )}
      </div>

    </aside>
  );
}

// Outline view showing document structure
function OutlineView({ document }: { document: Document }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["root"]));

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  // Generate outline from document structure
  const outline = generateOutline(document);

  return (
    <nav className="space-y-1">
      {outline.map((item) => (
        <OutlineItem
          key={item.id}
          item={item}
          depth={0}
          expanded={expanded}
          toggleExpanded={toggleExpanded}
        />
      ))}
    </nav>
  );
}

interface OutlineItemData {
  id: string;
  title: string;
  page: number;
  children?: OutlineItemData[];
}

function OutlineItem({
  item,
  depth,
  expanded,
  toggleExpanded,
}: {
  item: OutlineItemData;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expanded.has(item.id);

  return (
    <div>
      <button
        onClick={() => hasChildren && toggleExpanded(item.id)}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left text-sm rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${
          depth === 0
            ? "font-medium text-stone-800 dark:text-stone-200"
            : "text-stone-600 dark:text-stone-400"
        }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="w-4 h-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 flex-shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        <span className="truncate flex-1">{item.title}</span>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          p.{item.page}
        </span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {item.children!.map((child) => (
            <OutlineItem
              key={child.id}
              item={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpanded={toggleExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Generate outline from document (placeholder implementation)
function generateOutline(document: Document): OutlineItemData[] {
  // In a real implementation, this would parse headings from the document
  return document.pages.map((page, i) => ({
    id: `page-${i}`,
    title: `Page ${page.number}`,
    page: page.number,
    children:
      page.paragraphs.length > 1
        ? page.paragraphs.slice(0, 3).map((p, j) => ({
            id: `para-${i}-${j}`,
            title: p.text.slice(0, 40) + (p.text.length > 40 ? "..." : ""),
            page: page.number,
          }))
        : undefined,
  }));
}

// Metadata view showing document info
function MetadataView({ document }: { document: Document }) {
  const categoryColors: Record<string, string> = {
    computerscience: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    physics: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    mathematics: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    unknown: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  };

  return (
    <div className="space-y-4">
      {/* Category Badge */}
      <div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
            categoryColors[document.category] || categoryColors.unknown
          }`}
        >
          {document.category === "computerscience"
            ? "Computer Science"
            : document.category.charAt(0).toUpperCase() +
              document.category.slice(1)}
        </span>
      </div>

      {/* Title */}
      <div>
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          Title
        </label>
        <p className="mt-1 text-sm text-stone-800 dark:text-stone-200 font-medium">
          {document.title}
        </p>
      </div>

      {/* Authors */}
      {document.authors.length > 0 && (
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <User className="w-3 h-3" /> Authors
          </label>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {document.authors.join(", ")}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3 h-3" /> Pages
          </label>
          <p className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
            {document.metadata.page_count}
          </p>
        </div>
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3" /> Words
          </label>
          <p className="mt-1 text-lg font-semibold text-stone-800 dark:text-stone-200">
            {document.metadata.word_count.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Reading time estimate */}
      <div>
        <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Est. Reading Time
        </label>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          ~{Math.ceil(document.metadata.word_count / 200)} minutes
        </p>
      </div>

      {/* Keywords */}
      {document.metadata.keywords.length > 0 && (
        <div>
          <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Keywords
          </label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {document.metadata.keywords.map((keyword, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Highlight color helper - now uses category store
function getAnnotationColor(annotation: PDFAnnotation): string {
  const { getCategoryById } = useCategoryStore.getState();
  if (annotation.categoryId) {
    const category = getCategoryById(annotation.categoryId);
    if (category) return category.color;
  }
  // Fallback to legacy color lookup
  const legacyColors: Record<string, string> = {
    yellow: "#FDE047",
    green: "#4ADE80",
    blue: "#60A5FA",
    purple: "#C084FC",
    red: "#F87171",
    orange: "#FB923C",
  };
  return legacyColors[annotation.color] || "#FDE047";
}

function getAnnotationCategoryName(annotation: PDFAnnotation): string | null {
  const { getCategoryById } = useCategoryStore.getState();
  if (annotation.categoryId) {
    const category = getCategoryById(annotation.categoryId);
    if (category) return category.name;
  }
  return null;
}

function getTypeIcon(type: PDFAnnotation["type"], hasNote?: boolean) {
  if (hasNote) return <MessageSquare className="w-3 h-3" />;
  switch (type) {
    case "highlight": return <Highlighter className="w-3 h-3" />;
    case "underline": return <Underline className="w-3 h-3" />;
    case "strikethrough": return <Strikethrough className="w-3 h-3" />;
  }
}

function getTypeLabel(type: PDFAnnotation["type"], hasNote?: boolean) {
  if (hasNote) return "Note";
  switch (type) {
    case "highlight": return "Highlight";
    case "underline": return "Underline";
    case "strikethrough": return "Strikethrough";
  }
}

// Notes list view — uses shared annotation store
function NotesView({ document: _document }: { document: Document }) {
  const {
    pdfAnnotations,
    removeAnnotation,
    setJumpTarget,
    selectedAnnotationId,
    setSelectedAnnotationId,
  } = useAnnotationStore();

  const handleClick = (annotation: PDFAnnotation) => {
    // Only set jumpTarget - DocumentViewer will handle deselecting the previous
    // and setting selectedAnnotationId after the visual deselection is done
    setJumpTarget(annotation);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try { await invoke("delete_annotation", { id }); } catch {}

    // Remove visual annotation from DOM
    const spans = globalThis.document.querySelectorAll(`[data-annotation-id="${id}"]`);
    spans.forEach(span => {
      (span as HTMLElement).style.backgroundColor = "";
      (span as HTMLElement).style.borderBottom = "";
      (span as HTMLElement).style.backgroundImage = "";
      (span as HTMLElement).style.borderRadius = "";
      (span as HTMLElement).style.outline = "";
      (span as HTMLElement).style.outlineOffset = "";
      span.removeAttribute("data-annotation-id");
      span.removeAttribute("data-annotation-type");
    });

    removeAnnotation(id);
    if (selectedAnnotationId === id) {
      setSelectedAnnotationId(null);
    }
  };

  if (pdfAnnotations.length === 0) {
    return (
      <div className="text-center text-stone-400 dark:text-stone-500 py-8">
        <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm mb-2">No annotations yet</p>
        <p className="text-xs">
          Select text in the document to add highlights or underlines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 dark:text-stone-500 mb-2">
        {pdfAnnotations.length} annotation{pdfAnnotations.length !== 1 ? "s" : ""}
      </p>
      {pdfAnnotations.map((a) => {
        const isSelected = selectedAnnotationId === a.id;
        const hasNote = !!a.note;
        const categoryName = getAnnotationCategoryName(a);
        const annotationColor = a.type === "highlight"
          ? getAnnotationColor(a)
          : a.type === "underline"
            ? "#6366f1"
            : "#ef4444";
        return (
          <div
            key={a.id}
            onClick={() => handleClick(a)}
            className={`p-2.5 rounded-lg text-xs cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border-l-4 ${
              isSelected
                ? "bg-indigo-50 dark:bg-indigo-950/30 ring-2 ring-indigo-400 dark:ring-indigo-500"
                : hasNote
                  ? "bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                  : "bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-800"
            }`}
            style={{
              borderLeftColor: annotationColor,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="flex items-center gap-1 text-[10px] uppercase font-semibold tracking-wider text-stone-400 dark:text-stone-500">
                {getTypeIcon(a.type, hasNote)}
                {categoryName || getTypeLabel(a.type, hasNote)} · p.{a.pageNum}
              </span>
              <button
                onClick={(e) => handleDelete(e, a.id)}
                className="text-stone-300 hover:text-red-500 transition-colors p-0.5"
                title="Remove"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-stone-700 dark:text-stone-300 italic line-clamp-2 leading-relaxed">
              &ldquo;{a.text}&rdquo;
            </p>
            {hasNote && (
              <p className="text-stone-900 dark:text-stone-100 mt-1.5 leading-relaxed font-medium bg-white/50 dark:bg-stone-900/50 p-1.5 rounded">
                {a.note}
              </p>
            )}
            <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-1">
              {isSelected ? "Selected" : "Click to jump"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
