import { memo, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { AnnotationLayer } from "./AnnotationLayer";
import { usePdfStore } from "../../stores/usePdfStore";
import { cn } from "../../lib/utils/cn";

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  displayZoom: number;
  onVisible: (page: number) => void;
  pageTone?: "default" | "eye-protection";
};

export const PdfPage = memo(function PdfPage({ pdf, pageNumber, zoom, displayZoom, onVisible, pageTone = "default" }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [size, setSize] = useState({ width: 760 * displayZoom, height: 980 * displayZoom });
  const [shouldRender, setShouldRender] = useState(pageNumber <= 3);
  const [textItems, setTextItems] = useState<any[]>([]);

  const searchQuery = usePdfStore((state) => state.searchQuery);
  const cropPercent = usePdfStore((state) => state.crops[pageNumber]);
  const setPageCrop = usePdfStore((state) => state.setPageCrop);

  // Fetch PDF page proxy
  useEffect(() => {
    let cancelled = false;
    pdf.getPage(pageNumber).then((nextPage) => {
      if (!cancelled) setPage(nextPage);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  // Load page dimensions
  useEffect(() => {
    if (!page) return;
    const viewport = page.getViewport({ scale: displayZoom * 1.35 });
    setSize({ width: viewport.width, height: viewport.height });
  }, [displayZoom, page]);

  // Load text content for search matching
  useEffect(() => {
    if (!page) return;
    page.getTextContent()
      .then((textContent) => {
        setTextItems(textContent.items);
      })
      .catch((err) => {
        console.error("Failed to load page text content for search highlights", err);
      });
  }, [page]);

  // Render canvas loop
  useEffect(() => {
    if (!page || !canvasRef.current || !shouldRender) return;
    const canvas = canvasRef.current;
    const viewport = page.getViewport({ scale: zoom * 1.35 });
    const ratio = window.devicePixelRatio || 1;
    const buffer = document.createElement("canvas");
    buffer.width = Math.floor(viewport.width * ratio);
    buffer.height = Math.floor(viewport.height * ratio);
    const context = buffer.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const task: RenderTask = page.render({ canvasContext: context, viewport });
    task.promise
      .then(() => {
        const visibleContext = canvas.getContext("2d");
        if (!visibleContext) return;
        canvas.width = buffer.width;
        canvas.height = buffer.height;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        visibleContext.setTransform(1, 0, 0, 1, 0, 0);
        visibleContext.drawImage(buffer, 0, 0);
      })
      .catch(() => undefined);
    return () => task.cancel();
  }, [page, shouldRender, zoom]);

  // Handle visible page index update
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(pageNumber);
      },
      { threshold: 0.3 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisible, pageNumber]);

  // Virtualization scroll listener: load/unload canvases
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShouldRender(entry.isIntersecting);
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute crop layout boundaries
  const cropX = cropPercent ? cropPercent.x * size.width : 0;
  const cropY = cropPercent ? cropPercent.y * size.height : 0;
  const cropWidth = cropPercent ? cropPercent.width * size.width : size.width;
  const cropHeight = cropPercent ? cropPercent.height * size.height : size.height;

  // Compute search matches
  const searchMatches = (() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !page) return [];
    const query = searchQuery.toLowerCase();
    const viewport = page.getViewport({ scale: displayZoom * 1.35 });
    const matches: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];

    textItems.forEach((item: any) => {
      if (item.str && item.transform && item.str.toLowerCase().includes(query)) {
        const tx = item.transform[4];
        const ty = item.transform[5];
        const [x, y] = viewport.convertToViewportPoint(tx, ty);

        const fontHeight = (item.height || Math.abs(item.transform[0]) || 12) * displayZoom * 1.35;
        const textWidth = (item.width || 50) * displayZoom * 1.35;

        matches.push({
          id: `${item.str}-${tx}-${ty}-${Math.random()}`,
          x,
          y: y - fontHeight,
          width: textWidth,
          height: fontHeight,
        });
      }
    });

    return matches;
  })();

  return (
    <div
      ref={containerRef}
      id={`page-${pageNumber}`}
      className={cn(
        "relative mx-auto overflow-hidden bg-white shadow-[0_14px_38px_rgba(0,0,0,.18)] md:shadow-[0_26px_80px_rgba(0,0,0,.28)]",
        pageTone === "eye-protection" && "bg-[#FFF8DC]",
      )}
      style={{ width: cropWidth, height: cropHeight }}
    >
      <div
        className={cn("relative", pageTone === "eye-protection" && "brightness-[0.96] sepia-[0.18]")}
        style={{
          transform: cropPercent ? `translate(${-cropX}px, ${-cropY}px)` : undefined,
          width: size.width,
          height: size.height,
          transformOrigin: "top left",
        }}
      >
        {shouldRender ? (
          <canvas ref={canvasRef} className="block h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-50 dark:bg-zinc-900 text-secondary text-xs">
            Loading Page {pageNumber}...
          </div>
        )}

        {/* Search highlights overlay */}
        {searchMatches.map((match) => (
          <div
            key={match.id}
            className="absolute rounded-[2px] bg-yellow-400/40 mix-blend-multiply pointer-events-none"
            style={{
              left: match.x,
              top: match.y,
              width: match.width,
              height: match.height,
              zIndex: 10,
            }}
          />
        ))}

        <AnnotationLayer page={pageNumber} width={size.width} height={size.height} />
      </div>

      {cropPercent && (
        <button
          onClick={() => setPageCrop(pageNumber, null)}
          className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-full bg-black/70 hover:bg-black/90 text-white text-[10px] font-extrabold px-3 py-1.5 transition backdrop-blur-md shadow-lg"
        >
          Reset Crop
        </button>
      )}

      <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border bg-toolbar px-2.5 py-1 text-[10px] font-semibold text-secondary shadow-velora md:bottom-4 md:px-3 md:text-xs">
        {pageNumber}
      </div>
    </div>
  );
});
