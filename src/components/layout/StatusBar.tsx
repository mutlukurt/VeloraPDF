import { Bookmark, Maximize2, Minus, Plus } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";
import { useBookmarkStore } from "../../stores/useBookmarkStore";

const EMPTY_ARRAY: number[] = [];

export function StatusBar({ displayZoom }: { displayZoom?: number }) {
  const currentPage = usePdfStore((state) => state.currentPage);
  const pageCount = usePdfStore((state) => state.pageCount);
  const zoom = usePdfStore((state) => state.zoom);
  const setZoom = usePdfStore((state) => state.setZoom);
  const activeFile = usePdfStore((state) => state.activeFile);

  const fileId = activeFile ? (activeFile.path ?? activeFile.name) : "";
  const bookmarks = useBookmarkStore((state) => state.bookmarks[fileId] || EMPTY_ARRAY);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);

  const isBookmarked = bookmarks.includes(currentPage);

  if (!pageCount) return null;

  return (
    <div className="absolute inset-x-4 bottom-[4.25rem] z-30 mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-1 rounded-2xl border border-border bg-toolbar/95 p-1.5 shadow-velora backdrop-blur-xl md:inset-x-auto md:bottom-5 md:right-5 md:mx-0 md:gap-2">
      <div className="flex items-center gap-1">
        <span className="pl-2 pr-1 text-xs font-semibold text-primary md:pl-3 md:text-sm">{currentPage} / {pageCount}</span>
        <IconButton
          label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
          className={`h-8 w-8 transition-colors ${isBookmarked ? "text-accent" : "text-secondary hover:text-primary"}`}
          onClick={() => fileId && toggleBookmark(fileId, currentPage)}
        >
          <Bookmark size={14} className={isBookmarked ? "fill-current" : ""} />
        </IconButton>
      </div>
      <div className="mx-0.5 h-4 w-[1px] bg-border md:mx-1" />
      <IconButton label="Zoom out" className="h-8 w-8" onClick={() => setZoom(zoom - 0.1)}><Minus size={14} /></IconButton>
      <span className="w-12 text-center text-xs font-bold text-secondary md:w-14">{Math.round((displayZoom ?? zoom) * 100)}%</span>
      <IconButton label="Zoom in" className="h-8 w-8" onClick={() => setZoom(zoom + 0.1)}><Plus size={14} /></IconButton>
      <IconButton label="Fit width" className="h-8 w-8" onClick={() => setZoom(1)}><Maximize2 size={14} /></IconButton>
    </div>
  );
}
