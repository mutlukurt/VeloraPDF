import { useEffect, useMemo, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Search } from "lucide-react";
import { usePdfStore } from "../../stores/usePdfStore";

function Thumbnail({ pdf, pageNumber, active, onClick }: { pdf: PDFDocumentProxy; pageNumber: number; active: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 0.18 });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      page.render({ canvasContext: context, viewport }).promise.catch(() => undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber]);

  return (
    <button onClick={onClick} className={`w-full rounded-2xl border p-2 text-left transition ${active ? "border-accent bg-soft-purple shadow-[0_12px_30px_rgba(91,77,255,.24)]" : "border-border bg-surface hover:bg-elevated"}`}>
      <div className="grid min-h-32 place-items-center rounded-xl bg-pdf-canvas">
        <canvas ref={canvasRef} className="max-h-32 max-w-full shadow-lg" />
      </div>
      <div className="mt-2 text-xs font-bold text-primary">Page {pageNumber}</div>
    </button>
  );
}

export function PdfThumbnailPanel({ pdf }: { pdf: PDFDocumentProxy }) {
  const [filter, setFilter] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const pageCount = usePdfStore((state) => state.pageCount);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1).filter((page) => !filter || String(page).includes(filter)),
    [filter, pageCount],
  );

  useEffect(() => {
    if (!pages.includes(currentPage)) return;
    const panel = panelRef.current;
    const item = itemRefs.current[currentPage];
    if (!panel || !item) return;

    const panelRect = panel.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const isFullyVisible = itemRect.top >= panelRect.top + 12 && itemRect.bottom <= panelRect.bottom - 12;
    if (isFullyVisible) return;

    const nextTop = panel.scrollTop + itemRect.top - panelRect.top - panel.clientHeight / 2 + itemRect.height / 2;
    panel.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
  }, [currentPage, pages]);

  return (
    <aside ref={panelRef} className="h-full w-full shrink-0 overflow-y-auto border-r border-border bg-sidebar p-3 md:w-60">
      <div className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-secondary">
        <Search size={15} />
        <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search pages" className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary" />
      </div>
      <div className="space-y-3 pb-6">
        {pages.map((page) => (
          <div
            key={page}
            ref={(element) => {
              itemRefs.current[page] = element;
            }}
          >
            <Thumbnail
              pdf={pdf}
              pageNumber={page}
              active={page === currentPage}
              onClick={() => {
                setCurrentPage(page);
                document.getElementById(`page-${page}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
