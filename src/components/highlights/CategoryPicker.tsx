import { useState } from "react";
import { Plus, Settings } from "lucide-react";
import { useCategoryStore, HighlightCategory } from "../../stores/categoryStore";
import { ColorPicker } from "./ColorPicker";

interface CategoryPickerProps {
  onSelectCategory: (category: HighlightCategory) => void;
  onOpenManager?: () => void;
}

export function CategoryPicker({
  onSelectCategory,
  onOpenManager,
}: CategoryPickerProps) {
  const { categories, recentCategoryIds, addCategory, markCategoryUsed } =
    useCategoryStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#FDE047");

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // Get recent categories
  const recentCategories = recentCategoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c): c is HighlightCategory => c !== undefined)
    .slice(0, 4);

  const handleSelect = (category: HighlightCategory) => {
    markCategoryUsed(category.id);
    onSelectCategory(category);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;

    const newCategory = addCategory({
      name: newCategoryName.trim(),
      color: newCategoryColor,
      isCustom: true,
    });

    setNewCategoryName("");
    setNewCategoryColor("#FDE047");
    setShowCreateForm(false);

    handleSelect(newCategory);
  };

  return (
    <div className="w-64 bg-white dark:bg-stone-800 rounded-lg shadow-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Recently used section */}
      {recentCategories.length > 0 && (
        <div className="p-2 border-b border-stone-200 dark:border-stone-700">
          <p className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 dark:text-stone-500 mb-1.5 px-1">
            Recent
          </p>
          <div className="flex gap-1">
            {recentCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelect(category)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate max-w-[60px]">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All categories */}
      <div className="max-h-48 overflow-y-auto p-1">
        {sortedCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleSelect(category)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors text-left"
          >
            <span
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <span className="flex-1 truncate text-stone-700 dark:text-stone-300">
              {category.name}
            </span>
            {category.description && (
              <span className="text-[10px] text-stone-400 dark:text-stone-500 truncate max-w-[80px]">
                {category.description}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create new category form */}
      {showCreateForm ? (
        <div className="p-2 border-t border-stone-200 dark:border-stone-700 space-y-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name..."
            className="w-full px-2 py-1.5 text-sm rounded-md border border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateCategory();
              if (e.key === "Escape") setShowCreateForm(false);
            }}
          />
          <ColorPicker
            selectedColor={newCategoryColor}
            onColorChange={setNewCategoryColor}
            showHexInput={false}
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="flex-1 px-2 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="flex-1 px-2 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create
            </button>
          </div>
        </div>
      ) : (
        <div className="p-1 border-t border-stone-200 dark:border-stone-700 flex gap-1">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Category
          </button>
          {onOpenManager && (
            <button
              onClick={onOpenManager}
              className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-md transition-colors"
              title="Manage Categories"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Inline version for annotation popup
export function CategoryPickerInline({
  onSelectCategory,
}: {
  onSelectCategory: (category: HighlightCategory) => void;
}) {
  const { categories, markCategoryUsed } = useCategoryStore();
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const handleSelect = (category: HighlightCategory) => {
    markCategoryUsed(category.id);
    onSelectCategory(category);
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-1">
      {sortedCategories.slice(0, 6).map((category) => (
        <button
          key={category.id}
          onClick={() => handleSelect(category)}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
          title={category.description || category.name}
        >
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="text-stone-700 dark:text-stone-300 max-w-[60px] truncate">
            {category.name}
          </span>
        </button>
      ))}
    </div>
  );
}
