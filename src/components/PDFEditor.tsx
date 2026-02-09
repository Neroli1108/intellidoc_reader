import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Type,
  Image,
  Highlighter,
  StickyNote,
  Square,
  Circle,
  Minus,
  ArrowRight,
  Trash2,
  RotateCw,
  FileInput,
  Scissors,
  Merge,
  Undo2,
  Redo2,
  Save,
  Download,
  PenTool,
  Stamp,
  Link as LinkIcon,
  Bookmark,
  Lock,
  Eraser,
  X,
} from "lucide-react";

interface PDFEditorProps {
  documentId: string;
  documentPath: string;
  onClose: () => void;
}

type EditTool =
  | "select"
  | "text"
  | "image"
  | "highlight"
  | "note"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "signature"
  | "stamp"
  | "link"
  | "redact"
  | "eraser";

interface EditOperation {
  id: string;
  operation_type: string;
  page: number | null;
  description: string;
  timestamp: string;
}

export function PDFEditor({ documentId, documentPath, onClose }: PDFEditorProps) {
  const [activeTool, setActiveTool] = useState<EditTool>("select");
  const [operations, setOperations] = useState<EditOperation[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentColor, setCurrentColor] = useState("#FFFF00");
  const [fontSize, setFontSize] = useState(12);
  const [strokeWidth, setStrokeWidth] = useState(2);

  const tools: { id: EditTool; icon: React.ReactNode; label: string; group: string }[] = [
    { id: "select", icon: <span className="text-lg">↖</span>, label: "Select", group: "basic" },
    { id: "text", icon: <Type className="w-4 h-4" />, label: "Add Text", group: "basic" },
    { id: "image", icon: <Image className="w-4 h-4" />, label: "Add Image", group: "basic" },
    { id: "highlight", icon: <Highlighter className="w-4 h-4" />, label: "Highlight", group: "annotate" },
    { id: "note", icon: <StickyNote className="w-4 h-4" />, label: "Sticky Note", group: "annotate" },
    { id: "rectangle", icon: <Square className="w-4 h-4" />, label: "Rectangle", group: "shapes" },
    { id: "circle", icon: <Circle className="w-4 h-4" />, label: "Circle", group: "shapes" },
    { id: "line", icon: <Minus className="w-4 h-4" />, label: "Line", group: "shapes" },
    { id: "arrow", icon: <ArrowRight className="w-4 h-4" />, label: "Arrow", group: "shapes" },
    { id: "signature", icon: <PenTool className="w-4 h-4" />, label: "Signature", group: "sign" },
    { id: "stamp", icon: <Stamp className="w-4 h-4" />, label: "Stamp", group: "sign" },
    { id: "link", icon: <LinkIcon className="w-4 h-4" />, label: "Add Link", group: "advanced" },
    { id: "redact", icon: <Lock className="w-4 h-4" />, label: "Redact", group: "advanced" },
    { id: "eraser", icon: <Eraser className="w-4 h-4" />, label: "Eraser", group: "basic" },
  ];

  const colors = [
    "#FFFF00", // Yellow
    "#00FF00", // Green
    "#00BFFF", // Blue
    "#FF69B4", // Pink
    "#FF0000", // Red
    "#000000", // Black
    "#FFFFFF", // White
  ];

  const handleUndo = useCallback(async () => {
    try {
      const undone = await invoke<EditOperation | null>("undo_edit_operation", {
        documentId,
      });
      if (undone) {
        setOperations((prev) => prev.slice(0, -1));
      }
    } catch (error) {
      console.error("Failed to undo:", error);
    }
  }, [documentId]);

  const handleSave = useCallback(async () => {
    try {
      await invoke("save_document", {
        documentId,
        outputPath: null, // Save to original
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }, [documentId]);

  const handleSaveAs = useCallback(async () => {
    try {
      // TODO: Open save dialog
      const outputPath = `${documentPath.replace(".pdf", "_edited.pdf")}`;
      await invoke("save_document", {
        documentId,
        outputPath,
      });
    } catch (error) {
      console.error("Failed to save as:", error);
    }
  }, [documentId, documentPath]);

  const handleMergePDFs = useCallback(async () => {
    // TODO: Open file picker for PDFs to merge
    console.log("Merge PDFs");
  }, []);

  const handleSplitPDF = useCallback(async () => {
    // TODO: Open split dialog
    console.log("Split PDF");
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 dark:bg-stone-950">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5 text-stone-600 dark:text-stone-400" />
          </button>
          <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
            PDF Editor
          </span>
          {hasUnsavedChanges && (
            <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleUndo}
            disabled={operations.length === 0}
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
            title="Undo"
          >
            <Undo2 className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors opacity-50"
            title="Redo"
            disabled
          >
            <Redo2 className="w-4 h-4 text-stone-600 dark:text-stone-400" />
          </button>

          <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-2" />

          <button
            onClick={handleMergePDFs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Merge PDFs"
          >
            <Merge className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span className="text-sm text-stone-600 dark:text-stone-400">Merge</span>
          </button>
          <button
            onClick={handleSplitPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Split PDF"
          >
            <Scissors className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span className="text-sm text-stone-600 dark:text-stone-400">Split</span>
          </button>

          <div className="w-px h-6 bg-stone-200 dark:bg-stone-700 mx-2" />

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            <span className="text-sm font-medium">Save</span>
          </button>
          <button
            onClick={handleSaveAs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <Download className="w-4 h-4 text-stone-600 dark:text-stone-400" />
            <span className="text-sm text-stone-600 dark:text-stone-400">Save As</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar - Tools */}
        <div className="w-14 flex flex-col items-center py-4 gap-1 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800">
          {tools.map((tool, index) => {
            // Add separator between groups
            const prevTool = tools[index - 1];
            const showSeparator = prevTool && prevTool.group !== tool.group;

            return (
              <div key={tool.id}>
                {showSeparator && (
                  <div className="w-8 h-px bg-stone-200 dark:bg-stone-700 my-2" />
                )}
                <button
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                    activeTool === tool.id
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                      : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                  title={tool.label}
                >
                  {tool.icon}
                </button>
              </div>
            );
          })}
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-4xl mx-auto bg-white dark:bg-stone-900 shadow-xl rounded-lg min-h-[800px] relative">
            {/* Placeholder for PDF canvas */}
            <div className="absolute inset-0 flex items-center justify-center text-stone-400 dark:text-stone-600">
              <div className="text-center">
                <FileInput className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">PDF Canvas</p>
                <p className="text-sm">
                  Select a tool from the left sidebar and click to add elements
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-64 bg-white dark:bg-stone-900 border-l border-stone-200 dark:border-stone-800 p-4">
          <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-4">
            Properties
          </h3>

          {/* Color Picker */}
          <div className="mb-4">
            <label className="text-xs text-stone-500 dark:text-stone-400 mb-2 block">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    currentColor === color
                      ? "border-indigo-500 scale-110"
                      : "border-stone-200 dark:border-stone-700"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Font Size (for text tool) */}
          {activeTool === "text" && (
            <div className="mb-4">
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-2 block">
                Font Size
              </label>
              <input
                type="range"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-stone-600 dark:text-stone-400">
                {fontSize}px
              </span>
            </div>
          )}

          {/* Stroke Width (for shapes) */}
          {["rectangle", "circle", "line", "arrow"].includes(activeTool) && (
            <div className="mb-4">
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-2 block">
                Stroke Width
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
              <span className="text-sm text-stone-600 dark:text-stone-400">
                {strokeWidth}px
              </span>
            </div>
          )}

          {/* Operations History */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-3">
              Edit History
            </h3>
            {operations.length === 0 ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                No edits yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {operations.map((op) => (
                  <div
                    key={op.id}
                    className="p-2 rounded bg-stone-50 dark:bg-stone-800 text-xs"
                  >
                    <div className="font-medium text-stone-700 dark:text-stone-300">
                      {op.description}
                    </div>
                    {op.page && (
                      <div className="text-stone-500 dark:text-stone-500">
                        Page {op.page}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Page Operations */}
          <div className="mt-6 pt-4 border-t border-stone-200 dark:border-stone-800">
            <h3 className="text-sm font-medium text-stone-800 dark:text-stone-200 mb-3">
              Page Operations
            </h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <FileInput className="w-4 h-4 text-stone-500" />
                <span className="text-stone-700 dark:text-stone-300">Insert Page</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <Trash2 className="w-4 h-4 text-stone-500" />
                <span className="text-stone-700 dark:text-stone-300">Delete Page</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <RotateCw className="w-4 h-4 text-stone-500" />
                <span className="text-stone-700 dark:text-stone-300">Rotate Page</span>
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                <Bookmark className="w-4 h-4 text-stone-500" />
                <span className="text-stone-700 dark:text-stone-300">Add Bookmark</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
