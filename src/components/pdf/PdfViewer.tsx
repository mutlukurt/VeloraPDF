import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const onVisible = useCallback((page: number) => setCurrentPage(page), [setCurrentPage]);
  const gestureStartZoom = useRef(zoom);
  const previewZoomRef = useRef<number | null>(null);
  const wheelCommitTimer = useRef<number | null>(null);
  const previewFrame = useRef<number | null>(null);
  const pendingScrollAnchor = useRef<{ ratio: number; left: number; top: number; width: number; height: number } | null>(null);
  const effectiveZoom = previewZoom ?? zoom;
  const previewScale = previewZoom ? previewZoom / zoom : 1;

  const schedulePreviewZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(Math.max(nextZoom, 0.45), 2.6);
    previewZoomRef.current = clamped;

    if (previewFrame.current !== null) return;
    previewFrame.current = window.requestAnimationFrame(() => {
      previewFrame.current = null;
      setPreviewZoom(previewZoomRef.current);
    });
  }, []);

  const commitPreviewZoom = useCallback(() => {
    const nextZoom = previewZoomRef.current;
    if (nextZoom === null) return;
    const scroller = scrollerRef.current;
    const currentZoom = usePdfStore.getState().zoom;
    if (scroller && currentZoom > 0) {
      pendingScrollAnchor.current = {
        ratio: nextZoom / currentZoom,
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
        width: scroller.clientWidth,
        height: scroller.clientHeight,
      };
    }
    setZoom(nextZoom);
    previewZoomRef.current = null;
    setPreviewZoom(null);
  }, [setZoom]);

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    const scroller = scrollerRef.current;
    if (!anchor || !scroller || previewZoom !== null) return;

    pendingScrollAnchor.current = null;
    scroller.scrollLeft = Math.max(0, (anchor.left + anchor.width / 2) * anchor.ratio - anchor.width / 2);
    scroller.scrollTop = Math.max(0, (anchor.top + anchor.height / 2) * anchor.ratio - anchor.height / 2);
  }, [previewZoom, zoom]);

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const baseZoom = previewZoomRef.current ?? zoom;
      const nextZoom = baseZoom * (1 - event.deltaY * 0.002);
      schedulePreviewZoom(nextZoom);

      if (wheelCommitTimer.current !== null) window.clearTimeout(wheelCommitTimer.current);
      wheelCommitTimer.current = window.setTimeout(commitPreviewZoom, 120);
    },
    [commitPreviewZoom, schedulePreviewZoom, zoom],
  );

  useEffect(() => {
    const handleGestureStart = (event: Event) => {
      event.preventDefault();
      gestureStartZoom.current = previewZoomRef.current ?? usePdfStore.getState().zoom;
    };

    const handleGestureChange = (event: Event) => {
      const gesture = event as Event & { scale?: number };
      if (!gesture.scale) return;
      event.preventDefault();
      schedulePreviewZoom(gestureStartZoom.current * gesture.scale);
    };

    const handleGestureEnd = (event: Event) => {
      event.preventDefault();
      commitPreviewZoom();
    };

    document.addEventListener("gesturestart", handleGestureStart, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", handleGestureChange, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gestureend", handleGestureEnd, { passive: false } as AddEventListenerOptions);

    return () => {
      document.removeEventListener("gesturestart", handleGestureStart);
      document.removeEventListener("gesturechange", handleGestureChange);
      document.removeEventListener("gestureend", handleGestureEnd);
      if (previewFrame.current !== null) window.cancelAnimationFrame(previewFrame.current);
      if (wheelCommitTimer.current !== null) window.clearTimeout(wheelCommitTimer.current);
    };
  }, [commitPreviewZoom, schedulePreviewZoom]);

  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden">
      {sidebarMode === "thumbnails" ? <PdfThumbnailPanel pdf={pdf} /> : null}
      {sidebarMode === "search" ? <SearchPanel pdf={pdf} /> : null}
      {sidebarMode === "bookmarks" || sidebarMode === "comments" || sidebarMode === "settings" ? (
        <aside className="w-64 shrink-0 border-r border-border bg-sidebar p-4">
          <div className="rounded-2xl border border-border bg-surface p-4 text-sm text-secondary">This premium panel is ready for the next Velora PDF module.</div>
        </aside>
      ) : null}
      <div
        ref={scrollerRef}
        className={`relative flex-1 overflow-auto overscroll-contain ${viewSettings.eyeProtection ? "bg-[#F4EFD9] dark:bg-[#1f1d16]" : "bg-pdf-canvas"}`}
        onWheel={handleWheel}
      >
        <div
          className={`mx-auto flex min-h-full w-fit flex-col items-center px-12 py-12 ${viewSettings.showGaps ? "gap-16" : "gap-4"}`}
          style={{
            transform: previewScale !== 1 ? `scale(${previewScale}) translateZ(0)` : undefined,
            transformOrigin: "top center",
            willChange: previewZoom ? "transform" : "auto",
          }}
        >
          {pages.map((page) => (
            <PdfPage key={page} pdf={pdf} pageNumber={page} zoom={zoom} onVisible={onVisible} />
          ))}
        </div>
      </div>
      <StatusBar displayZoom={effectiveZoom} />
    </div>
  );
}
