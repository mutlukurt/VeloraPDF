import { LeftRail } from "./LeftRail";
import { RightInspector } from "./RightInspector";
import { TopToolbar } from "./TopToolbar";
import { HomeScreen } from "../home/HomeScreen";
import { PdfViewer } from "../pdf/PdfViewer";
import { NotesWorkspace } from "../notes/NotesWorkspace";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

type AppShellProps = {
  onOpenPdf: () => void;
  onOpenRecentPdf: (path?: string) => void;
  onSaveAnnotations: () => void;
  onExportPdf: () => void;
};

export function AppShell({ onOpenPdf, onOpenRecentPdf, onSaveAnnotations, onExportPdf }: AppShellProps) {
  const pdf = usePdfStore((state) => state.pdf);
  const activeView = useUiStore((state) => state.activeView);

  if (activeView === "notes") {
    return (
      <>
        <div className="flex h-screen w-screen overflow-hidden bg-app text-primary">
          <LeftRail />
          <NotesWorkspace onOpenRecentPdf={onOpenRecentPdf} />
        </div>
        <SettingsDialog />
      </>
    );
  }

  return (
    <>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-app text-primary">
        <TopToolbar onOpenPdf={onOpenPdf} onSaveAnnotations={onSaveAnnotations} onExportPdf={onExportPdf} />
        <div className="flex min-h-0 flex-1">
          <LeftRail />
          {pdf ? <PdfViewer pdf={pdf} /> : <HomeScreen onOpenPdf={onOpenPdf} onOpenRecentPdf={onOpenRecentPdf} />}
          <RightInspector />
        </div>
      </div>
      <SettingsDialog />
    </>
  );
}
