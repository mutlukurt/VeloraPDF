import { Bookmark, Trash2 } from "lucide-react";
import { usePdfStore } from "../../stores/usePdfStore";
import { useBookmarkStore } from "../../stores/useBookmarkStore";
import { Button } from "../ui/Button";

const EMPTY_ARRAY: number[] = [];

export function PdfBookmarksPanel() {
  const activeFile = usePdfStore((state) => state.activeFile);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);

  const fileId = activeFile ? (activeFile.path ?? activeFile.name) : "";
  const bookmarks = useBookmarkStore((state) => state.bookmarks[fileId] || EMPTY_ARRAY);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);

  const isCurrentBookmarked = bookmarks.includes(currentPage);

  const handleToggleCurrent = () => {
    if (!fileId) return;
    toggleBookmark(fileId, currentPage);
  };

  const handleJump = (page: number) => {
    setCurrentPage(page);
    setTimeout(() => {
      document.getElementById(`page-${page}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar md:w-72">
      <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Bookmarks</h2>
          <p className="text-xs text-secondary mt-0.5">Quickly navigate to saved pages</p>
        </div>
        <Button
          variant={isCurrentBookmarked ? "secondary" : "primary"}
          onClick={handleToggleCurrent}
          disabled={!activeFile}
          className="w-full text-xs py-2 h-9"
          icon={<Bookmark size={14} className={isCurrentBookmarked ? "fill-current" : ""} />}
        >
          {isCurrentBookmarked ? "Remove Bookmark" : `Bookmark Page ${currentPage}`}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {bookmarks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center text-xs text-secondary leading-5">
            No bookmarks saved for this PDF. Toggle bookmarks here or in the status bar to save references.
          </div>
        ) : (
          bookmarks.map((page) => (
            <div
              key={page}
              className="group flex items-center justify-between rounded-xl border border-border bg-surface p-3 transition hover:border-accent/40 hover:bg-elevated"
            >
              <button
                className="flex-1 text-left focus:outline-none"
                onClick={() => handleJump(page)}
              >
                <div className="text-xs font-bold text-accent">Page {page}</div>
                <div className="text-[10px] text-secondary mt-0.5">Tap to jump to this page</div>
              </button>
              <button
                aria-label="Remove bookmark"
                className="p-1 text-secondary opacity-100 transition hover:text-red-400 rounded-lg md:opacity-0 md:group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(fileId, page);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
