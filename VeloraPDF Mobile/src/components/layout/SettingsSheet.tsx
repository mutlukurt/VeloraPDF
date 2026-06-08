import { Moon, Share2, Sun } from "lucide-react-native";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AnnotationToolbar } from "@/components/annotations/AnnotationToolbar";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { Toggle } from "@/components/ui/Toggle";
import { exportAnnotationJson, shareOriginalPdf } from "@/lib/pdf/exportAnnotations";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useRecentFilesStore } from "@/stores/useRecentFilesStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";
import type { Annotation } from "@/types";

const EMPTY_ANNOTATIONS: Annotation[] = [];

export function SettingsSheet() {
  const open = useUiStore((state) => state.settingsOpen);
  const setSettingsOpen = useUiStore((state) => state.setSettingsOpen);
  const themeMode = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const setEyeProtection = useUiStore((state) => state.setEyeProtection);
  const keepScreenAwake = useUiStore((state) => state.keepScreenAwake);
  const setKeepScreenAwake = useUiStore((state) => state.setKeepScreenAwake);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const clearRecentFiles = useRecentFilesStore((state) => state.clearRecentFiles);
  const file = usePdfStore((state) => state.currentFile);
  const annotationsByFile = useAnnotationStore((state) => state.annotationsByFile);
  const annotations = file ? annotationsByFile[file.id] ?? EMPTY_ANNOTATIONS : EMPTY_ANNOTATIONS;

  async function handleJsonExport() {
    if (!file) return;
    try {
      const uri = await exportAnnotationJson(file, annotations);
      Alert.alert("Annotations exported", uri);
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Could not export annotations.");
    }
  }

  async function handleSharePdf() {
    if (!file) return;
    try {
      await shareOriginalPdf(file);
    } catch (error) {
      Alert.alert("Share failed", error instanceof Error ? error.message : "Could not share PDF.");
    }
  }

  return (
    <Sheet open={open} onClose={() => setSettingsOpen(false)}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
        <View style={styles.segment}>
          <Button label="Dark" icon={<Moon color="#FFFFFF" size={17} />} variant={themeMode === "dark" ? "primary" : "secondary"} onPress={() => setTheme("dark")} />
          <Button label="Light" icon={<Sun color={theme.text} size={17} />} variant={themeMode === "light" ? "primary" : "secondary"} onPress={() => setTheme("light")} />
          <Button label="System" variant={themeMode === "system" ? "primary" : "secondary"} onPress={() => setTheme("system")} />
        </View>
        <Toggle label="Eye protection mode" value={eyeProtection} onChange={setEyeProtection} />
        <Toggle label="Keep screen awake" value={keepScreenAwake} onChange={setKeepScreenAwake} />
        <Text style={[styles.note, { color: theme.textMuted }]}>Velora PDF opens and processes PDFs locally on your device. It does not upload documents, track usage, show ads, or require an account.</Text>
        <AnnotationToolbar />
        <Button label="Share original PDF" icon={<Share2 color="#FFFFFF" size={18} />} onPress={handleSharePdf} disabled={!file} />
        <Button label="Save JSON" variant="secondary" onPress={handleJsonExport} disabled={!file} />
        <Text style={[styles.note, { color: theme.textMuted }]}>Annotated PDF export is experimental in this mobile MVP.</Text>
        <Button label="Clear recent files" variant="secondary" onPress={clearRecentFiles} />
        <Text style={[styles.version, { color: theme.textMuted }]}>Velora PDF Mobile 1.0.0</Text>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  note: { fontSize: 13, fontWeight: "600", lineHeight: 19 },
  segment: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  title: { fontSize: 24, fontWeight: "900" },
  version: { fontSize: 12, fontWeight: "800", textAlign: "center" }
});
