import { memo, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { AnnotationLayer } from "./AnnotationLayer";

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  displayZoom: number;
  onVisible: (page: number) => void;
};

export const PdfPage = memo(function PdfPage({ pdf, pageNumber, zoom, displayZoom, onVisible }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [size, setSize] = useState({ width: 760 * displayZoom, height: 980 * displayZoom });
  const [shouldRender, setShouldRender] = useState(pageNumber <= 3);

  useEffect(() => {
    let cancelled = false;
    pdf.getPage(pageNumber).then((nextPage) => {
      if (!cancelled) setPage(nextPage);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  useEffect(() => {
    if (!page || !canvasRef.current) return;
    const viewport = page.getViewport({ scale: displayZoom * 1.35 });
    setSize({ width: viewport.width, height: viewport.height });
  }, [displayZoom, page]);

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

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible(pageNumber);
      },
      { threshold: 0.5 },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onVisible, pageNumber]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setShouldRender(true);
      },
      { rootMargin: "1200px 0px" },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      id={`page-${pageNumber}`}
      className="relative mx-auto overflow-hidden bg-white shadow-[0_26px_80px_rgba(0,0,0,.28)]"
      style={{ width: size.width, height: size.height }}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      <AnnotationLayer page={pageNumber} width={size.width} height={size.height} />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-toolbar px-3 py-1 text-xs font-semibold text-secondary shadow-velora z-20">
        {pageNumber}
      </div>
    </div>
  );
});
