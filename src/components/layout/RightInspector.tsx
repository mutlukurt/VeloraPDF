import { AnimatePresence, motion } from "framer-motion";
import { Info, Lock, Palette, PanelRightClose } from "lucide-react";
import { Toggle } from "../ui/Toggle";
import { IconButton } from "../ui/IconButton";
import { usePdfStore } from "../../stores/usePdfStore";
import { useUiStore } from "../../stores/useUiStore";

const pageBackgrounds = ["#ECECF1", "#F0EDFF", "#FFF7DA", "#24242B"];

export function RightInspector() {
  const open = useUiStore((state) => state.rightPanelOpen);
  const setRightPanelOpen = useUiStore((state) => state.setRightPanelOpen);
  const viewSettings = useUiStore((state) => state.viewSettings);
  const updateViewSettings = useUiStore((state) => state.updateViewSettings);
  const activeFile = usePdfStore((state) => state.activeFile);
  const pageCount = usePdfStore((state) => state.pageCount);

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.18 }}
          className="fixed bottom-3 right-3 top-20 z-30 w-[min(22rem,calc(100vw-5rem))] overflow-y-auto rounded-[20px] border border-border bg-panel shadow-velora md:static md:m-4 md:ml-0 md:w-80 md:shrink-0 md:overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <div className="text-sm font-bold text-primary">View Setting</div>
              <div className="text-xs text-secondary">Reading workspace</div>
            </div>
            <IconButton label="Close settings" onClick={() => setRightPanelOpen(false)}>
              <PanelRightClose size={17} />
            </IconButton>
          </div>
          <div className="space-y-5 p-4">
            <section>
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                <Palette size={14} /> Layout
              </div>
              <div className="rounded-2xl border border-border bg-surface p-3">
                <Toggle label="Single Page" checked={viewSettings.singlePage} onChange={(singlePage) => updateViewSettings({ singlePage })} />
                <Toggle label="Continuous Scrolling" checked={viewSettings.continuous} onChange={(continuous) => updateViewSettings({ continuous })} />
                <Toggle label="Eye Protection Mode" checked={viewSettings.eyeProtection} onChange={(eyeProtection) => updateViewSettings({ eyeProtection })} />
                <Toggle label="Show Gaps Between Pages" checked={viewSettings.showGaps} onChange={(showGaps) => updateViewSettings({ showGaps })} />
              </div>
            </section>
            <section>
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-secondary">Page background</div>
              <div className="grid grid-cols-4 gap-2">
                {pageBackgrounds.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Set page background to ${color}`}
                    className={`h-12 rounded-xl border shadow-inner transition ${viewSettings.pageBackground === color ? "border-accent ring-2 ring-[var(--accent)]/20" : "border-border hover:border-accent"}`}
                    style={{ background: color }}
                    onClick={() => updateViewSettings({ pageBackground: color })}
                  />
                ))}
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
                <Info size={15} /> Information
              </div>
              <div className="space-y-2 text-xs text-secondary">
                <div className="flex justify-between gap-4"><span>File</span><span className="truncate text-primary">{activeFile?.name ?? "No PDF"}</span></div>
                <div className="flex justify-between"><span>Pages</span><span className="text-primary">{pageCount || "-"}</span></div>
                <div className="flex justify-between"><span>Storage</span><span className="text-primary">Local only</span></div>
              </div>
            </section>
            <section className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
                <Lock size={15} /> Security
              </div>
              <p className="text-xs leading-5 text-secondary">No account, cloud sync, tracking, or external API calls are used by Velora PDF.</p>
            </section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
