import { useState } from "react";
import { Check, X, Edit2, Sparkles } from "lucide-react";
import { useCategoryStore } from "../../stores/categoryStore";
import { ColorPickerCompact } from "./ColorPicker";

export interface ParsedCategory {
  name: string;
  color: string;
  description?: string;
}

interface AISchemePreviewProps {
  categories: ParsedCategory[];
  onApply: () => void;
  onCancel: () => void;
  onUpdate: (index: number, updates: Partial<ParsedCategory>) => void;
}

export function AISchemePreview({
  categories,
  onApply,
  onCancel,
  onUpdate,
}: AISchemePreviewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { applyScheme } = useCategoryStore();

  const handleApply = () => {
    applyScheme(
      categories.map((cat) => ({
        name: cat.name,
        color: cat.color,
        description: cat.description,
        isCustom: true,
      }))
    );
    onApply();
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800 p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
          AI-Generated Categories
        </span>
      </div>

      {/* Category preview list */}
      <div className="space-y-2">
        {categories.map((category, index) => (
          <div
            key={index}
            className="flex items-center gap-2 p-2 bg-white dark:bg-stone-900 rounded-md border border-stone-200 dark:border-stone-700"
          >
            {editingIndex === index ? (
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={category.name}
                  onChange={(e) => onUpdate(index, { name: e.target.value })}
                  className="w-full px-2 py-1 text-sm rounded border border-stone-200 dark:border-stone-600 bg-stone-50 dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <ColorPickerCompact
                  selectedColor={category.color}
                  onColorChange={(color) => onUpdate(index, { color })}
                />
                <button
                  onClick={() => setEditingIndex(null)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color }}
                />
                <span className="flex-1 text-sm text-stone-700 dark:text-stone-300">
                  {category.name}
                </span>
                <button
                  onClick={() => setEditingIndex(index)}
                  className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={handleApply}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
        >
          <Check className="w-4 h-4" />
          Apply
        </button>
      </div>
    </div>
  );
}

// Parse highlight scheme from various input formats
export function parseHighlightScheme(input: string): ParsedCategory[] {
  const categories: ParsedCategory[] = [];

  // Color name to hex mapping
  const colorMap: Record<string, string> = {
    red: "#F87171",
    orange: "#FB923C",
    yellow: "#FDE047",
    green: "#4ADE80",
    blue: "#60A5FA",
    purple: "#C084FC",
    pink: "#F472B6",
    teal: "#2DD4BF",
    cyan: "#22D3EE",
    indigo: "#818CF8",
    violet: "#A78BFA",
    rose: "#FB7185",
    emerald: "#34D399",
    amber: "#FBBF24",
    lime: "#A3E635",
    sky: "#38BDF8",
  };

  // Try parsing arrow format: "name -> color; name2 -> color2"
  const arrowPattern = /([^;,]+?)\s*->\s*([a-z]+|#[0-9a-f]{6})/gi;
  let match;
  while ((match = arrowPattern.exec(input)) !== null) {
    const name = match[1].trim();
    const colorInput = match[2].trim().toLowerCase();
    const color = colorInput.startsWith("#")
      ? colorInput.toUpperCase()
      : colorMap[colorInput] || "#FDE047";

    categories.push({ name, color });
  }

  if (categories.length > 0) return categories;

  // Try parsing colon format: "name: color, name2: color2"
  const colonPattern = /([^:,;]+?)\s*:\s*([a-z]+|#[0-9a-f]{6})/gi;
  while ((match = colonPattern.exec(input)) !== null) {
    const name = match[1].trim();
    const colorInput = match[2].trim().toLowerCase();
    const color = colorInput.startsWith("#")
      ? colorInput.toUpperCase()
      : colorMap[colorInput] || "#FDE047";

    categories.push({ name, color });
  }

  if (categories.length > 0) return categories;

  // Try parsing simple list with parentheses: "name (color), name2 (color2)"
  const parenPattern = /([^(,;]+?)\s*\(([^)]+)\)/gi;
  while ((match = parenPattern.exec(input)) !== null) {
    const name = match[1].trim();
    const colorInput = match[2].trim().toLowerCase();
    const color = colorInput.startsWith("#")
      ? colorInput.toUpperCase()
      : colorMap[colorInput] || "#FDE047";

    categories.push({ name, color });
  }

  return categories;
}

// Check if input looks like a scheme command
export function isSchemeCommand(input: string): boolean {
  const lowered = input.toLowerCase().trim();

  // Check for explicit command prefix
  if (lowered.startsWith("/highlight-scheme")) return true;
  if (lowered.startsWith("/categories")) return true;

  // Check for natural language patterns
  const schemePatterns = [
    /create\s+(highlight\s+)?categor(y|ies)/i,
    /add\s+(highlight\s+)?categor(y|ies)/i,
    /set\s+up\s+categor(y|ies)/i,
    /highlight\s+scheme/i,
    /category\s+scheme/i,
    /->\s*(red|blue|green|yellow|purple|orange|pink)/i,
    /:\s*(red|blue|green|yellow|purple|orange|pink)\s*(,|;|$)/i,
  ];

  return schemePatterns.some((pattern) => pattern.test(input));
}
