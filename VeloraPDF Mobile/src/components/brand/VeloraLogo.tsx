import { Image, StyleSheet, Text, View } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function VeloraLogo({ compact = false }: { compact?: boolean }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={styles.row}>
      <Image source={require("../../../assets/icon.png")} style={compact ? styles.iconSmall : styles.icon} />
      <Text style={[compact ? styles.compactText : styles.text, { color: theme.text }]}>Velora PDF</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 10 },
  icon: { borderRadius: 16, height: 64, width: 64 },
  iconSmall: { borderRadius: 8, height: 30, width: 30 },
  text: { fontSize: 26, fontWeight: "800" },
  compactText: { fontSize: 16, fontWeight: "800" }
});
