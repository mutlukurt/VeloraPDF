import { useRouter } from "expo-router";
import { FolderOpen, Home, Moon, Settings } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { VeloraLogo } from "@/components/brand/VeloraLogo";
import { IconButton } from "@/components/ui/IconButton";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function AppHeader() {
  const router = useRouter();
  const file = usePdfStore((state) => state.currentFile);
  const openPdf = usePdfStore((state) => state.openPdf);
  const closePdf = usePdfStore((state) => state.closePdf);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const themeMode = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  async function changePdf() {
    const next = await openPdf();
    if (next) router.replace("/reader");
  }

  return (
    <View style={[styles.header, { backgroundColor: theme.toolbar, borderColor: theme.border }]}>
      <VeloraLogo compact />
      <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
        {file?.name ?? "No PDF"}
      </Text>
      <View style={styles.actions}>
        <IconButton onPress={changePdf} size={38}>
          <FolderOpen color={iconColor} size={18} />
        </IconButton>
        <IconButton onPress={() => setTheme(themeMode === "dark" ? "light" : "dark")} size={38}>
          <Moon color={iconColor} size={18} />
        </IconButton>
        <IconButton onPress={() => setSettingsOpen(true)} size={38}>
          <Settings color={iconColor} size={18} />
        </IconButton>
        <IconButton
          onPress={() => {
            closePdf();
            router.replace("/");
          }}
          size={38}
        >
          <Home color={iconColor} size={18} />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 },
  fileName: { flex: 1, fontSize: 14, fontWeight: "800", minWidth: 0 },
  header: { alignItems: "center", borderRadius: 8, borderWidth: 1, elevation: 30, flexDirection: "row", gap: 12, margin: 12, padding: 8, zIndex: 30 }
});
