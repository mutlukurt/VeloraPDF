import { FolderOpen, Home, Search, Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function LeftRail() {
  const router = useRouter();
  const closePdf = usePdfStore((state) => state.closePdf);
  const openPdf = usePdfStore((state) => state.openPdf);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  return (
    <View style={[styles.rail, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <IconButton onPress={() => openPdf()}>
        <FolderOpen color={iconColor} size={20} />
      </IconButton>
      <IconButton onPress={() => setSearchOpen(true)}>
        <Search color={iconColor} size={20} />
      </IconButton>
      <View style={styles.spacer} />
      <IconButton onPress={() => setSettingsOpen(true)}>
        <Settings color={iconColor} size={20} />
      </IconButton>
      <IconButton
        onPress={() => {
          closePdf();
          router.replace("/");
        }}
      >
        <Home color={iconColor} size={20} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { alignItems: "center", borderRightWidth: 1, gap: 10, paddingHorizontal: 6, paddingVertical: 12, width: 56 },
  spacer: { flex: 1 }
});
