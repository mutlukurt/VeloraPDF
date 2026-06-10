import { useEffect } from "react";
import { AppShell } from "../components/layout/AppShell";
import { loadStoredAnnotations, persistStoredAnnotations } from "../lib/pdf/annotationStorage";
import { exportAnnotatedPdf } from "../lib/pdf/exportPdf";
import { loadPdfDocument } from "../lib/pdf/loadPdf";
import { pickPdfFile, readPdfFile, saveJsonSidecar, savePdfBytes } from "../lib/tauri/fileDialog";
import { registerShortcuts } from "../lib/utils/shortcuts";
import { useAnnotationStore } from "../stores/useAnnotationStore";
import { type RecentFile, usePdfStore } from "../stores/usePdfStore";
import { useUiStore } from "../stores/useUiStore";
import { useWorkspaceStore } from "../lib/store/workspace";

export function App() {
  const theme = useUiStore((state) => state.theme);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);
  const setRightPanelOpen = useUiStore((state) => state.setRightPanelOpen);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const setZoom = usePdfStore((state) => state.setZoom);
  const zoom = usePdfStore((state) => state.zoom);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const pageCount = usePdfStore((state) => state.pageCount);
  const activeFile = usePdfStore((state) => state.activeFile);
  const annotations = useAnnotationStore((state) => state.annotations);
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);

  const initializeWorkspace = useWorkspaceStore((state) => state.initialize);

  useEffect(() => {
    initializeWorkspace();
  }, [initializeWorkspace]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const openPdf = async () => {
    try {
      const picked = await pickPdfFile();
      if (!picked) return;
      await openPickedPdf(picked);
    } catch (error) {
      console.error(error);
      usePdfStore.getState().setStatusMessage("Could not open this PDF");
      window.alert("Velora PDF could not open this file.");
    }
  };

  const openPickedPdf = async (picked: { name: string; path?: string; browserId?: string; data: Uint8Array }) => {
    const file = { ...picked, openedAt: Date.now() };
    usePdfStore.getState().setActiveFile(file);
    useAnnotationStore.getState().setAnnotations(loadStoredAnnotations(file));
    const pdf = await loadPdfDocument(picked.data);
    usePdfStore.getState().setPdf(pdf);
    usePdfStore.getState().setPageCount(pdf.numPages);
    usePdfStore.getState().setCurrentPage(1);
    usePdfStore.getState().addRecentFile({ name: picked.name, path: picked.path, browserId: picked.browserId, lastOpened: Date.now(), pageCount: pdf.numPages });
    useUiStore.getState().setActiveView("pdf");
    useUiStore.getState().setSidebarMode("thumbnails");
  };

  const openRecentPdf = async (file: RecentFile) => {
    try {
      await openPickedPdf(await readPdfFile(file.path, file.browserId));
    } catch (error) {
      console.error(error);
      window.alert("Velora PDF could not reopen this recent file. Please choose it once with Open PDF to refresh browser access.");
    }
  };

  const saveAnnotations = async () => {
    if (!activeFile) return;
    persistStoredAnnotations(activeFile, annotations);
    await saveJsonSidecar(activeFile.path, {
      app: "Velora PDF",
      file: { name: activeFile.name, path: activeFile.path },
      savedAt: new Date().toISOString(),
      annotations,
    });
  };

  const exportPdf = async () => {
    if (!activeFile) return;
    try {
      const bytes = await exportAnnotatedPdf(activeFile.data, annotations);
      await savePdfBytes(activeFile.name.replace(/\.pdf$/i, "") + "-velora.pdf", bytes);
    } catch (error) {
      console.error(error);
      window.alert("Export failed. Your annotations can still be saved as a Velora JSON sidecar.");
    }
  };

  useEffect(
    () =>
      registerShortcuts({
        openPdf,
        search: () => setSidebarMode("search"),
        zoomIn: () => setZoom(zoom + 0.1),
        zoomOut: () => setZoom(zoom - 0.1),
        fitWidth: () => setZoom(1),
        nextPage: () => setCurrentPage(currentPage + 1),
        previousPage: () => setCurrentPage(currentPage - 1),
        closePanel: () => setRightPanelOpen(false),
        setTool: setActiveTool,
        undo,
        redo,
      }),
    [currentPage, pageCount, redo, setActiveTool, setCurrentPage, setRightPanelOpen, setSidebarMode, setZoom, undo, zoom],
  );

  useEffect(() => {
    return useAnnotationStore.subscribe((state) => {
      const currentFile = usePdfStore.getState().activeFile;
      if (!currentFile) return;
      persistStoredAnnotations(currentFile, state.annotations);
    });
  }, []);

  return <AppShell onOpenPdf={openPdf} onOpenRecentPdf={openRecentPdf} onSaveAnnotations={saveAnnotations} onExportPdf={exportPdf} />;
}
