import { FileText, Trash2 } from "lucide-react";
import type { RecentFile } from "../../stores/usePdfStore";
import { usePdfStore } from "../../stores/usePdfStore";

export function RecentFilesGrid({ files, onOpenRecentPdf }: { files: RecentFile[]; onOpenRecentPdf: (file: RecentFile) => void }) {
  const removeRecentFile = usePdfStore((state) => state.removeRecentFile);

  if (files.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-sm text-secondary">Recent PDFs will appear here after you open them.</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => {
        const fileKey = file.path ?? file.browserId ?? file.name;
        return (
          <div
            key={`${fileKey}-${file.lastOpened}`}
            className="group relative rounded-2xl border border-border bg-surface p-4 text-left shadow-velora-light transition hover:-translate-y-0.5 hover:border-accent/40"
          >
            {/* Main click action */}
            <button
              className="absolute inset-0 w-full h-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--accent)] z-0"
              onClick={() => onOpenRecentPdf(file)}
              aria-label={`Open ${file.name}`}
            />
            
            {/* Visual card content */}
            <div className="relative pointer-events-none z-10">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-purple text-accent">
                <FileText size={22} />
              </div>
              <div className="truncate text-sm font-bold text-primary">{file.name}</div>
              <div className="mt-1 truncate text-xs text-secondary">{file.path ?? (file.browserId ? "Browser file access saved" : "Browser import")}</div>
              <div className="mt-3 text-xs text-secondary">
                {new Date(file.lastOpened).toLocaleDateString()} {file.pageCount ? `· ${file.pageCount} pages` : "· PDF"}
              </div>
            </div>

            {/* Individual delete action */}
            <button
              className="absolute top-3 right-3 p-1.5 rounded-lg text-secondary hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 z-20"
              onClick={(e) => {
                e.stopPropagation();
                removeRecentFile(fileKey);
              }}
              title="Remove from recent files"
              aria-label={`Remove ${file.name} from recent files`}
            >
              <Trash2 size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
