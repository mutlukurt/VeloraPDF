import { create } from "zustand";

export type Point = { x: number; y: number };

type PageMetrics = {
  pageWidth?: number;
  pageHeight?: number;
};

export type Annotation =
  | (PageMetrics & {
      id: string;
      page: number;
      type: "highlight";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
      createdAt: number;
    })
  | (PageMetrics & {
      id: string;
      page: number;
      type: "pen";
      points: Point[];
      color: string;
      strokeWidth: number;
      createdAt: number;
    })
  | (PageMetrics & {
      id: string;
      page: number;
      type: "rectangle" | "circle" | "arrow" | "underline" | "strike";
      x: number;
      y: number;
      width: number;
      height: number;
      color: string;
      strokeWidth: number;
      createdAt: number;
    })
  | (PageMetrics & {
      id: string;
      page: number;
      type: "signature";
      x: number;
      y: number;
      width: number;
      height: number;
      dataUrl: string;
      createdAt: number;
    })
  | (PageMetrics & {
      id: string;
      page: number;
      type: "text";
      x: number;
      y: number;
      text: string;
      color: string;
      fontSize: number;
      createdAt: number;
    })
  | (PageMetrics & {
      id: string;
      page: number;
      type: "sticky";
      x: number;
      y: number;
      text: string;
      label?: string;
      color: string;
      createdAt: number;
    });

type AnnotationState = {
  annotations: Annotation[];
  selectedId: string | null;
  history: Annotation[][];
  future: Annotation[][];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  duplicateAnnotation: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  undo: () => void;
  redo: () => void;
};

function id() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useAnnotationStore = create<AnnotationState>((set, get) => {
  const withHistory = (next: Annotation[]) => {
    const current = get().annotations;
    set({ annotations: next, history: [...get().history, current].slice(-40), future: [] });
  };

  return {
    annotations: [],
    selectedId: null,
    history: [],
    future: [],
    addAnnotation: (annotation) => withHistory([...get().annotations, annotation]),
    updateAnnotation: (annotationId, patch) =>
      withHistory(get().annotations.map((item) => (item.id === annotationId ? ({ ...item, ...patch } as Annotation) : item))),
    deleteAnnotation: (annotationId) => withHistory(get().annotations.filter((item) => item.id !== annotationId)),
    duplicateAnnotation: (annotationId) => {
      const original = get().annotations.find((item) => item.id === annotationId);
      if (!original) return;
      let copy = { ...original, id: id(), createdAt: Date.now() } as Annotation;
      if (copy.type === "pen") {
        copy = {
          ...copy,
          points: copy.points.map((p) => ({ x: p.x + 16, y: p.y + 16 })),
        };
      } else {
        copy = {
          ...copy,
          x: copy.x + 16,
          y: copy.y + 16,
        } as Annotation;
      }
      withHistory([...get().annotations, copy]);
    },
    setSelectedId: (selectedId) => set({ selectedId }),
    setAnnotations: (annotations) => set({ annotations, selectedId: null, history: [], future: [] }),
    undo: () => {
      const previous = get().history[get().history.length - 1];
      if (!previous) return;
      set({
        annotations: previous,
        history: get().history.slice(0, -1),
        future: [get().annotations, ...get().future].slice(0, 40),
      });
    },
    redo: () => {
      const next = get().future[0];
      if (!next) return;
      set({
        annotations: next,
        history: [...get().history, get().annotations].slice(-40),
        future: get().future.slice(1),
      });
    },
  };
});

export function createAnnotationId() {
  return id();
}
