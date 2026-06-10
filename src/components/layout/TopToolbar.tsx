import {
  Crop,
  Download,
  Hand,
  Highlighter,
  Moon,
  MousePointer2,
  PenLine,
  Search,
  Settings2,
  Shapes,
  Signature,
  StickyNote,
  Sun,
  Type,
} from "lucide-react";
import { VeloraLogo } from "../brand/VeloraLogo";
import { IconButton } from "../ui/IconButton";
import { Button } from "../ui/Button";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore, type ActiveTool } from "../../stores/useUiStore";

type TopToolbarProps = {
  onOpenPdf: () => void;
  onSaveAnnotations: () => void;
  onExportPdf: () => void;
};

const tools: Array<{ tool: ActiveTool; label: string; icon: typeof MousePointer2 }> = [
  { tool: "select", label: "Select", icon: MousePointer2 },
  { tool: "hand", label: "Pan", icon: Hand },
  { tool: "highlight", label: "Highlight", icon: Highlighter },
  { tool: "pen", label: "Pen", icon: PenLine },
  { tool: "rectangle", label: "Shape", icon: Shapes },
  { tool: "text", label: "Text note", icon: Type },
  { tool: "sticky", label: "Sticky note", icon: StickyNote },
  { tool: "signature", label: "Signature", icon: Signature },
  { tool: "crop", label: "Crop", icon: Crop },
  { tool: "text-select", label: "Search", icon: Search },
];

export function TopToolbar({ onOpenPdf, onSaveAnnotations, onExportPdf }: TopToolbarProps) {
  const activeFile = usePdfStore((state) => state.activeFile);
  const activeTool = useUiStore((state) => state.activeTool);
  const setActiveTool = useUiStore((state) => state.setActiveTool);
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);
  const toggleRightPanel = useUiStore((state) => state.toggleRightPanel);
  const setSidebarMode = useUiStore((state) => state.setSidebarMode);

  return (
    <header className="velora-pdf-top-toolbar flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-app px-2 py-2 md:h-14 md:flex-nowrap md:gap-4 md:py-0 md:pl-[92px] md:pr-4">
      <div className="flex min-w-0 flex-1 items-center gap-2 md:min-w-56 md:flex-none md:gap-3">
        <VeloraLogo className="h-9 w-9 rounded-xl" />
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-primary">{activeFile?.name ?? "Velora PDF"}</div>
          <div className="text-xs text-secondary">Local file</div>
        </div>
      </div>

      <div className="order-3 flex w-full items-center gap-1 overflow-x-auto rounded-2xl border border-border bg-toolbar/90 p-1 shadow-velora backdrop-blur-xl md:order-none md:mx-auto md:w-auto md:overflow-visible">
        {tools.map(({ tool, label, icon: Icon }) => (
          <IconButton
            key={tool}
            label={label}
            active={activeTool === tool}
            className="h-8 w-8 shrink-0 md:h-9 md:w-9"
            onClick={() => {
              if (tool === "text-select") setSidebarMode("search");
              setActiveTool(tool);
            }}
          >
            <Icon size={17} />
          </IconButton>
        ))}
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1 md:min-w-56 md:gap-2">
        <IconButton label="Theme" onClick={toggleTheme}>{theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}</IconButton>
        <IconButton label="View settings" onClick={toggleRightPanel}><Settings2 size={18} /></IconButton>
        <Button className="hidden sm:inline-flex" variant="ghost" onClick={onSaveAnnotations} disabled={!activeFile}>Save JSON</Button>
        <Button className="px-3 sm:px-5" variant="primary" onClick={activeFile ? onExportPdf : onOpenPdf}>
          <Download size={16} />
          <span className="hidden min-[390px]:inline">{activeFile ? "Export" : "Open PDF"}</span>
        </Button>
      </div>
    </header>
  );
}
