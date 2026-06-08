import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as KeepAwake from "expo-keep-awake";
import * as NavigationBar from "expo-navigation-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import { useUiStore } from "@/stores/useUiStore";

export default function RootLayout() {
  const theme = useUiStore((state) => state.theme);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const keepScreenAwake = useUiStore((state) => state.keepScreenAwake);
  const hydrateUi = useUiStore((state) => state.hydrate);

  useEffect(() => {
    hydrateUi();
    ScreenOrientation.unlockAsync();
  }, [hydrateUi]);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync(resolvedTheme === "dark" ? "#050506" : "#F7F7FA").catch(() => {});
    NavigationBar.setButtonStyleAsync(resolvedTheme === "dark" ? "light" : "dark").catch(() => {});
  }, [resolvedTheme, theme]);

  useEffect(() => {
    if (keepScreenAwake) {
      KeepAwake.activateKeepAwakeAsync("velora-reader").catch(() => {});
      return;
    }
    KeepAwake.deactivateKeepAwake("velora-reader").catch(() => {});
  }, [keepScreenAwake]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, animation: "fade" }} />
    </GestureHandlerRootView>
  );
}
