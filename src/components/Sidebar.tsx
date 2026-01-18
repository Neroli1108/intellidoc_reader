import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  User,
  Calendar,
  Hash,
  Tag,
  X,
  Cpu,
  BookOpen,
  StickyNote,
} from "lucide-react";

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

export function Sidebar({ document, onClose }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"outline" | "metadata" | "notes">(
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
        ) : (
          <NotesView document={document} />
        )}
      </div>

      {/* Code Generation Button (for CS papers) */}
      {document && document.category === "computerscience" && (
        <div className="p-4 border-t border-stone-200 dark:border-stone-800">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg">
            <Cpu className="w-4 h-4" />
            Generate Code
          </button>
        </div>
      )}
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

// Notes list view
function NotesView({ document }: { document: Document }) {
  // This would show all annotations/notes for the document
  return (
    <div className="text-center text-stone-400 dark:text-stone-500 py-8">
      <StickyNote className="w-12 h-12 mx-auto mb-3 opacity-50" />
      <p className="text-sm mb-2">No notes yet</p>
      <p className="text-xs">
        Select text in the document to add highlights and notes
      </p>
    </div>
  );
}
