import { create } from "zustand";

export interface PDFAnnotation {
  id: string;
  pageNum: number;
  text: string;
  type: "highlight" | "underline" | "strikethrough";
  color: string;
  categoryId?: string;  // Reference to highlight category
  note?: string;  // Optional note attached to any annotation (mainly highlights)
  spanTexts?: string[];
}

// Simple string hash for creating storage keys
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "annot_" + Math.abs(hash).toString(36);
}

// Persistence helpers
function saveToStorage(key: string, annotations: PDFAnnotation[]) {
  try {
    localStorage.setItem(key, JSON.stringify(annotations));
  } catch (e) {
    console.error("Failed to save annotations:", e);
  }
}

// Legacy color to category ID mapping for migration
const LEGACY_COLOR_TO_CATEGORY: Record<string, string> = {
  yellow: "general",
  green: "example",
  blue: "definition",
  purple: "question",
  red: "important",
  orange: "reference",
};

function migrateAnnotation(annotation: PDFAnnotation): PDFAnnotation {
  // If annotation already has a categoryId, no migration needed
  if (annotation.categoryId) return annotation;

  // For highlights, try to map the color to a category
  if (annotation.type === "highlight") {
    const categoryId = LEGACY_COLOR_TO_CATEGORY[annotation.color];
    if (categoryId) {
      return { ...annotation, categoryId };
    }
  }

  return annotation;
}

function loadFromStorage(key: string): PDFAnnotation[] {
  try {
    const data = localStorage.getItem(key);
    if (data) {
      const annotations: PDFAnnotation[] = JSON.parse(data);
      // Migrate legacy annotations to include categoryId
      return annotations.map(migrateAnnotation);
    }
  } catch (e) {
    console.error("Failed to load annotations:", e);
  }
  return [];
}

interface AnnotationStore {
  pdfAnnotations: PDFAnnotation[];
  addAnnotation: (annotation: PDFAnnotation) => void;
  updateAnnotation: (id: string, updates: Partial<PDFAnnotation>) => void;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;

  // Document hash for persistence
  documentHash: string | null;
  setDocumentHash: (hash: string) => void;
  initForDocument: (filePath: string, contentSample: string) => void;

  // When an annotation is clicked in Sidebar, set this so DocumentViewer can scroll + highlight
  jumpTarget: PDFAnnotation | null;
  setJumpTarget: (annotation: PDFAnnotation | null) => void;

  // The annotation currently "selected" (persistent highlight)
  selectedAnnotationId: string | null;
  setSelectedAnnotationId: (id: string | null) => void;

  // Update all annotations with a specific category when category color changes
  updateCategoryColor: (categoryId: string, newColor: string) => void;

  // Get counts per category for legend
  getCategoryCounts: () => Record<string, number>;
}

export const useAnnotationStore = create<AnnotationStore>((set) => ({
  pdfAnnotations: [],

  addAnnotation: (annotation) => {
    set((state) => {
      const updated = [...state.pdfAnnotations, annotation];
      // Persist
      const { documentHash } = state;
      if (documentHash) saveToStorage(documentHash, updated);
      return { pdfAnnotations: updated };
    });
  },

  updateAnnotation: (id, updates) => {
    set((state) => {
      const updated = state.pdfAnnotations.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      const { documentHash } = state;
      if (documentHash) saveToStorage(documentHash, updated);
      return { pdfAnnotations: updated };
    });
  },

  removeAnnotation: (id) => {
    set((state) => {
      const updated = state.pdfAnnotations.filter((a) => a.id !== id);
      const { documentHash } = state;
      if (documentHash) saveToStorage(documentHash, updated);
      return { pdfAnnotations: updated };
    });
  },

  clearAnnotations: () =>
    set({ pdfAnnotations: [], selectedAnnotationId: null, jumpTarget: null }),

  // Persistence
  documentHash: null,
  setDocumentHash: (hash) => set({ documentHash: hash }),

  initForDocument: (filePath, contentSample) => {
    // Create a hash from file path + content sample
    const key = hashString(filePath + "|" + contentSample.slice(0, 2000));
    const saved = loadFromStorage(key);
    set({
      documentHash: key,
      pdfAnnotations: saved,
      selectedAnnotationId: null,
      jumpTarget: null,
    });
  },

  jumpTarget: null,
  setJumpTarget: (annotation) => set({ jumpTarget: annotation }),

  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),

  updateCategoryColor: (categoryId, newColor) => {
    set((state) => {
      const updated = state.pdfAnnotations.map((a) =>
        a.categoryId === categoryId ? { ...a, color: newColor } : a
      );
      const { documentHash } = state;
      if (documentHash) saveToStorage(documentHash, updated);
      return { pdfAnnotations: updated };
    });
  },

  getCategoryCounts: () => {
    const counts: Record<string, number> = {};
    const { pdfAnnotations } = useAnnotationStore.getState();
    for (const annotation of pdfAnnotations) {
      if (annotation.categoryId) {
        counts[annotation.categoryId] = (counts[annotation.categoryId] || 0) + 1;
      }
    }
    return counts;
  },
}));
