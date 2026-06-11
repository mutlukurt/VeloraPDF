import { LeftRail } from "./LeftRail";
import { RightInspector } from "./RightInspector";
import { TopToolbar } from "./TopToolbar";
import { HomeScreen } from "../home/HomeScreen";
import { PdfViewer } from "../pdf/PdfViewer";
import { NotesWorkspace } from "../notes/NotesWorkspace";
import { NotebookWorkspace } from "../notebook/NotebookWorkspace";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { usePdfStore } from "../../stores/usePdfStore";
import type { RecentFile } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

type AppShellProps = {
  onOpenPdf: () => void;
  onOpenRecentPdf: (file: RecentFile) => void;
  onSaveAnnotations: () => void;
  onExportPdf: () => void;
};

export function AppShell({ onOpenPdf, onOpenRecentPdf, onSaveAnnotations, onExportPdf }: AppShellProps) {
  const pdf = usePdfStore((state) => state.pdf);
  const activeView = useUiStore((state) => state.activeView);
  const hasPdf = Boolean(pdf);

  if (activeView === "notes") {
    return (
      <>
        <div className="flex h-dvh w-screen overflow-hidden bg-app pb-14 text-primary md:pb-0">
          <LeftRail />
          <NotesWorkspace onOpenRecentPdf={onOpenRecentPdf} />
        </div>
        <SettingsDialog />
      </>
    );
  }

  if (activeView === "notebook") {
    return (
      <>
        <div className="flex h-dvh w-screen overflow-hidden bg-app pb-14 text-primary md:pb-0">
          <LeftRail />
          <NotebookWorkspace />
        </div>
        <SettingsDialog />
      </>
    );
  }

  return (
    <>
      <div className="flex h-dvh w-screen flex-col overflow-hidden bg-app text-primary">
        {hasPdf ? (
          <TopToolbar onOpenPdf={onOpenPdf} onSaveAnnotations={onSaveAnnotations} onExportPdf={onExportPdf} />
        ) : null}
        <div className="flex min-h-0 flex-1 pb-14 md:pb-0">
          <LeftRail />
          {pdf ? <PdfViewer pdf={pdf} /> : <HomeScreen onOpenPdf={onOpenPdf} onOpenRecentPdf={onOpenRecentPdf} />}
          {hasPdf ? <RightInspector /> : null}
        </div>
      </div>
      <SettingsDialog />
    </>
  );
}
