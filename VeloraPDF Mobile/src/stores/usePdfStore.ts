import { create } from "zustand";
import type { PdfFileRecord } from "@/types";
import { pickAndCopyPdf } from "@/lib/pdf/openPdf";
import { useRecentFilesStore } from "./useRecentFilesStore";

type PdfState = {
  currentFile: PdfFileRecord | null;
  pageCount: number;
  currentPage: number;
  zoom: number;
  isLoading: boolean;
  error: string | null;
  openPdf: () => Promise<PdfFileRecord | null>;
  reopenRecentFile: (file: PdfFileRecord) => Promise<void>;
  closePdf: () => void;
  setPageCount: (pageCount: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
};

export const usePdfStore = create<PdfState>((set, get) => ({
  currentFile: null,
  pageCount: 0,
  currentPage: 1,
  zoom: 1,
  isLoading: false,
  error: null,
  openPdf: async () => {
    set({ isLoading: true, error: null });
    try {
      const file = await pickAndCopyPdf();
      if (!file) {
        set({ isLoading: false });
        return null;
      }
      set({ currentFile: file, currentPage: 1, pageCount: file.pageCount ?? 0, isLoading: false });
      await useRecentFilesStore.getState().addRecentFile(file);
      return file;
    } catch (error) {
      set({ isLoading: false, error: error instanceof Error ? error.message : "This PDF could not be opened." });
      return null;
    }
  },
  reopenRecentFile: async (file) => {
    const next = { ...file, lastOpened: Date.now() };
    set({ currentFile: next, currentPage: 1, pageCount: next.pageCount ?? get().pageCount, error: null });
    await useRecentFilesStore.getState().addRecentFile(next);
  },
  closePdf: () => set({ currentFile: null, pageCount: 0, currentPage: 1, zoom: 1, error: null }),
  setPageCount: (pageCount) => {
    const currentFile = get().currentFile;
    set({ pageCount, currentFile: currentFile ? { ...currentFile, pageCount } : currentFile });
    if (currentFile) useRecentFilesStore.getState().addRecentFile({ ...currentFile, pageCount }).catch(() => {});
  },
  setCurrentPage: (currentPage) => set({ currentPage }),
  setZoom: (zoom) => set({ zoom })
}));
