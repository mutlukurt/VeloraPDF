import { FileText, Home, MessageSquareText, Paperclip, Search, Settings, Sidebar, Star } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore, type SidebarMode } from "../../stores/useUiStore";

const items: Array<{ mode: SidebarMode; label: string; icon: typeof Home }> = [
  { mode: "home", label: "Home", icon: Home },
  { mode: "thumbnails", label: "Thumbnails", icon: Sidebar },
  { mode: "search", label: "Search", icon: Search },
  { mode: "bookmarks", label: "Bookmarks", icon: Star },
  { mode: "comments", label: "Comments", icon: MessageSquareText },
  { mode: null, label: "Attachments", icon: Paperclip },
  { mode: "settings", label: "Settings", icon: Settings },
];

export function LeftRail() {
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const closePdf = usePdfStore((state) => state.closePdf);

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-border bg-rail py-4">
      <FileText className="mb-3 h-5 w-5 text-accent" />
      {items.map(({ mode, label, icon: Icon }) => (
        <IconButton
          key={label}
          label={label}
          active={sidebarMode === mode && mode !== null}
          onClick={() => {
            if (mode === "home") closePdf();
            setSidebarMode(mode === sidebarMode ? null : mode);
          }}
        >
          <Icon size={18} />
        </IconButton>
      ))}
    </aside>
  );
}
