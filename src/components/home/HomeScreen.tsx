import { Clock, FolderOpen } from "lucide-react";
import { VeloraLogo } from "../brand/VeloraLogo";
import { Button } from "../ui/Button";
import { RecentFilesGrid } from "./RecentFilesGrid";
import { usePdfStore } from "../../stores/usePdfStore";

export function HomeScreen({ onOpenPdf, onOpenRecentPdf }: { onOpenPdf: () => void; onOpenRecentPdf: (path?: string) => void }) {
  const recentFiles = usePdfStore((state) => state.recentFiles);

  return (
    <main className="flex min-h-full flex-1 overflow-auto bg-workspace">
      <div className="mx-auto flex w-full max-w-6xl flex-col px-8 py-10">
        <div className="flex flex-1 flex-col justify-center py-10">
          <VeloraLogo className="mb-8 h-20 w-20" />
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight text-primary">One local PDF workspace. Every document.</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-secondary">
            Read, annotate, organize and export PDFs on your Mac - privately and offline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="primary" onClick={onOpenPdf}>
              <FolderOpen size={17} />
              Open PDF
            </Button>
            <Button variant="secondary">
              <Clock size={17} />
              Recent Files
            </Button>
          </div>
        </div>
        <section className="pb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">Recent files</h2>
          </div>
          <RecentFilesGrid files={recentFiles} onOpenRecentPdf={onOpenRecentPdf} />
        </section>
      </div>
    </main>
  );
}
