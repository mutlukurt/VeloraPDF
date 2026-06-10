import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { searchPdf, type SearchResult } from "../../lib/pdf/searchPdf";
import { usePdfStore } from "../../stores/usePdfStore";

export function SearchPanel({ pdf }: { pdf: PDFDocumentProxy }) {
  const query = usePdfStore((state) => state.searchQuery);
  const setQuery = usePdfStore((state) => state.setSearchQuery);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(Boolean(query.trim()));
    const timer = window.setTimeout(() => {
      searchPdf(pdf, query).then((next) => {
        if (!cancelled) {
          setResults(next);
          setLoading(false);
        }
      });
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pdf, query]);

  return (
    <aside className="h-full w-full shrink-0 overflow-y-auto border-r border-border bg-sidebar p-3 md:w-72">
      <div className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-secondary">
        <Search size={15} />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document" className="w-full bg-transparent text-sm text-primary outline-none placeholder:text-secondary" />
      </div>
      <div className="space-y-2">
        {loading ? <div className="rounded-xl bg-surface p-3 text-sm text-secondary">Searching...</div> : null}
        {!loading && query && results.length === 0 ? <div className="rounded-xl bg-surface p-3 text-sm text-secondary">No matches found.</div> : null}
        {results.map((result, index) => (
          <button
            key={`${result.page}-${index}`}
            className="w-full rounded-2xl border border-border bg-surface p-3 text-left transition hover:border-accent/40 hover:bg-elevated"
            onClick={() => {
              setCurrentPage(result.page);
              document.getElementById(`page-${result.page}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            <div className="mb-1 text-xs font-bold text-accent">Page {result.page}</div>
            <p className="line-clamp-3 text-xs leading-5 text-secondary">{result.snippet}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}
