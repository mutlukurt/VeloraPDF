import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { FloatingToolbar } from "@/components/layout/FloatingToolbar";
import { LeftRail } from "@/components/layout/LeftRail";
import { IconButton } from "@/components/ui/IconButton";
import { SearchSheet } from "@/components/layout/SearchSheet";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { PageControl } from "@/components/pdf/PageControl";
import { PdfPageSurface } from "@/components/pdf/PdfPageSurface";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function TabletReaderLayout() {
  const router = useRouter();
  const closePdf = usePdfStore((state) => state.closePdf);
  const readingMode = useUiStore((state) => state.readingMode);
  const setReadingMode = useUiStore((state) => state.setReadingMode);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const { isLandscape } = useDeviceClass();
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  useEffect(() => {
    setReadingMode(false);
  }, [setReadingMode]);

  return (
    <View style={[styles.root, { backgroundColor: theme.app }]}>
      {isLandscape && !readingMode ? <LeftRail /> : null}
      <View style={styles.workspace}>
        {!readingMode ? (
          <View style={styles.top}>
            <IconButton
              onPress={() => {
                closePdf();
                router.replace("/");
              }}
              size={38}
            >
              <ChevronLeft color={iconColor} size={19} />
            </IconButton>
            <FloatingToolbar compact />
            <PageControl compact />
          </View>
        ) : null}
        <View style={styles.reader}>
          <PdfPageSurface />
        </View>
      </View>
      <SettingsSheet />
      <SearchSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  reader: { flex: 1, overflow: "hidden", zIndex: 0 },
  root: { flex: 1, flexDirection: "row", overflow: "hidden" },
  top: { alignItems: "center", elevation: 30, flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, zIndex: 30 },
  workspace: { flex: 1, overflow: "hidden" }
});
