import { create } from "zustand";
import type { Annotation, AnnotationTool } from "@/types";
import { annotationColors } from "@/theme/tokens";
import { loadAnnotations, saveAnnotationsByFile } from "@/lib/pdf/pdfStorage";

type HistoryEntry = {
  before: Annotation[];
  after: Annotation[];
};

type AnnotationState = {
  activeTool: AnnotationTool;
  color: string;
  palmRejection: boolean;
  annotationsByFile: Record<string, Annotation[]>;
  undoStackByFile: Record<string, HistoryEntry[]>;
  redoStackByFile: Record<string, HistoryEntry[]>;
  selectedAnnotationId: string | null;
  hydrate: () => Promise<void>;
  setActiveTool: (tool: AnnotationTool) => void;
  setColor: (color: string) => void;
  setPalmRejection: (enabled: boolean) => void;
  annotationsForFile: (fileId?: string | null) => Annotation[];
  canUndoForFile: (fileId?: string | null) => boolean;
  canRedoForFile: (fileId?: string | null) => boolean;
  addAnnotation: (fileId: string, annotation: Annotation) => Promise<void>;
  updateAnnotation: (fileId: string, annotation: Annotation) => Promise<void>;
  deleteAnnotation: (fileId: string, annotationId: string) => Promise<void>;
  duplicateAnnotation: (fileId: string, annotationId: string) => Promise<void>;
  undo: (fileId: string) => Promise<void>;
  redo: (fileId: string) => Promise<void>;
};

function arraysMatchById(a: Annotation[], b: Annotation[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => item.id === b[index]?.id);
}

async function commitFileAnnotations(
  set: (state: Partial<AnnotationState>) => void,
  get: () => AnnotationState,
  fileId: string,
  after: Annotation[],
  selectedAnnotationId: string | null = get().selectedAnnotationId
) {
  const before = get().annotationsByFile[fileId] ?? [];
  if (arraysMatchById(before, after)) return;
  const next = { ...get().annotationsByFile, [fileId]: after };
  const undoStack = [...(get().undoStackByFile[fileId] ?? []), { before, after }].slice(-80);
  set({
    annotationsByFile: next,
    selectedAnnotationId,
    undoStackByFile: { ...get().undoStackByFile, [fileId]: undoStack },
    redoStackByFile: { ...get().redoStackByFile, [fileId]: [] }
  });
  await saveAnnotationsByFile(next);
}

export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  activeTool: "select",
  color: annotationColors.yellow,
  palmRejection: true,
  annotationsByFile: {},
  undoStackByFile: {},
  redoStackByFile: {},
  selectedAnnotationId: null,
  hydrate: async () => set({ annotationsByFile: await loadAnnotations() }),
  setActiveTool: (activeTool) => set({ activeTool }),
  setColor: (color) => set({ color }),
  setPalmRejection: (palmRejection) => set({ palmRejection }),
  annotationsForFile: (fileId) => (fileId ? get().annotationsByFile[fileId] ?? [] : []),
  canUndoForFile: (fileId) => Boolean(fileId && (get().undoStackByFile[fileId]?.length ?? 0) > 0),
  canRedoForFile: (fileId) => Boolean(fileId && (get().redoStackByFile[fileId]?.length ?? 0) > 0),
  addAnnotation: async (fileId, annotation) => {
    await commitFileAnnotations(set, get, fileId, [...(get().annotationsByFile[fileId] ?? []), annotation]);
  },
  updateAnnotation: async (fileId, annotation) => {
    await commitFileAnnotations(
      set,
      get,
      fileId,
      (get().annotationsByFile[fileId] ?? []).map((item) => (item.id === annotation.id ? annotation : item))
    );
  },
  deleteAnnotation: async (fileId, annotationId) => {
    await commitFileAnnotations(
      set,
      get,
      fileId,
      (get().annotationsByFile[fileId] ?? []).filter((item) => item.id !== annotationId),
      null
    );
  },
  duplicateAnnotation: async (fileId, annotationId) => {
    const item = (get().annotationsByFile[fileId] ?? []).find((annotation) => annotation.id === annotationId);
    if (!item) return;
    await get().addAnnotation(fileId, { ...item, id: `${item.id}_copy_${Date.now()}`, createdAt: Date.now() } as Annotation);
  },
  undo: async (fileId) => {
    const stack = get().undoStackByFile[fileId] ?? [];
    const entry = stack[stack.length - 1];
    if (!entry) return;
    const next = { ...get().annotationsByFile, [fileId]: entry.before };
    set({
      annotationsByFile: next,
      selectedAnnotationId: null,
      undoStackByFile: { ...get().undoStackByFile, [fileId]: stack.slice(0, -1) },
      redoStackByFile: { ...get().redoStackByFile, [fileId]: [...(get().redoStackByFile[fileId] ?? []), entry] }
    });
    await saveAnnotationsByFile(next);
  },
  redo: async (fileId) => {
    const stack = get().redoStackByFile[fileId] ?? [];
    const entry = stack[stack.length - 1];
    if (!entry) return;
    const next = { ...get().annotationsByFile, [fileId]: entry.after };
    set({
      annotationsByFile: next,
      selectedAnnotationId: null,
      undoStackByFile: { ...get().undoStackByFile, [fileId]: [...(get().undoStackByFile[fileId] ?? []), entry] },
      redoStackByFile: { ...get().redoStackByFile, [fileId]: stack.slice(0, -1) }
    });
    await saveAnnotationsByFile(next);
  }
}));
