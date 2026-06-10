import type { ActiveTool } from "../../stores/useUiStore";

type ShortcutHandlers = {
  openPdf: () => void;
  search: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitWidth: () => void;
  nextPage: () => void;
  previousPage: () => void;
  closePanel: () => void;
  setTool: (tool: ActiveTool) => void;
  undo: () => void;
  redo: () => void;
};

export function registerShortcuts(handlers: ShortcutHandlers) {
  const onKeyDown = (event: KeyboardEvent) => {
    const cmd = event.metaKey || event.ctrlKey;
    if (cmd && event.key.toLowerCase() === "o") {
      event.preventDefault();
      handlers.openPdf();
    }
    if (cmd && event.key.toLowerCase() === "f") {
      event.preventDefault();
      handlers.search();
    }
    if (cmd && event.key === "+") {
      event.preventDefault();
      handlers.zoomIn();
    }
    if (cmd && event.key === "-") {
      event.preventDefault();
      handlers.zoomOut();
    }
    if (cmd && event.key === "0") {
      event.preventDefault();
      handlers.fitWidth();
    }
    if (cmd && event.key.toLowerCase() === "z") {
      event.preventDefault();
      event.shiftKey ? handlers.redo() : handlers.undo();
    }
    if (event.key === "ArrowRight" || event.key === "PageDown") handlers.nextPage();
    if (event.key === "ArrowLeft" || event.key === "PageUp") handlers.previousPage();
    if (event.key === " ") handlers.setTool("hand");
    if (event.key === "Escape") handlers.closePanel();
  };
  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
