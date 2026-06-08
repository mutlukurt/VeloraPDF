import { Search } from "lucide-react-native";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function SearchSheet() {
  const open = useUiStore((state) => state.searchOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const pageCount = usePdfStore((state) => state.pageCount);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);

  return (
    <Sheet open={open} onClose={() => setSearchOpen(false)}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Search</Text>
        <View style={[styles.inputWrap, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
          <Search color={theme.textMuted} size={18} />
          <TextInput placeholder="Search inside PDF" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.text }]} />
        </View>
        <Text style={[styles.note, { color: theme.textMuted }]}>Text search is coming soon. Page jump is available in this MVP.</Text>
        <View style={styles.quick}>
          {Array.from({ length: Math.min(pageCount || 1, 6) }).map((_, index) => (
            <Button key={index} label={`Page ${index + 1}`} variant="secondary" onPress={() => setCurrentPage(index + 1)} />
          ))}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  input: { flex: 1, fontSize: 15, minHeight: 44 },
  inputWrap: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, paddingHorizontal: 12 },
  note: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  title: { fontSize: 24, fontWeight: "900" }
});
