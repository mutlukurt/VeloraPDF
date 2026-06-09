import { useEffect } from "react";
import { Sidebar } from "../../features/sidebar/Sidebar";
import { EditorHeader } from "../../features/editor/EditorHeader";
import { WorkspaceEditor } from "../../features/editor/WorkspaceEditor";
import { CommandPalette } from "../../features/search/CommandPalette";
import { useWorkspaceStore } from "../../lib/store/workspace";

export function NotesWorkspace({ onOpenRecentPdf }: { onOpenRecentPdf: (path?: string) => void }) {
  const initialize = useWorkspaceStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <div className="flex flex-1 overflow-hidden bg-[var(--background)] text-[var(--text)]">
      <Sidebar onOpenRecentPdf={onOpenRecentPdf} />
      <section className="flex min-w-0 flex-1 flex-col">
        <EditorHeader />
        <WorkspaceEditor />
      </section>
      <CommandPalette />
    </div>
  );
}
