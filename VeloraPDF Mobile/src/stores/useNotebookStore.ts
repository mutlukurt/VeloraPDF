import { create } from "zustand";
import { createId } from "@/lib/utils/ids";
import { loadNotebooks, saveNotebooks } from "@/lib/notebook/notebookStorage";
import type { NotebookRecord, NotebookTemplate, NoteStroke, VoiceNote } from "@/types";

type NotebookState = {
  notebooks: NotebookRecord[];
  currentNotebook: NotebookRecord | null;
  undoneStrokesByNotebook: Record<string, NoteStroke[]>;
  hydrate: () => Promise<void>;
  createNotebook: (template: NotebookTemplate) => Promise<NotebookRecord>;
  openNotebook: (id: string) => Promise<NotebookRecord | null>;
  addStroke: (notebookId: string, stroke: NoteStroke) => Promise<void>;
  undoStroke: (notebookId: string, page?: number) => Promise<void>;
  redoStroke: (notebookId: string, page?: number) => Promise<void>;
  deleteStroke: (notebookId: string, strokeId: string) => Promise<void>;
  addPage: (notebookId: string) => Promise<number>;
  addVoiceNote: (notebookId: string, voiceNote: VoiceNote) => Promise<void>;
  removeNotebook: (notebookId: string) => Promise<void>;
};

function titleForTemplate(template: NotebookTemplate) {
  const label = template === "lined" ? "Lined" : template === "grid" ? "Grid" : "Blank";
  return `${label} notebook`;
}

async function updateNotebook(
  set: (state: Partial<NotebookState>) => void,
  get: () => NotebookState,
  notebookId: string,
  updater: (notebook: NotebookRecord) => NotebookRecord
) {
  const next = get().notebooks.map((notebook) => (notebook.id === notebookId ? updater(notebook) : notebook));
  const currentNotebook = next.find((notebook) => notebook.id === notebookId) ?? get().currentNotebook;
  set({ notebooks: next, currentNotebook });
  await saveNotebooks(next);
}

export const useNotebookStore = create<NotebookState>((set, get) => ({
  notebooks: [],
  currentNotebook: null,
  undoneStrokesByNotebook: {},
  hydrate: async () => {
    const notebooks = (await loadNotebooks()).map((notebook) => ({
      ...notebook,
      pageCount: Math.max(1, notebook.pageCount || 1),
      strokes: notebook.strokes.map((stroke) => ({ ...stroke, page: stroke.page || 1 })),
      voiceNotes: notebook.voiceNotes.map((voiceNote) => ({ ...voiceNote, page: voiceNote.page || 1 }))
    }));
    set({ notebooks });
  },
  createNotebook: async (template) => {
    const now = Date.now();
    const notebook: NotebookRecord = {
      id: createId("notebook"),
      title: titleForTemplate(template),
      template,
      createdAt: now,
      updatedAt: now,
      lastOpened: now,
      pageCount: 1,
      strokes: [],
      voiceNotes: []
    };
    const next = [notebook, ...get().notebooks].slice(0, 32);
    set({ notebooks: next, currentNotebook: notebook });
    await saveNotebooks(next);
    return notebook;
  },
  openNotebook: async (id) => {
    const notebook = get().notebooks.find((item) => item.id === id);
    if (!notebook) return null;
    const opened = { ...notebook, lastOpened: Date.now() };
    const next = [opened, ...get().notebooks.filter((item) => item.id !== id)];
    set({ notebooks: next, currentNotebook: opened });
    await saveNotebooks(next);
    return opened;
  },
  addStroke: async (notebookId, stroke) => {
    set({ undoneStrokesByNotebook: { ...get().undoneStrokesByNotebook, [notebookId]: [] } });
    await updateNotebook(set, get, notebookId, (notebook) => ({
      ...notebook,
      strokes: [...notebook.strokes, stroke],
      updatedAt: Date.now()
    }));
  },
  undoStroke: async (notebookId, page) => {
    const notebook = get().notebooks.find((item) => item.id === notebookId);
    const stroke = page ? [...(notebook?.strokes ?? [])].reverse().find((item) => (item.page || 1) === page) : notebook?.strokes[notebook.strokes.length - 1];
    if (!stroke) return;
    set({ undoneStrokesByNotebook: { ...get().undoneStrokesByNotebook, [notebookId]: [...(get().undoneStrokesByNotebook[notebookId] ?? []), stroke] } });
    await updateNotebook(set, get, notebookId, (notebook) => ({
      ...notebook,
      strokes: notebook.strokes.filter((item) => item.id !== stroke.id),
      updatedAt: Date.now()
    }));
  },
  redoStroke: async (notebookId, page) => {
    const undone = get().undoneStrokesByNotebook[notebookId] ?? [];
    const stroke = page ? [...undone].reverse().find((item) => (item.page || 1) === page) : undone[undone.length - 1];
    if (!stroke) return;
    set({ undoneStrokesByNotebook: { ...get().undoneStrokesByNotebook, [notebookId]: undone.filter((item) => item.id !== stroke.id) } });
    await updateNotebook(set, get, notebookId, (notebook) => ({
      ...notebook,
      strokes: [...notebook.strokes, stroke],
      updatedAt: Date.now()
    }));
  },
  deleteStroke: async (notebookId, strokeId) => {
    set({ undoneStrokesByNotebook: { ...get().undoneStrokesByNotebook, [notebookId]: [] } });
    await updateNotebook(set, get, notebookId, (notebook) => ({
      ...notebook,
      strokes: notebook.strokes.filter((stroke) => stroke.id !== strokeId),
      updatedAt: Date.now()
    }));
  },
  addPage: async (notebookId) => {
    let nextPage = 1;
    await updateNotebook(set, get, notebookId, (notebook) => {
      nextPage = Math.max(1, notebook.pageCount || 1) + 1;
      return {
        ...notebook,
        pageCount: nextPage,
        updatedAt: Date.now()
      };
    });
    return nextPage;
  },
  addVoiceNote: async (notebookId, voiceNote) => {
    await updateNotebook(set, get, notebookId, (notebook) => ({
      ...notebook,
      voiceNotes: [...notebook.voiceNotes, voiceNote],
      updatedAt: Date.now()
    }));
  },
  removeNotebook: async (notebookId) => {
    const next = get().notebooks.filter((notebook) => notebook.id !== notebookId);
    set({ notebooks: next, currentNotebook: get().currentNotebook?.id === notebookId ? null : get().currentNotebook });
    await saveNotebooks(next);
  }
}));
