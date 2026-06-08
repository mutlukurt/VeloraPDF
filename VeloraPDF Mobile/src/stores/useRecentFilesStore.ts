import { create } from "zustand";
import type { PdfFileRecord } from "@/types";
import { loadRecentFiles, saveRecentFiles } from "@/lib/pdf/pdfStorage";

type RecentState = {
  recentFiles: PdfFileRecord[];
  hydrate: () => Promise<void>;
  addRecentFile: (file: PdfFileRecord) => Promise<void>;
  removeRecentFile: (id: string) => Promise<void>;
  clearRecentFiles: () => Promise<void>;
};

export const useRecentFilesStore = create<RecentState>((set, get) => ({
  recentFiles: [],
  hydrate: async () => {
    set({ recentFiles: await loadRecentFiles() });
  },
  addRecentFile: async (file) => {
    const next = [file, ...get().recentFiles.filter((item) => item.id !== file.id)].slice(0, 24);
    set({ recentFiles: next });
    await saveRecentFiles(next);
  },
  removeRecentFile: async (id) => {
    const next = get().recentFiles.filter((item) => item.id !== id);
    set({ recentFiles: next });
    await saveRecentFiles(next);
  },
  clearRecentFiles: async () => {
    set({ recentFiles: [] });
    await saveRecentFiles([]);
  }
}));
