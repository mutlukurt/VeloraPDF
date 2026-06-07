import { FileText } from "lucide-react";
import type { RecentFile } from "../../stores/usePdfStore";

export function RecentFilesGrid({ files }: { files: RecentFile[] }) {
  if (files.length === 0) {
    return <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-sm text-secondary">Recent PDFs will appear here after you open them.</div>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {files.map((file) => (
        <div key={`${file.path}-${file.lastOpened}`} className="group rounded-2xl border border-border bg-surface p-4 shadow-velora-light transition hover:-translate-y-0.5 hover:border-accent/40">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-purple text-accent">
            <FileText size={22} />
          </div>
          <div className="truncate text-sm font-bold text-primary">{file.name}</div>
          <div className="mt-1 truncate text-xs text-secondary">{file.path ?? "Browser import"}</div>
          <div className="mt-3 text-xs text-secondary">
            {new Date(file.lastOpened).toLocaleDateString()} {file.pageCount ? `· ${file.pageCount} pages` : "· PDF"}
          </div>
        </div>
      ))}
    </div>
  );
}
