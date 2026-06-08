import { StyleSheet, View } from "react-native";
import { PdfReader } from "@/components/pdf/PdfReader";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PdfPageSurface() {
  const device = useDeviceClass();
  const readingMode = useUiStore((state) => state.readingMode);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={[styles.surface, readingMode ? styles.surfaceReading : null, device.isTablet && device.isLandscape ? styles.surfaceLandscape : null, { backgroundColor: theme.workspace }]}>
      <PdfReader />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, overflow: "hidden", padding: 12, zIndex: 0 },
  surfaceLandscape: { paddingHorizontal: 4, paddingVertical: 8 },
  surfaceReading: { padding: 0 }
});
