import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PageControl({ compact = false }: { compact?: boolean }) {
  const page = usePdfStore((state) => state.currentPage);
  const pageCount = usePdfStore((state) => state.pageCount);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";
  const count = Math.max(pageCount || 1, 1);

  return (
    <View style={[styles.control, compact ? styles.compact : null, { backgroundColor: theme.toolbar, borderColor: theme.border }]}>
      <IconButton size={compact ? 34 : 38} onPress={() => setCurrentPage(Math.max(1, page - 1))} disabled={page <= 1}>
        <ChevronLeft color={iconColor} size={compact ? 17 : 18} />
      </IconButton>
      <Text style={[styles.text, compact ? styles.compactText : null, { color: theme.text }]}>
        {page} / {count}
      </Text>
      <IconButton size={compact ? 34 : 38} onPress={() => setCurrentPage(Math.min(count, page + 1))} disabled={page >= count}>
        <ChevronRight color={iconColor} size={compact ? 17 : 18} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { gap: 8, paddingHorizontal: 8, paddingVertical: 5 },
  compactText: { fontSize: 13, minWidth: 64 },
  control: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, padding: 8 },
  text: { fontSize: 14, fontWeight: "900", minWidth: 72, textAlign: "center" }
});
