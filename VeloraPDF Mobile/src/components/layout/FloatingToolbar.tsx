import { BookOpen, Circle, Eraser, Hand, Highlighter, MousePointer2, PenLine, Redo2, Square, StickyNote, Type, Undo2 } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { annotationColors, getTheme } from "@/theme/tokens";
import type { AnnotationTool } from "@/types";

const tools: { id: AnnotationTool; icon: typeof MousePointer2 }[] = [
  { id: "select", icon: MousePointer2 },
  { id: "highlight", icon: Highlighter },
  { id: "pen", icon: PenLine },
  { id: "eraser", icon: Eraser },
  { id: "rectangle", icon: Square },
  { id: "circle", icon: Circle },
  { id: "text", icon: Type },
  { id: "sticky", icon: StickyNote }
];
const colors = [annotationColors.yellow, annotationColors.green, annotationColors.pink, annotationColors.blue, annotationColors.inkPurple, annotationColors.inkRed, annotationColors.inkDark];

export function FloatingToolbar({ compact = false }: { compact?: boolean }) {
  const file = usePdfStore((state) => state.currentFile);
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const setActiveTool = useAnnotationStore((state) => state.setActiveTool);
  const color = useAnnotationStore((state) => state.color);
  const setColor = useAnnotationStore((state) => state.setColor);
  const palmRejection = useAnnotationStore((state) => state.palmRejection);
  const setPalmRejection = useAnnotationStore((state) => state.setPalmRejection);
  const canUndo = useAnnotationStore((state) => state.canUndoForFile(file?.id));
  const canRedo = useAnnotationStore((state) => state.canRedoForFile(file?.id));
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const readingMode = useUiStore((state) => state.readingMode);
  const setReadingMode = useUiStore((state) => state.setReadingMode);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";

  return (
    <View style={[styles.toolbar, compact ? styles.compactToolbar : null, { backgroundColor: theme.toolbar, borderColor: theme.border, shadowColor: theme.accent }]}>
      <View style={[styles.row, compact ? styles.compactRow : null]}>
        <IconButton active={readingMode} onPress={() => setReadingMode(true)} size={compact ? 36 : 42}>
          <BookOpen color={readingMode ? "#FFFFFF" : iconColor} size={compact ? 17 : 18} />
        </IconButton>
        <IconButton active={palmRejection} onPress={() => setPalmRejection(!palmRejection)} size={compact ? 36 : 42}>
          <Hand color={palmRejection ? "#FFFFFF" : iconColor} size={compact ? 17 : 18} />
        </IconButton>
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = activeTool === tool.id;
          return (
            <IconButton key={tool.id} active={active} onPress={() => setActiveTool(tool.id)} size={compact ? 36 : 42}>
              <Icon color={active ? "#FFFFFF" : iconColor} size={compact ? 17 : 18} />
            </IconButton>
          );
        })}
        <IconButton onPress={() => file && undo(file.id)} disabled={!canUndo} size={compact ? 36 : 42}>
          <Undo2 color={iconColor} size={compact ? 17 : 18} />
        </IconButton>
        <IconButton onPress={() => file && redo(file.id)} disabled={!canRedo} size={compact ? 36 : 42}>
          <Redo2 color={iconColor} size={compact ? 17 : 18} />
        </IconButton>
      </View>
      <View style={[styles.colors, compact ? styles.compactColors : null]}>
        {colors.map((item) => (
          <Pressable key={item} onPress={() => setColor(item)} style={[styles.swatch, compact ? styles.compactSwatch : null, { backgroundColor: item, borderColor: color === item ? theme.accent : theme.border, transform: [{ scale: color === item ? 1.1 : 1 }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    alignSelf: "center",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 10,
    gap: 8,
    padding: 8,
    shadowOpacity: 0.24,
    shadowRadius: 18
  },
  colors: { flexDirection: "row", gap: 8, justifyContent: "center" },
  compactColors: { gap: 6 },
  compactRow: { gap: 6 },
  compactSwatch: { height: 23, width: 23 },
  compactToolbar: { gap: 7, maxWidth: "100%", padding: 7 },
  row: { flexDirection: "row", gap: 8 },
  swatch: { borderRadius: 8, borderWidth: 2, height: 28, width: 28 }
});
