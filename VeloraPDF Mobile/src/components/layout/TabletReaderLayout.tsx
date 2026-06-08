import { StyleSheet, View } from "react-native";
import { FloatingToolbar } from "@/components/layout/FloatingToolbar";
import { LeftRail } from "@/components/layout/LeftRail";
import { PageNavigator } from "@/components/layout/PageNavigator";
import { SearchSheet } from "@/components/layout/SearchSheet";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { PageControl } from "@/components/pdf/PageControl";
import { PdfPageSurface } from "@/components/pdf/PdfPageSurface";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function TabletReaderLayout() {
  const pagesOpen = useUiStore((state) => state.pagesPanelOpen);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const { isLandscape } = useDeviceClass();

  return (
    <View style={[styles.root, { backgroundColor: theme.app }]}>
      {isLandscape ? <LeftRail /> : null}
      {pagesOpen ? <PageNavigator /> : null}
      <View style={styles.workspace}>
        <View style={styles.top}>
          <FloatingToolbar />
        </View>
        <PdfPageSurface />
        <View style={styles.bottom}>
          <PageControl />
        </View>
      </View>
      <SettingsSheet />
      <SearchSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { bottom: 16, position: "absolute", right: 18 },
  root: { flex: 1, flexDirection: "row" },
  top: { left: 0, position: "absolute", right: 0, top: 16, zIndex: 2 },
  workspace: { flex: 1 }
});
