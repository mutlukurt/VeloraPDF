import { create } from "zustand";

type BookmarkState = {
  bookmarks: Record<string, number[]>; // key is fileId, value is list of bookmarked page numbers
  toggleBookmark: (fileId: string, pageNumber: number) => void;
  isBookmarked: (fileId: string, pageNumber: number) => boolean;
  getBookmarks: (fileId: string) => number[];
};

const BOOKMARKS_KEY = "velora:bookmarks";

function loadBookmarks(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistBookmarks(bookmarks: Record<string, number[]>) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: loadBookmarks(),
  toggleBookmark: (fileId, pageNumber) => {
    set((state) => {
      const list = state.bookmarks[fileId] || [];
      const nextList = list.includes(pageNumber)
        ? list.filter((p) => p !== pageNumber)
        : [...list, pageNumber].sort((a, b) => a - b);
      const nextBookmarks = { ...state.bookmarks, [fileId]: nextList };
      persistBookmarks(nextBookmarks);
      return { bookmarks: nextBookmarks };
    });
  },
  isBookmarked: (fileId, pageNumber) => {
    const list = get().bookmarks[fileId] || [];
    return list.includes(pageNumber);
  },
  getBookmarks: (fileId) => {
    return get().bookmarks[fileId] || [];
  },
}));
