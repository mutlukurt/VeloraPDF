import { Eraser, Hand, Highlighter, MoreHorizontal, MousePointer2, PenLine, Redo2, Search, StickyNote, Undo2 } from "lucide-react-native";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { IconButton } from "@/components/ui/IconButton";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { annotationColors, getTheme } from "@/theme/tokens";

const colors = [annotationColors.yellow, annotationColors.green, annotationColors.pink, annotationColors.blue, annotationColors.inkPurple, annotationColors.inkRed, annotationColors.inkDark];

export function BottomToolDock() {
  const { width } = useWindowDimensions();
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
  const setPagesPanelOpen = useUiStore((state) => state.setPagesPanelOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const iconColor = resolvedTheme === "dark" ? "#FFFFFF" : "#0E0E12";
  const buttonSize = Math.max(28, Math.min(36, Math.floor((width * 0.96 - 58) / 10)));
  const iconSize = Math.max(16, Math.min(19, buttonSize - 12));

  return (
    <View style={[styles.dock, { backgroundColor: theme.toolbar, borderColor: theme.border }]}>
      <View style={styles.row}>
        <IconButton active={palmRejection} onPress={() => setPalmRejection(!palmRejection)} size={buttonSize}>
          <Hand color={palmRejection ? "#FFFFFF" : iconColor} size={iconSize} />
        </IconButton>
        <IconButton active={activeTool === "select"} onPress={() => setActiveTool("select")} size={buttonSize}>
          <MousePointer2 color={activeTool === "select" ? "#FFFFFF" : iconColor} size={iconSize} />
        </IconButton>
        <IconButton active={activeTool === "highlight"} onPress={() => setActiveTool("highlight")} size={buttonSize}>
          <Highlighter color={activeTool === "highlight" ? "#FFFFFF" : iconColor} size={iconSize} />
        </IconButton>
        <IconButton active={activeTool === "pen"} onPress={() => setActiveTool("pen")} size={buttonSize}>
          <PenLine color={activeTool === "pen" ? "#FFFFFF" : iconColor} size={iconSize} />
        </IconButton>
        <IconButton active={activeTool === "eraser"} onPress={() => setActiveTool("eraser")} size={buttonSize}>
          <Eraser color={activeTool === "eraser" ? "#FFFFFF" : iconColor} size={iconSize} />
        </IconButton>
        <IconButton onPress={() => file && undo(file.id)} disabled={!canUndo} size={buttonSize}>
          <Undo2 color={iconColor} size={iconSize} />
        </IconButton>
        <IconButton onPress={() => file && redo(file.id)} disabled={!canRedo} size={buttonSize}>
          <Redo2 color={iconColor} size={iconSize} />
        </IconButton>
        <IconButton onPress={() => setPagesPanelOpen(true)} size={buttonSize}>
          <StickyNote color={iconColor} size={iconSize} />
        </IconButton>
        <IconButton onPress={() => setSearchOpen(true)} size={buttonSize}>
          <Search color={iconColor} size={iconSize} />
        </IconButton>
        <IconButton onPress={() => setSettingsOpen(true)} size={buttonSize}>
          <MoreHorizontal color={iconColor} size={iconSize} />
        </IconButton>
      </View>
      <View style={styles.colors}>
        {colors.map((item) => (
          <Pressable key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item, borderColor: color === item ? theme.accent : theme.border, transform: [{ scale: color === item ? 1.1 : 1 }] }]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  dock: {
    alignSelf: "center",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 20,
    gap: 6,
    marginBottom: 8,
    marginHorizontal: 12,
    padding: 6,
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: "96%",
    zIndex: 20
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 4, justifyContent: "center" },
  swatch: { borderRadius: 8, borderWidth: 2, height: 26, width: 26 }
});
