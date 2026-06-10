import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { PdfPage } from "./PdfPage";
import { PdfThumbnailPanel } from "./PdfThumbnailPanel";
import { SearchPanel } from "./SearchPanel";
import { PdfBookmarksPanel } from "./PdfBookmarksPanel";
import { PdfCommentsPanel } from "./PdfCommentsPanel";
import { PdfAttachmentsPanel } from "./PdfAttachmentsPanel";
import { PdfSidePanelBoundary } from "./PdfSidePanelBoundary";
import { StatusBar } from "../layout/StatusBar";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

export function PdfViewer({ pdf }: { pdf: PDFDocumentProxy }) {
  const pageCount = usePdfStore((state) => state.pageCount);
  const zoom = usePdfStore((state) => state.zoom);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const setZoom = usePdfStore((state) => state.setZoom);
  const currentPage = usePdfStore((state) => state.currentPage);
  const sidebarMode = useUiStore((state) => state.sidebarMode);
  const viewSettings = useUiStore((state) => state.viewSettings);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const [previewZoom, setPreviewZoom] = useState<number | null>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [firstPageWidth, setFirstPageWidth] = useState(0);
  const [isMobileReader, setIsMobileReader] = useState(() => window.innerWidth < 768);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const onVisible = useCallback((page: number) => setCurrentPage(page), [setCurrentPage]);
  const gestureStartZoom = useRef(zoom);
  const previewZoomRef = useRef<number | null>(null);
  const wheelCommitTimer = useRef<number | null>(null);
  const previewFrame = useRef<number | null>(null);
  const pendingScrollAnchor = useRef<{ ratio: number; left: number; top: number; width: number; height: number } | null>(null);
  const pagedWheelLock = useRef<number | null>(null);
  const effectiveZoom = previewZoom ?? zoom;
  const mobileFitZoom = firstPageWidth && viewportWidth ? Math.min(1, Math.max(0.28, (viewportWidth - 24) / (firstPageWidth * 1.35))) : 1;
  const renderZoom = (isMobileReader ? mobileFitZoom : 1) * effectiveZoom;
  const pagedMode = !isMobileReader && !viewSettings.continuous;
  const spreadMode = !isMobileReader && !viewSettings.singlePage;
  const firstSpreadPage = currentPage % 2 === 0 ? Math.max(1, currentPage - 1) : currentPage;
  const renderedPages = pagedMode
    ? pages.filter((page) => (spreadMode ? page === firstSpreadPage || page === firstSpreadPage + 1 : page === currentPage))
    : pages;
  const workspaceBackground = viewSettings.eyeProtection ? "#F4EFD9" : viewSettings.pageBackground;
  const pageTone = viewSettings.eyeProtection ? "eye-protection" : "default";
  const pageGapClass = viewSettings.showGaps ? "gap-5 md:gap-16" : "gap-0";
  const pageLayoutClass = spreadMode
    ? `grid w-fit max-w-full grid-cols-1 justify-items-center lg:grid-cols-2 ${pageGapClass}`
    : `flex w-fit flex-col items-center ${pageGapClass}`;

  const schedulePreviewZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(Math.max(nextZoom, 0.45), 2.6);
    const previousZoom = previewZoomRef.current ?? usePdfStore.getState().zoom;
    const scroller = scrollerRef.current;

    if (scroller && previousZoom > 0) {
      pendingScrollAnchor.current = {
        ratio: clamped / previousZoom,
        left: scroller.scrollLeft,
        top: scroller.scrollTop,
        width: scroller.clientWidth,
        height: scroller.clientHeight,
      };
    }

    previewZoomRef.current = clamped;

    if (previewFrame.current !== null) return;
    previewFrame.current = window.requestAnimationFrame(() => {
      previewFrame.current = null;
      setPreviewZoom(previewZoomRef.current);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    pdf.getPage(1).then((page) => {
      if (!cancelled) setFirstPageWidth(page.getViewport({ scale: 1 }).width);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateSize = () => {
      setViewportWidth(scroller.clientWidth);
      setIsMobileReader(window.innerWidth < 768);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(scroller);
    window.addEventListener("resize", updateSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const commitPreviewZoom = useCallback(() => {
    const nextZoom = previewZoomRef.current;
    if (nextZoom === null) return;
    setZoom(nextZoom);
    previewZoomRef.current = null;
    setPreviewZoom(null);
  }, [setZoom]);

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchor.current;
    const scroller = scrollerRef.current;
    if (!anchor || !scroller) return;

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

  const handlePagedWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (!pagedMode || event.ctrlKey || Math.abs(event.deltaY) < 18) return;
      event.preventDefault();

      if (pagedWheelLock.current !== null) return;

      const step = spreadMode ? 2 : 1;
      const nextPage = event.deltaY > 0 ? currentPage + step : currentPage - step;
      setCurrentPage(nextPage);
      pagedWheelLock.current = window.setTimeout(() => {
        pagedWheelLock.current = null;
      }, 180);
    },
    [currentPage, pagedMode, setCurrentPage, spreadMode],
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
      if (pagedWheelLock.current !== null) window.clearTimeout(pagedWheelLock.current);
    };
  }, [commitPreviewZoom, schedulePreviewZoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || pagedMode) return;
    const pageElement = document.getElementById(`page-${currentPage}`);
    if (!pageElement) return;
    pageElement.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [currentPage, pagedMode]);

  const sidePanel = (
    <PdfSidePanelBoundary panelName={sidebarMode ?? "none"}>
      {sidebarMode === "thumbnails" ? <PdfThumbnailPanel pdf={pdf} /> : null}
      {sidebarMode === "search" ? <SearchPanel pdf={pdf} /> : null}
      {sidebarMode === "bookmarks" ? <PdfBookmarksPanel /> : null}
      {sidebarMode === "comments" ? <PdfCommentsPanel /> : null}
      {sidebarMode === "attachments" ? <PdfAttachmentsPanel /> : null}
    </PdfSidePanelBoundary>
  );

  return (
    <div className="relative flex min-w-0 flex-1 overflow-hidden">
      {sidebarMode ? (
        <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm md:static md:z-auto md:bg-transparent md:backdrop-blur-0" onClick={() => setSidebarMode(null)}>
          <div className="h-full w-[min(320px,86vw)] shadow-velora md:h-auto md:w-auto md:shadow-none" onClick={(event) => event.stopPropagation()}>
            {sidePanel}
          </div>
        </div>
      ) : null}
      <div
        ref={scrollerRef}
        className="pdf-reader-scroll relative flex-1 overflow-auto overscroll-contain transition-colors"
        style={{ background: workspaceBackground }}
        onWheel={(event) => {
          handleWheel(event);
          handlePagedWheel(event);
        }}
      >
        <div
          className={`mx-auto min-h-full px-3 py-3 pb-28 sm:px-8 md:px-12 md:py-12 ${pageLayoutClass}`}
        >
          {renderedPages.map((page) => (
            <PdfPage
              key={page}
              pdf={pdf}
              pageNumber={page}
              zoom={renderZoom}
              displayZoom={renderZoom}
              onVisible={onVisible}
              pageTone={pageTone}
            />
          ))}
        </div>
      </div>
      <StatusBar displayZoom={effectiveZoom} />
    </div>
  );
}
