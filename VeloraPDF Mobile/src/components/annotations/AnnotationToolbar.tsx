import { StyleSheet, Text, View } from "react-native";
import { ColorPicker } from "@/components/annotations/ColorPicker";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function AnnotationToolbar() {
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Active tool: {activeTool}</Text>
      <ColorPicker />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  wrap: { borderRadius: 8, borderWidth: 1, gap: 12, padding: 12 }
});
