import { create } from "zustand";

export type ThemeMode = "light" | "dark";
export type SidebarMode = "home" | "thumbnails" | "search" | "bookmarks" | "comments" | "attachments" | "settings" | null;
export type ActiveView = "pdf" | "notes";
export type ActiveTool =
  | "select"
  | "hand"
  | "text-select"
  | "highlight"
  | "underline"
  | "strike"
  | "pen"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "sticky"
  | "signature"
  | "crop";

export type ViewSettings = {
  continuous: boolean;
  eyeProtection: boolean;
  showGaps: boolean;
  singlePage: boolean;
};

type UiState = {
  theme: ThemeMode;
  activeTool: ActiveTool;
  sidebarMode: SidebarMode;
  rightPanelOpen: boolean;
  viewSettings: ViewSettings;
  activeView: ActiveView;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setActiveView: (view: ActiveView) => void;
  toggleRightPanel: () => void;
  setRightPanelOpen: (open: boolean) => void;
  updateViewSettings: (settings: Partial<ViewSettings>) => void;
};

const THEME_KEY = "velora:theme";
const SETTINGS_KEY = "velora:view-settings";

function initialTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function initialSettings(): ViewSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { continuous: true, eyeProtection: false, showGaps: true, singlePage: true, ...JSON.parse(raw) };
  } catch {
    return { continuous: true, eyeProtection: false, showGaps: true, singlePage: true };
  }
  return { continuous: true, eyeProtection: false, showGaps: true, singlePage: true };
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: initialTheme(),
  activeTool: "select",
  sidebarMode: null,
  rightPanelOpen: true,
  viewSettings: initialSettings(),
  activeView: "pdf",
  toggleTheme: () => {
    const theme = get().theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },
  setActiveTool: (tool) => set({ activeTool: tool }),
  setSidebarMode: (mode) => set({ sidebarMode: mode }),
  setActiveView: (view) => set({ activeView: view }),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
  setRightPanelOpen: (open) => set({ rightPanelOpen: open }),
  updateViewSettings: (settings) =>
    set((state) => {
      const next = { ...state.viewSettings, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      return { viewSettings: next };
    }),
}));
