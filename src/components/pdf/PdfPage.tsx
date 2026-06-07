import { memo, useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { AnnotationLayer } from "./AnnotationLayer";

type PdfPageProps = {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  onVisible: (page: number) => void;
};

export const PdfPage = memo(function PdfPage({ pdf, pageNumber, zoom, onVisible }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [size, setSize] = useState({ width: 760 * zoom, height: 980 * zoom });

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
    const canvas = canvasRef.current;
    const viewport = page.getViewport({ scale: zoom * 1.35 });
    const ratio = window.devicePixelRatio || 1;
    setSize({ width: viewport.width, height: viewport.height });
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const task: RenderTask = page.render({ canvasContext: context, viewport });
    task.promise.catch(() => undefined);
    return () => task.cancel();
  }, [page, zoom]);

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

  return (
    <div ref={containerRef} id={`page-${pageNumber}`} className="relative mx-auto bg-white shadow-[0_26px_80px_rgba(0,0,0,.28)]">
      <canvas ref={canvasRef} className="block" />
      <AnnotationLayer page={pageNumber} width={size.width} height={size.height} />
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 rounded-full border border-border bg-toolbar px-3 py-1 text-xs font-semibold text-secondary shadow-velora">
        {pageNumber}
      </div>
    </div>
  );
});
