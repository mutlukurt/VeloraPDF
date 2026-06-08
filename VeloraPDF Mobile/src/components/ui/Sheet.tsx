import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={[styles.handle, { backgroundColor: theme.border }]} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.38)", flex: 1 },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, borderWidth: 1, maxHeight: "78%", padding: 18 },
  handle: { alignSelf: "center", borderRadius: 2, height: 4, marginBottom: 16, width: 42 }
});
