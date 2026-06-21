import { Suspense, lazy } from "react";
import { LeftRail } from "./LeftRail";
import { RightInspector } from "./RightInspector";
import { TopToolbar } from "./TopToolbar";
import { HomeScreen } from "../home/HomeScreen";
import { SettingsDialog } from "../../features/settings/SettingsDialog";
import { usePdfStore } from "../../stores/usePdfStore";
import type { RecentFile } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

const PdfViewer = lazy(() => import("../pdf/PdfViewer").then((m) => ({ default: m.PdfViewer })));
const NotesWorkspace = lazy(() => import("../notes/NotesWorkspace").then((m) => ({ default: m.NotesWorkspace })));
const NotebookWorkspace = lazy(() =>
  import("../notebook/NotebookWorkspace").then((m) => ({ default: m.NotebookWorkspace })),
);

function ViewFallback() {
  return <div className="flex min-h-0 flex-1 items-center justify-center bg-app" aria-busy="true" />;
}

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
          <Suspense fallback={<ViewFallback />}>
            <NotesWorkspace onOpenRecentPdf={onOpenRecentPdf} />
          </Suspense>
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
          <Suspense fallback={<ViewFallback />}>
            <NotebookWorkspace />
          </Suspense>
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
          {pdf ? (
            <Suspense fallback={<ViewFallback />}>
              <PdfViewer pdf={pdf} />
            </Suspense>
          ) : (
            <HomeScreen onOpenPdf={onOpenPdf} onOpenRecentPdf={onOpenRecentPdf} />
          )}
          {hasPdf ? <RightInspector /> : null}
        </div>
      </div>
      <SettingsDialog />
    </>
  );
}
