import { useEffect, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { Sidebar } from "../../features/sidebar/Sidebar";
import { EditorHeader } from "../../features/editor/EditorHeader";
import { WorkspaceEditor } from "../../features/editor/WorkspaceEditor";
import { CommandPalette } from "../../features/search/CommandPalette";
import { useWorkspaceStore } from "../../lib/store/workspace";
import type { RecentFile } from "../../stores/usePdfStore";

export function NotesWorkspace({ onOpenRecentPdf }: { onOpenRecentPdf: (file: RecentFile) => void }) {
  const initialize = useWorkspaceStore((state) => state.initialize);
  const ensureActivePage = useWorkspaceStore((state) => state.ensureActivePage);
  const flushActiveDoc = useWorkspaceStore((state) => state.flushActiveDoc);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      await initialize();
      await ensureActivePage();
    })();
    return () => {
      void flushActiveDoc();
    };
  }, [initialize, ensureActivePage, flushActiveDoc]);

  return (
    <div className="relative flex flex-1 overflow-hidden bg-[var(--background)] text-[var(--text)]">
      <button
        type="button"
        className="kairnly-mobile-sidebar-button fixed left-3 top-3 z-[80] grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-lift md:hidden"
        onClick={() => setMobileSidebarOpen(true)}
        aria-label="Open notes sidebar"
      >
        <PanelLeftOpen size={18} />
      </button>
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close notes sidebar overlay"
        />
      ) : null}
      <Sidebar
        onOpenRecentPdf={onOpenRecentPdf}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />
      <section className="flex min-w-0 flex-1 flex-col">
        <EditorHeader />
        <WorkspaceEditor />
      </section>
      <CommandPalette />
    </div>
  );
}
