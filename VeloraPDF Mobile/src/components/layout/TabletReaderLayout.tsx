import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
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
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const { isLandscape } = useDeviceClass();
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  return (
    <View style={[styles.root, { backgroundColor: theme.app }]}>
      {isLandscape ? <LeftRail /> : null}
      <View style={styles.workspace}>
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
        <PdfPageSurface />
      </View>
      <SettingsSheet />
      <SearchSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: "row" },
  top: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", paddingHorizontal: 14, paddingVertical: 10, zIndex: 2 },
  workspace: { flex: 1 }
});
