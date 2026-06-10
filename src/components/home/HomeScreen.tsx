import { Clock, FolderOpen, Notebook, Plus } from "lucide-react";
import { VeloraLogo } from "../brand/VeloraLogo";
import { Button } from "../ui/Button";
import { RecentFilesGrid } from "./RecentFilesGrid";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";
import { useWorkspaceStore } from "../../lib/store/workspace";
import { PageIcon } from "../../lib/icons/pageIcons";
import { formatRelativeTime } from "../../lib/utils/text";

export function HomeScreen({ onOpenPdf, onOpenRecentPdf }: { onOpenPdf: () => void; onOpenRecentPdf: (path?: string) => void }) {
  const recentFiles = usePdfStore((state) => state.recentFiles);
  const { pages, createPage, openPage } = useWorkspaceStore();
  const setActiveView = useUiStore((state) => state.setActiveView);

  const recentNotes = [...pages]
    .filter((page) => !page.isArchived)
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))
    .slice(0, 6);

  const handleOpenNote = async (id: string) => {
    await openPage(id);
    setActiveView("notes");
  };

  const handleCreateNote = async () => {
    await createPage();
    setActiveView("notes");
  };

  return (
    <main className="flex min-h-full min-w-0 flex-1 overflow-auto bg-workspace">
      <div className="mx-auto flex min-w-0 w-full max-w-6xl flex-col px-4 py-6 sm:px-6 md:px-8 md:py-10">
        <div className="flex flex-1 flex-col justify-center py-8 md:py-10">
          <VeloraLogo className="mb-6 h-16 w-16 md:mb-8 md:h-20 md:w-20" />
          <h1 className="max-w-3xl break-words text-[1.7rem] font-extrabold leading-tight text-primary sm:text-4xl md:text-5xl">One local PDF workspace. Every document.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-secondary md:mt-5 md:text-lg md:leading-8">
            Read, annotate, organize and export PDFs on your Mac - privately and offline.
          </p>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap md:mt-8">
            <Button className="w-full sm:w-auto" variant="primary" onClick={onOpenPdf}>
              <FolderOpen size={17} />
              Open PDF
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={handleCreateNote}>
              <Plus size={17} />
              New Note
            </Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => setActiveView("notes")}>
              <Notebook size={17} />
              Open Workspace
            </Button>
          </div>
        </div>

        {/* Notes Grid */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-secondary">Your Notes & Documents</h2>
          </div>
          {recentNotes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-sm text-secondary">
              No notes created yet. Click "New Note" to start writing.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recentNotes.map((note) => (
                <button
                  key={note.id}
                  className="group rounded-2xl border border-border bg-surface p-4 text-left shadow-velora-light transition hover:-translate-y-0.5 hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  onClick={() => handleOpenNote(note.id)}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-soft-purple text-accent">
                    <PageIcon value={note.icon} size={22} />
                  </div>
                  <div className="truncate text-sm font-bold text-primary">{note.title || "Untitled"}</div>
                  <div className="mt-1 truncate text-xs text-secondary">
                    Local workspace note
                  </div>
                  <div className="mt-3 text-xs text-secondary">
                    Edited {formatRelativeTime(note.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent Files Grid */}
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
