import { create } from "zustand";
import { hexToRgba } from "../constants/colors";

export interface HighlightCategory {
  id: string;
  name: string;
  color: string; // hex color "#EF4444"
  description?: string;
  order: number;
  isCustom: boolean;
}

// Default categories created on first load
const DEFAULT_CATEGORIES: HighlightCategory[] = [
  {
    id: "important",
    name: "Important",
    color: "#F87171", // red
    description: "Key points and critical information",
    order: 0,
    isCustom: false,
  },
  {
    id: "definition",
    name: "Definition",
    color: "#60A5FA", // blue
    description: "Terms and definitions",
    order: 1,
    isCustom: false,
  },
  {
    id: "example",
    name: "Example",
    color: "#4ADE80", // green
    description: "Examples and illustrations",
    order: 2,
    isCustom: false,
  },
  {
    id: "question",
    name: "Question",
    color: "#C084FC", // purple
    description: "To revisit or research further",
    order: 3,
    isCustom: false,
  },
  {
    id: "reference",
    name: "Reference",
    color: "#FB923C", // orange
    description: "Citations and references",
    order: 4,
    isCustom: false,
  },
  {
    id: "general",
    name: "General",
    color: "#FDE047", // yellow
    description: "General highlights",
    order: 5,
    isCustom: false,
  },
];

const STORAGE_KEY = "highlight_categories";
const RECENT_CATEGORIES_KEY = "recent_categories";
const MAX_RECENT = 4;

// Persistence helpers
function saveCategories(categories: HighlightCategory[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error("Failed to save categories:", e);
  }
}

function loadCategories(): HighlightCategory[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load categories:", e);
  }
  return [...DEFAULT_CATEGORIES];
}

function saveRecentCategories(ids: string[]) {
  try {
    localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(ids));
  } catch (e) {
    console.error("Failed to save recent categories:", e);
  }
}

function loadRecentCategories(): string[] {
  try {
    const data = localStorage.getItem(RECENT_CATEGORIES_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load recent categories:", e);
  }
  return [];
}

interface CategoryStore {
  categories: HighlightCategory[];
  recentCategoryIds: string[];

  // CRUD operations
  addCategory: (category: Omit<HighlightCategory, "id" | "order">) => HighlightCategory;
  updateCategory: (id: string, updates: Partial<Omit<HighlightCategory, "id">>) => void;
  deleteCategory: (id: string) => void;
  reorderCategories: (orderedIds: string[]) => void;

  // Reset to defaults
  resetToDefaults: () => void;

  // Bulk operations for AI scheme
  applyScheme: (categories: Omit<HighlightCategory, "id" | "order">[]) => void;

  // Track recent usage
  markCategoryUsed: (id: string) => void;

  // Lookups
  getCategoryById: (id: string) => HighlightCategory | undefined;
  getCategoryByColor: (color: string) => HighlightCategory | undefined;

  // Color helper
  getCategoryRgba: (categoryId: string, opacity?: number) => string;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: loadCategories(),
  recentCategoryIds: loadRecentCategories(),

  addCategory: (categoryData) => {
    const { categories } = get();
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const order = Math.max(...categories.map((c) => c.order), -1) + 1;

    const newCategory: HighlightCategory = {
      ...categoryData,
      id,
      order,
      isCustom: true,
    };

    const updated = [...categories, newCategory];
    saveCategories(updated);
    set({ categories: updated });
    return newCategory;
  },

  updateCategory: (id, updates) => {
    const { categories } = get();
    const updated = categories.map((c) =>
      c.id === id ? { ...c, ...updates } : c
    );
    saveCategories(updated);
    set({ categories: updated });
  },

  deleteCategory: (id) => {
    const { categories } = get();
    // Don't allow deleting the last category
    if (categories.length <= 1) return;

    // Only allow deleting custom categories
    const category = categories.find((c) => c.id === id);
    if (!category?.isCustom) return;

    const updated = categories.filter((c) => c.id !== id);
    saveCategories(updated);

    // Also remove from recent
    const { recentCategoryIds } = get();
    const updatedRecent = recentCategoryIds.filter((rid) => rid !== id);
    saveRecentCategories(updatedRecent);

    set({ categories: updated, recentCategoryIds: updatedRecent });
  },

  reorderCategories: (orderedIds) => {
    const { categories } = get();
    const reordered = orderedIds
      .map((id, index) => {
        const category = categories.find((c) => c.id === id);
        return category ? { ...category, order: index } : null;
      })
      .filter((c): c is HighlightCategory => c !== null);

    saveCategories(reordered);
    set({ categories: reordered });
  },

  resetToDefaults: () => {
    const defaults = [...DEFAULT_CATEGORIES];
    saveCategories(defaults);
    saveRecentCategories([]);
    set({ categories: defaults, recentCategoryIds: [] });
  },

  applyScheme: (schemeCategories) => {
    const { categories } = get();

    // Keep existing custom categories but add new ones
    const maxOrder = Math.max(...categories.map((c) => c.order), -1);
    const newCategories = schemeCategories.map((cat, index) => ({
      ...cat,
      id: `cat_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 7)}`,
      order: maxOrder + 1 + index,
      isCustom: true,
    }));

    const updated = [...categories, ...newCategories];
    saveCategories(updated);
    set({ categories: updated });
  },

  markCategoryUsed: (id) => {
    const { recentCategoryIds } = get();
    const filtered = recentCategoryIds.filter((rid) => rid !== id);
    const updated = [id, ...filtered].slice(0, MAX_RECENT);
    saveRecentCategories(updated);
    set({ recentCategoryIds: updated });
  },

  getCategoryById: (id) => {
    return get().categories.find((c) => c.id === id);
  },

  getCategoryByColor: (color) => {
    const normalizedColor = color.toUpperCase();
    return get().categories.find(
      (c) => c.color.toUpperCase() === normalizedColor
    );
  },

  getCategoryRgba: (categoryId, opacity = 0.35) => {
    const category = get().getCategoryById(categoryId);
    if (!category) return `rgba(253, 224, 71, ${opacity})`; // default yellow
    return hexToRgba(category.color, opacity);
  },
}));

// Helper to migrate legacy color names to category IDs
export function migrateLegacyColor(colorName: string): string {
  const colorToCategoryMap: Record<string, string> = {
    yellow: "general",
    green: "example",
    blue: "definition",
    purple: "question",
    red: "important",
    orange: "reference",
  };

  return colorToCategoryMap[colorName] || "general";
}

// Export defaults for testing/reset
export { DEFAULT_CATEGORIES };
