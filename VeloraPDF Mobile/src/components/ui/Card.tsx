import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function Card({ children }: { children: ReactNode }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  }
});
