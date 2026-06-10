import { create } from "zustand";
import type { PDFDocumentProxy } from "pdfjs-dist";

export type ActiveFile = {
  name: string;
  path?: string;
  browserId?: string;
  data: Uint8Array;
  openedAt: number;
};

export type RecentFile = {
  name: string;
  path?: string;
  browserId?: string;
  lastOpened: number;
  pageCount?: number;
};

type PdfState = {
  activeFile: ActiveFile | null;
  pdf: PDFDocumentProxy | null;
  pageCount: number;
  currentPage: number;
  zoom: number;
  searchQuery: string;
  statusMessage: string;
  recentFiles: RecentFile[];
  crops: Record<number, { x: number; y: number; width: number; height: number } | null>;
  setActiveFile: (file: ActiveFile) => void;
  setPdf: (pdf: PDFDocumentProxy | null) => void;
  setPageCount: (pageCount: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setSearchQuery: (query: string) => void;
  setStatusMessage: (message: string) => void;
  addRecentFile: (file: RecentFile) => void;
  removeRecentFile: (key: string) => void;
  clearRecentFiles: () => void;
  setPageCrop: (page: number, crop: { x: number; y: number; width: number; height: number } | null) => void;
  clearCrops: () => void;
  closePdf: () => void;
};

const RECENT_KEY = "velora:recent-files";

function loadRecentFiles(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as RecentFile[]) : [];
  } catch {
    return [];
  }
}

function persistRecentFiles(files: RecentFile[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(files.slice(0, 12)));
}

export const usePdfStore = create<PdfState>((set, get) => ({
  activeFile: null,
  pdf: null,
  pageCount: 0,
  currentPage: 1,
  zoom: 1,
  searchQuery: "",
  statusMessage: "Ready",
  recentFiles: loadRecentFiles(),
  crops: {},
  setActiveFile: (file) => set({ activeFile: file, currentPage: 1, zoom: 1, statusMessage: "PDF loaded", crops: {} }),
  setPdf: (pdf) => set({ pdf }),
  setPageCount: (pageCount) => set({ pageCount }),
  setCurrentPage: (page) => {
    const pageCount = get().pageCount || 1;
    set({ currentPage: Math.min(Math.max(page, 1), pageCount) });
  },
  setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.45), 2.6) }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setStatusMessage: (message) => set({ statusMessage: message }),
  addRecentFile: (file) =>
    set((state) => {
      const key = file.path ?? file.browserId ?? file.name;
      const next = [file, ...state.recentFiles.filter((item) => (item.path ?? item.browserId ?? item.name) !== key)].slice(0, 12);
      persistRecentFiles(next);
      return { recentFiles: next };
    }),
  removeRecentFile: (key) =>
    set((state) => {
      const keyStr = key;
      const next = state.recentFiles.filter((item) => (item.path ?? item.browserId ?? item.name) !== keyStr);
      persistRecentFiles(next);
      return { recentFiles: next };
    }),
  clearRecentFiles: () => {
    persistRecentFiles([]);
    set({ recentFiles: [] });
  },
  setPageCrop: (page, crop) =>
    set((state) => ({
      crops: { ...state.crops, [page]: crop },
    })),
  clearCrops: () => set({ crops: {} }),
  closePdf: () => set({ activeFile: null, pdf: null, pageCount: 0, currentPage: 1, searchQuery: "", crops: {} }),
}));
