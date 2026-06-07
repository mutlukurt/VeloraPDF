import { useCallback, useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "./PdfPage";
import { PdfThumbnailPanel } from "./PdfThumbnailPanel";
import { SearchPanel } from "./SearchPanel";
import { StatusBar } from "../layout/StatusBar";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

export function PdfViewer({ pdf }: { pdf: PDFDocumentProxy }) {
  const pageCount = usePdfStore((state) => state.pageCount);
  const zoom = usePdfStore((state) => state.zoom);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const setZoom = usePdfStore((state) => state.setZoom);
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const viewSettings = useUiStore((state) => state.viewSettings);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const onVisible = useCallback((page: number) => setCurrentPage(page), [setCurrentPage]);
  const gestureStartZoom = useRef(zoom);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setZoom(zoom + direction * 0.06);
    },
    [setZoom, zoom],
  );

  useEffect(() => {
    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartZoom.current = usePdfStore.getState().zoom;
    };

    const handleGestureChange = (event: Event) => {
      const gesture = event as Event & { scale?: number };
      if (!gesture.scale) return;
      event.preventDefault();
      usePdfStore.getState().setZoom(gestureStartZoom.current * gesture.scale);
    };

    document.addEventListener("gesturestart", handleGestureStart, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", handleGestureChange, { passive: false } as AddEventListenerOptions);

    return () => {
      document.removeEventListener("gesturestart", handleGestureStart);
      document.removeEventListener("gesturechange", handleGestureChange);
    };
  }, []);

  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden">
      {sidebarMode === "thumbnails" ? <PdfThumbnailPanel pdf={pdf} /> : null}
      {sidebarMode === "search" ? <SearchPanel pdf={pdf} /> : null}
      {sidebarMode === "bookmarks" || sidebarMode === "comments" || sidebarMode === "settings" ? (
        <aside className="w-64 shrink-0 border-r border-border bg-sidebar p-4">
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-secondary">This premium panel is ready for the next Velora PDF module.</div>
        </aside>
      ) : null}
      <div className={`relative flex-1 overflow-auto ${viewSettings.eyeProtection ? "bg-[#F4EFD9] dark:bg-[#1f1d16]" : "bg-pdf-canvas"}`} onWheel={handleWheel}>
        <div className={`mx-auto flex min-h-full w-fit flex-col items-center px-12 py-12 ${viewSettings.showGaps ? "gap-16" : "gap-4"}`}>
          {pages.map((page) => (
            <PdfPage key={page} pdf={pdf} pageNumber={page} zoom={zoom} onVisible={onVisible} />
          ))}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
