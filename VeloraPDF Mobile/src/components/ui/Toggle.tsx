import { Pressable, StyleSheet, Text, View } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <Pressable style={styles.row} onPress={() => onChange(!value)}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: value ? theme.accent : theme.elevated, borderColor: theme.border }]}>
        <View style={[styles.knob, { transform: [{ translateX: value ? 18 : 0 }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 46 },
  label: { fontSize: 15, fontWeight: "600" },
  track: { borderRadius: 16, borderWidth: 1, height: 30, padding: 3, width: 56 },
  knob: { backgroundColor: "#FFFFFF", borderRadius: 12, height: 24, width: 24 }
});
