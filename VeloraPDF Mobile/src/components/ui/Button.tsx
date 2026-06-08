import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

type Props = {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onPress: () => void;
  disabled?: boolean;
};

export function Button({ label, icon, variant = "primary", onPress, disabled }: Props) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: variant === "primary" ? theme.accent : variant === "secondary" ? theme.elevated : "transparent",
          borderColor: variant === "ghost" ? "transparent" : theme.border,
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1
        }
      ]}
    >
      <View style={styles.content}>
        {icon}
        <Text style={[styles.label, { color: variant === "primary" ? "#FFFFFF" : theme.text }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    justifyContent: "center"
  },
  content: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center"
  },
  label: {
    fontSize: 15,
    fontWeight: "700"
  }
});
