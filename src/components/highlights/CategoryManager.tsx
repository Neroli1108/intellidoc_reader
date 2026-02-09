import { useState } from "react";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Download,
  Upload,
  RotateCcw,
} from "lucide-react";
import {
  useCategoryStore,
  HighlightCategory,
} from "../../stores/categoryStore";
import { useAnnotationStore } from "../../stores/annotationStore";
import { ColorPicker } from "./ColorPicker";

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryManager({ isOpen, onClose }: CategoryManagerProps) {
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories,
    resetToDefaults,
  } = useCategoryStore();
  const { updateCategoryColor } = useAnnotationStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const startEditing = (category: HighlightCategory) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditDescription(category.description || "");
    setEditColor(category.color);
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;

    const oldCategory = categories.find((c) => c.id === editingId);
    const colorChanged = oldCategory && oldCategory.color !== editColor;

    updateCategory(editingId, {
      name: editName.trim(),
      description: editDescription.trim() || undefined,
      color: editColor,
    });

    // If color changed, update all annotations with this category
    if (colorChanged) {
      updateCategoryColor(editingId, editColor);
    }

    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Delete this category? Annotations will keep their colors.")) {
      deleteCategory(id);
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const orderedIds = sortedCategories.map((c) => c.id);
    const draggedIndex = orderedIds.indexOf(draggedId);
    const targetIndex = orderedIds.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      orderedIds.splice(draggedIndex, 1);
      orderedIds.splice(targetIndex, 0, draggedId);
      reorderCategories(orderedIds);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const handleExport = () => {
    const data = JSON.stringify(categories, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "highlight-categories.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as HighlightCategory[];

        // Validate structure
        if (
          Array.isArray(imported) &&
          imported.every(
            (c) =>
              typeof c.name === "string" &&
              typeof c.color === "string"
          )
        ) {
          // Add imported categories
          imported.forEach((cat) => {
            addCategory({
              name: cat.name,
              color: cat.color,
              description: cat.description,
              isCustom: true,
            });
          });
        } else {
          alert("Invalid category file format");
        }
      } catch {
        alert("Failed to import categories");
      }
    };
    input.click();
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Reset to default categories? Custom categories will be removed."
      )
    ) {
      resetToDefaults();
    }
  };

  const handleAddNew = () => {
    const newCategory = addCategory({
      name: "New Category",
      color: "#FDE047",
      isCustom: true,
    });
    startEditing(newCategory);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            Manage Categories
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Export categories"
            >
              <Download className="w-4 h-4 text-stone-500" />
            </button>
            <button
              onClick={handleImport}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Import categories"
            >
              <Upload className="w-4 h-4 text-stone-500" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw className="w-4 h-4 text-stone-500" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
        </div>

        {/* Category list */}
        <div className="max-h-96 overflow-y-auto p-2">
          {sortedCategories.map((category) => (
            <div
              key={category.id}
              draggable
              onDragStart={() => handleDragStart(category.id)}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-start gap-2 p-2 rounded-lg mb-1 ${
                draggedId === category.id
                  ? "opacity-50 bg-stone-100 dark:bg-stone-800"
                  : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
              } ${editingId === category.id ? "bg-stone-100 dark:bg-stone-800" : ""}`}
            >
              <GripVertical className="w-4 h-4 mt-2.5 text-stone-400 cursor-grab flex-shrink-0" />

              {editingId === category.id ? (
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Category name"
                    className="w-full px-2 py-1.5 text-sm rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-2 py-1.5 text-sm rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <ColorPicker
                    selectedColor={editColor}
                    onColorChange={setEditColor}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 px-2 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      disabled={!editName.trim()}
                      className="flex-1 px-2 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => startEditing(category)}
                    className="flex-1 flex items-center gap-2 text-left py-1"
                  >
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
                        {category.name}
                      </p>
                      {category.description && (
                        <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                          {category.description}
                        </p>
                      )}
                    </div>
                    {!category.isCustom && (
                      <span className="text-[10px] uppercase text-stone-400 dark:text-stone-500 px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 rounded">
                        Default
                      </span>
                    )}
                  </button>
                  {category.isCustom && (
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1.5 text-stone-400 hover:text-red-500 rounded-md transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add new button */}
        <div className="p-2 border-t border-stone-200 dark:border-stone-800">
          <button
            onClick={handleAddNew}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>
    </div>
  );
}
