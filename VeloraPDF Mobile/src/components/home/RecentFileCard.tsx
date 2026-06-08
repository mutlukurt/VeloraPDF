import { FileText, RotateCcw, X } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { PdfFileRecord } from "@/types";
import { IconButton } from "@/components/ui/IconButton";
import { formatRelativeTime } from "@/lib/utils/dates";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

type Props = {
  file: PdfFileRecord;
  onOpen: () => void;
  onRemove: () => void;
};

export function RecentFileCard({ file, onOpen, onRemove }: Props) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  return (
    <Pressable onPress={onOpen} style={({ pressed }) => [styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.82 : 1 }]}>
      <View style={[styles.fileIcon, { backgroundColor: theme.elevated }]}>
        <FileText color={theme.accent} size={22} />
      </View>
      <View style={styles.meta}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
          {file.name}
        </Text>
        <Text style={[styles.time, { color: theme.textMuted }]}>{formatRelativeTime(file.lastOpened)}</Text>
      </View>
      <View style={styles.actions}>
        <IconButton onPress={onOpen} size={38}>
          <RotateCcw color={iconColor} size={18} />
        </IconButton>
        <IconButton onPress={onRemove} size={38}>
          <X color={iconColor} size={18} />
        </IconButton>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8 },
  card: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, minHeight: 86, padding: 14 },
  fileIcon: { alignItems: "center", borderRadius: 8, height: 44, justifyContent: "center", width: 44 },
  meta: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "800", lineHeight: 20 },
  time: { fontSize: 12, fontWeight: "600", marginTop: 5 }
});
