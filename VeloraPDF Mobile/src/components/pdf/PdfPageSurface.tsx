import { StyleSheet, View } from "react-native";
import { PdfReader } from "@/components/pdf/PdfReader";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PdfPageSurface() {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={[styles.surface, { backgroundColor: theme.workspace }]}>
      <PdfReader />
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { flex: 1, padding: 12 }
});
