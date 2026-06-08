import { StyleSheet, Text, View } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function EmptyState({ title }: { title: string }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={styles.wrap}>
      <Text style={[styles.text, { color: theme.textMuted }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", padding: 24 },
  text: { fontSize: 14, fontWeight: "600" }
});
