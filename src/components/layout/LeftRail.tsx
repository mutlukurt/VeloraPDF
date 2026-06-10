import { FileText, Home, MessageSquareText, Paperclip, Search, Settings, Sidebar, Star, Notebook } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";
import { useWorkspaceStore } from "../../lib/store/workspace";
import { cn } from "../../lib/utils/cn";

export function LeftRail() {
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const activeView = useUiStore((state) => state.activeView);
  const setActiveView = useUiStore((state) => state.setActiveView);
  const pdf = usePdfStore((state) => state.pdf);
  const closePdf = usePdfStore((state) => state.closePdf);

  const isPdf = activeView === "pdf";
  const hasPdf = isPdf && Boolean(pdf);

  return (
    <aside
      className={cn(
        "flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-rail pb-4",
        activeView === "notes" ? "pt-12" : "pt-4"
      )}
    >
      <FileText className="mb-3 h-5 w-5 text-accent" />
      
      {/* Home Button */}
      <IconButton
        label="Home"
        active={isPdf && sidebarMode === "home"}
        onClick={() => {
          closePdf();
          setActiveView("pdf");
          setSidebarMode("home");
        }}
      >
        <Home size={18} />
      </IconButton>

      {/* Notes Button */}
      <IconButton
        label="Notes"
        active={activeView === "notes"}
        onClick={() => {
          setActiveView("notes");
          setSidebarMode(null);
        }}
      >
        <Notebook size={18} />
      </IconButton>

      <div className="my-2 h-[1px] w-8 bg-border" />

      {/* PDF specific tools */}
      <IconButton
        label="Thumbnails"
        active={hasPdf && sidebarMode === "thumbnails"}
        disabled={!hasPdf}
        onClick={() => setSidebarMode(sidebarMode === "thumbnails" ? null : "thumbnails")}
      >
        <Sidebar size={18} />
      </IconButton>

      <IconButton
        label="Search"
        active={hasPdf && sidebarMode === "search"}
        disabled={!hasPdf}
        onClick={() => setSidebarMode(sidebarMode === "search" ? null : "search")}
      >
        <Search size={18} />
      </IconButton>

      <IconButton
        label="Bookmarks"
        active={hasPdf && sidebarMode === "bookmarks"}
        disabled={!hasPdf}
        onClick={() => setSidebarMode(sidebarMode === "bookmarks" ? null : "bookmarks")}
      >
        <Star size={18} />
      </IconButton>

      <IconButton
        label="Comments"
        active={hasPdf && sidebarMode === "comments"}
        disabled={!hasPdf}
        onClick={() => setSidebarMode(sidebarMode === "comments" ? null : "comments")}
      >
        <MessageSquareText size={18} />
      </IconButton>

      <IconButton
        label="Attachments"
        active={hasPdf && sidebarMode === "attachments"}
        disabled={!hasPdf}
        onClick={() => setSidebarMode(sidebarMode === "attachments" ? null : "attachments")}
      >
        <Paperclip size={18} />
      </IconButton>

      <div className="flex-1" />

      <IconButton
        label="Settings"
        onClick={() => {
          useWorkspaceStore.getState().setSettingsOpen(true);
        }}
      >
        <Settings size={18} />
      </IconButton>
    </aside>
  );
}
