import { Maximize2, Minus, Plus } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";

export function StatusBar() {
  const currentPage = usePdfStore((state) => state.currentPage);
  const pageCount = usePdfStore((state) => state.pageCount);
  const zoom = usePdfStore((state) => state.zoom);
  const setZoom = usePdfStore((state) => state.setZoom);

  if (!pageCount) return null;

  return (
    <div className="absolute bottom-5 right-5 z-30 flex items-center gap-2 rounded-2xl border border-border bg-toolbar/95 p-1.5 shadow-velora backdrop-blur-xl">
      <span className="px-3 text-sm font-semibold text-primary">{currentPage} / {pageCount}</span>
      <IconButton label="Zoom out" className="h-8 w-8" onClick={() => setZoom(zoom - 0.1)}><Minus size={14} /></IconButton>
      <span className="w-14 text-center text-xs font-bold text-secondary">{Math.round(zoom * 100)}%</span>
      <IconButton label="Zoom in" className="h-8 w-8" onClick={() => setZoom(zoom + 0.1)}><Plus size={14} /></IconButton>
      <IconButton label="Fit width" className="h-8 w-8" onClick={() => setZoom(1)}><Maximize2 size={14} /></IconButton>
    </div>
  );
}
