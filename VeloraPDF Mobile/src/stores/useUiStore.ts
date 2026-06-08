import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import type { ResolvedTheme, ThemeMode } from "@/theme/tokens";

const UI_KEY = "velora.ui.v1";

type UiState = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  eyeProtection: boolean;
  keepScreenAwake: boolean;
  pagesPanelOpen: boolean;
  settingsOpen: boolean;
  searchOpen: boolean;
  hydrate: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setEyeProtection: (enabled: boolean) => Promise<void>;
  setKeepScreenAwake: (enabled: boolean) => Promise<void>;
  setPagesPanelOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

function resolveTheme(theme: ThemeMode): ResolvedTheme {
  if (theme === "system") return Appearance.getColorScheme() === "light" ? "light" : "dark";
  return theme;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: "dark",
  resolvedTheme: "dark",
  eyeProtection: false,
  keepScreenAwake: false,
  pagesPanelOpen: true,
  settingsOpen: false,
  searchOpen: false,
  hydrate: async () => {
    const raw = await AsyncStorage.getItem(UI_KEY);
    if (!raw) return;
    const stored = JSON.parse(raw) as Partial<Pick<UiState, "theme" | "eyeProtection" | "keepScreenAwake">>;
    const theme = stored.theme ?? "dark";
    set({ theme, resolvedTheme: resolveTheme(theme), eyeProtection: Boolean(stored.eyeProtection), keepScreenAwake: Boolean(stored.keepScreenAwake) });
  },
  setTheme: async (theme) => {
    set({ theme, resolvedTheme: resolveTheme(theme) });
    await AsyncStorage.setItem(UI_KEY, JSON.stringify({ theme, eyeProtection: get().eyeProtection, keepScreenAwake: get().keepScreenAwake }));
  },
  setEyeProtection: async (eyeProtection) => {
    set({ eyeProtection });
    await AsyncStorage.setItem(UI_KEY, JSON.stringify({ theme: get().theme, eyeProtection, keepScreenAwake: get().keepScreenAwake }));
  },
  setKeepScreenAwake: async (keepScreenAwake) => {
    set({ keepScreenAwake });
    await AsyncStorage.setItem(UI_KEY, JSON.stringify({ theme: get().theme, eyeProtection: get().eyeProtection, keepScreenAwake }));
  },
  setPagesPanelOpen: (pagesPanelOpen) => set({ pagesPanelOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setSearchOpen: (searchOpen) => set({ searchOpen })
}));
