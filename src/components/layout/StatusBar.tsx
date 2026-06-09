import { Bookmark, Maximize2, Minus, Plus } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";
import { useBookmarkStore } from "../../stores/useBookmarkStore";

export function StatusBar({ displayZoom }: { displayZoom?: number }) {
  const currentPage = usePdfStore((state) => state.currentPage);
  const pageCount = usePdfStore((state) => state.pageCount);
  const zoom = usePdfStore((state) => state.zoom);
  const setZoom = usePdfStore((state) => state.setZoom);
  const activeFile = usePdfStore((state) => state.activeFile);

  const fileId = activeFile ? (activeFile.path ?? activeFile.name) : "";
  const bookmarks = useBookmarkStore((state) => state.bookmarks[fileId] || []);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);

  const isBookmarked = bookmarks.includes(currentPage);

  if (!pageCount) return null;

  return (
    <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 rounded-2xl border border-border bg-toolbar/95 p-1.5 shadow-velora backdrop-blur-xl">
      <div className="flex items-center gap-1">
        <span className="pl-3 pr-1 text-sm font-semibold text-primary">{currentPage} / {pageCount}</span>
        <IconButton
          label={isBookmarked ? "Remove bookmark" : "Bookmark this page"}
          className={`h-8 w-8 transition-colors ${isBookmarked ? "text-accent" : "text-secondary hover:text-primary"}`}
          onClick={() => fileId && toggleBookmark(fileId, currentPage)}
        >
          <Bookmark size={14} className={isBookmarked ? "fill-current" : ""} />
        </IconButton>
      </div>
      <div className="h-4 w-[1px] bg-border mx-1" />
      <IconButton label="Zoom out" className="h-8 w-8" onClick={() => setZoom(zoom - 0.1)}><Minus size={14} /></IconButton>
      <span className="w-14 text-center text-xs font-bold text-secondary">{Math.round((displayZoom ?? zoom) * 100)}%</span>
      <IconButton label="Zoom in" className="h-8 w-8" onClick={() => setZoom(zoom + 0.1)}><Plus size={14} /></IconButton>
      <IconButton label="Fit width" className="h-8 w-8" onClick={() => setZoom(1)}><Maximize2 size={14} /></IconButton>
    </div>
  );
}
