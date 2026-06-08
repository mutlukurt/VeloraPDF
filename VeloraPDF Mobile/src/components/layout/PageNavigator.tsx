import { Search } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PageNavigator({ compact = false }: { compact?: boolean }) {
  const file = usePdfStore((state) => state.currentFile);
  const pageCount = usePdfStore((state) => state.pageCount);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const setPagesPanelOpen = useUiStore((state) => state.setPagesPanelOpen);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const count = Math.max(pageCount || file?.pageCount || 1, 1);

  return (
    <View style={[styles.panel, compact ? styles.compact : null, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {file?.name ?? "Pages"}
      </Text>
      <Text style={[styles.meta, { color: theme.textMuted }]}>{count} pages</Text>
      <View style={[styles.searchBox, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
        <Search color={theme.textMuted} size={16} />
        <TextInput placeholder="Find page" placeholderTextColor={theme.textMuted} keyboardType="number-pad" style={[styles.input, { color: theme.text }]} />
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {Array.from({ length: count }).map((_, index) => {
          const page = index + 1;
          const active = currentPage === page;
          return (
            <Button
              key={page}
              label={`Page ${page}`}
              variant={active ? "primary" : "secondary"}
              onPress={() => {
                setCurrentPage(page);
                if (compact) setPagesPanelOpen(false);
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  compact: { borderWidth: 0, maxHeight: "100%", width: "100%" },
  input: { flex: 1, fontSize: 14, minHeight: 38 },
  list: { gap: 8, paddingBottom: 18 },
  meta: { fontSize: 12, fontWeight: "700", marginTop: 4 },
  panel: { borderRightWidth: 1, padding: 14, width: 260 },
  searchBox: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, marginVertical: 14, paddingHorizontal: 10 },
  title: { fontSize: 16, fontWeight: "900", lineHeight: 21 }
});
