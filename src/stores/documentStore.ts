import { create } from "zustand";

interface Document {
  id: string;
  doc_type: string;
  path: string;
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
  bounding_box: BoundingBox | null;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DocumentMetadata {
  page_count: number;
  word_count: number;
  creation_date: string | null;
  modification_date: string | null;
  subject: string | null;
  keywords: string[];
}

interface Annotation {
  id: string;
  document_id: string;
  page_number: number;
  paragraph_id: string | null;
  start_offset: number;
  end_offset: number;
  selected_text: string;
  highlight_color: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

interface DocumentStore {
  // State
  currentDocument: Document | null;
  annotations: Annotation[];
  recentDocuments: Document[];
  currentPage: number;
  
  // Actions
  setCurrentDocument: (doc: Document | null) => void;
  loadAnnotations: (annotations: Annotation[]) => void;
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, update: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  setCurrentPage: (page: number) => void;
  addRecentDocument: (doc: Document) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  // Initial state
  currentDocument: null,
  annotations: [],
  recentDocuments: [],
  currentPage: 1,
  
  // Actions
  setCurrentDocument: (doc) => set({ 
    currentDocument: doc, 
    currentPage: 1,
    annotations: [] // Clear annotations when changing documents
  }),
  
  loadAnnotations: (annotations) => set({ annotations }),
  
  addAnnotation: (annotation) => set((state) => ({
    annotations: [...state.annotations, annotation]
  })),
  
  updateAnnotation: (id, update) => set((state) => ({
    annotations: state.annotations.map((a) =>
      a.id === id ? { ...a, ...update } : a
    )
  })),
  
  deleteAnnotation: (id) => set((state) => ({
    annotations: state.annotations.filter((a) => a.id !== id)
  })),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  addRecentDocument: (doc) => set((state) => {
    // Remove if already exists, then add to front
    const filtered = state.recentDocuments.filter((d) => d.id !== doc.id);
    return {
      recentDocuments: [doc, ...filtered].slice(0, 10) // Keep max 10
    };
  }),
}));
