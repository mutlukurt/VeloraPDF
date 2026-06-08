import type { ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

type Props = {
  children: ReactNode;
  onPress: () => void;
  active?: boolean;
  size?: number;
  disabled?: boolean;
};

export function IconButton({ children, onPress, active, size = 44, disabled }: Props) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          backgroundColor: active ? theme.accent : theme.elevated,
          borderColor: active ? theme.accent : theme.border,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1
        }
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center"
  }
});
