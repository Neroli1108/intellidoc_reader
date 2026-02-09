import { useMemo, useState } from "react";
import { Highlighter, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useCategoryStore, HighlightCategory } from "../../stores/categoryStore";
import { useAnnotationStore } from "../../stores/annotationStore";
import { CategoryManager } from "./CategoryManager";

interface HighlightLegendProps {
  onCategoryClick?: (categoryId: string) => void;
}

export function HighlightLegend({ onCategoryClick }: HighlightLegendProps) {
  const { categories } = useCategoryStore();
  const { pdfAnnotations, setJumpTarget } = useAnnotationStore();
  const [showManager, setShowManager] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const annotation of pdfAnnotations) {
      if (annotation.type === "highlight" && annotation.categoryId) {
        counts[annotation.categoryId] = (counts[annotation.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [pdfAnnotations]);

  // Get total highlight count
  const totalHighlights = pdfAnnotations.filter((a) => a.type === "highlight").length;

  // Sort categories by order
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // Get annotations for a specific category
  const getAnnotationsForCategory = (categoryId: string) => {
    return pdfAnnotations.filter(
      (a) => a.type === "highlight" && a.categoryId === categoryId
    );
  };

  const handleCategoryClick = (category: HighlightCategory) => {
    if (expandedCategory === category.id) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category.id);
    }
    onCategoryClick?.(category.id);
  };

  const handleAnnotationClick = (annotation: typeof pdfAnnotations[0]) => {
    setJumpTarget(annotation);
  };

  if (totalHighlights === 0) {
    return (
      <div className="text-center text-stone-400 dark:text-stone-500 py-8">
        <Highlighter className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm mb-2">No highlights yet</p>
        <p className="text-xs">Select text in the document to add highlights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            Highlight Summary
          </p>
          <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">
            {totalHighlights} highlight{totalHighlights !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowManager(true)}
          className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          title="Manage categories"
        >
          <Settings className="w-4 h-4 text-stone-400" />
        </button>
      </div>

      {/* Category breakdown */}
      <div className="space-y-1">
        {sortedCategories.map((category) => {
          const count = categoryCounts[category.id] || 0;
          if (count === 0) return null;

          const isExpanded = expandedCategory === category.id;
          const annotations = isExpanded ? getAnnotationsForCategory(category.id) : [];

          return (
            <div key={category.id}>
              <button
                onClick={() => handleCategoryClick(category)}
                className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                  isExpanded
                    ? "bg-stone-100 dark:bg-stone-800"
                    : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 text-sm text-stone-700 dark:text-stone-300 truncate">
                  {category.name}
                </span>
                <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                  {count}
                </span>
                {count > 0 && (
                  isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )
                )}
              </button>

              {/* Expanded annotations list */}
              {isExpanded && annotations.length > 0 && (
                <div className="ml-6 mt-1 space-y-1">
                  {annotations.map((annotation) => (
                    <button
                      key={annotation.id}
                      onClick={() => handleAnnotationClick(annotation)}
                      className="w-full text-left p-2 rounded-md text-xs bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 transition-colors"
                    >
                      <p className="text-stone-600 dark:text-stone-400 line-clamp-2 italic">
                        &ldquo;{annotation.text}&rdquo;
                      </p>
                      <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1">
                        Page {annotation.pageNum}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Show uncategorized highlights if any */}
        {pdfAnnotations.filter(
          (a) => a.type === "highlight" && !a.categoryId
        ).length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50">
            <span className="w-4 h-4 rounded-full flex-shrink-0 bg-stone-300 dark:bg-stone-600" />
            <span className="flex-1 text-sm text-stone-500 dark:text-stone-400 italic">
              Uncategorized
            </span>
            <span className="text-xs text-stone-400 dark:text-stone-500 tabular-nums">
              {pdfAnnotations.filter((a) => a.type === "highlight" && !a.categoryId).length}
            </span>
          </div>
        )}
      </div>

      {/* Category manager modal */}
      <CategoryManager isOpen={showManager} onClose={() => setShowManager(false)} />
    </div>
  );
}
