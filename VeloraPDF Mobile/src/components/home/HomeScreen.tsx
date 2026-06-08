import { useRouter } from "expo-router";
import { BookOpen, FolderOpen, Grid3X3, Mic, NotebookPen, ShieldCheck, Square } from "lucide-react-native";
import { useEffect } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VeloraLogo } from "@/components/brand/VeloraLogo";
import { RecentFileCard } from "@/components/home/RecentFileCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { useNotebookStore } from "@/stores/useNotebookStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useRecentFilesStore } from "@/stores/useRecentFilesStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";
import type { NotebookRecord, NotebookTemplate } from "@/types";

const chips = ["No ads", "No login", "Offline", "Local files"];

export function HomeScreen() {
  const router = useRouter();
  const device = useDeviceClass();
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const openPdf = usePdfStore((state) => state.openPdf);
  const reopenRecentFile = usePdfStore((state) => state.reopenRecentFile);
  const isLoading = usePdfStore((state) => state.isLoading);
  const error = usePdfStore((state) => state.error);
  const recentFiles = useRecentFilesStore((state) => state.recentFiles);
  const hydrateRecent = useRecentFilesStore((state) => state.hydrate);
  const removeRecentFile = useRecentFilesStore((state) => state.removeRecentFile);
  const hydrateAnnotations = useAnnotationStore((state) => state.hydrate);
  const notebooks = useNotebookStore((state) => state.notebooks);
  const hydrateNotebooks = useNotebookStore((state) => state.hydrate);
  const createNotebook = useNotebookStore((state) => state.createNotebook);
  const openNotebook = useNotebookStore((state) => state.openNotebook);
  const removeNotebook = useNotebookStore((state) => state.removeNotebook);

  useEffect(() => {
    hydrateRecent();
    hydrateAnnotations();
    hydrateNotebooks();
  }, [hydrateAnnotations, hydrateNotebooks, hydrateRecent]);

  async function handleOpen() {
    const file = await openPdf();
    if (file) router.push("/reader");
  }

  async function handleRecent(fileId: string) {
    const file = recentFiles.find((item) => item.id === fileId);
    if (!file) return;
    await reopenRecentFile(file);
    router.push("/reader");
  }

  async function handleCreateNotebook(template: NotebookTemplate) {
    await createNotebook(template);
    router.push("/notebook");
  }

  async function handleNotebook(notebook: NotebookRecord) {
    await openNotebook(notebook.id);
    router.push("/notebook");
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.app }]}>
      <ScrollView contentContainerStyle={[styles.content, device.isTablet && styles.tabletContent]}>
        <View style={styles.hero}>
          <VeloraLogo />
          <Text style={[styles.title, { color: theme.text }]}>Your private PDF workspace.</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Open, read and annotate PDFs locally on your Android tablet or phone.</Text>
          <View style={styles.actions}>
            <Button label={isLoading ? "Opening PDF..." : "Open PDF"} icon={isLoading ? <ActivityIndicator color="#FFFFFF" /> : <FolderOpen color="#FFFFFF" size={20} />} onPress={handleOpen} disabled={isLoading} />
            <Button label="Recent Files" variant="secondary" icon={<ShieldCheck color={theme.text} size={19} />} onPress={() => {}} />
          </View>
          {error ? <Text style={[styles.error, { color: "#FF5B5B" }]}>{error}</Text> : null}
          <View style={styles.chips}>
            {chips.map((chip) => (
              <View key={chip} style={[styles.chip, { backgroundColor: theme.elevated, borderColor: theme.border }]}>
                <Text style={[styles.chipText, { color: theme.text }]}>{chip}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Notebooks</Text>
            <View style={styles.sectionBadge}>
              <Mic color={theme.textMuted} size={16} />
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>audio notes</Text>
            </View>
          </View>
          <View style={[styles.templateGrid, device.isTablet && styles.templateGridTablet]}>
            <TemplateCard tablet={device.isTablet} icon={<Square color={theme.text} size={22} />} title="Blank page" subtitle="Free handwriting canvas." onPress={() => handleCreateNotebook("blank")} />
            <TemplateCard tablet={device.isTablet} icon={<NotebookPen color={theme.text} size={22} />} title="Lined page" subtitle="Notebook lines for writing." onPress={() => handleCreateNotebook("lined")} />
            <TemplateCard tablet={device.isTablet} icon={<Grid3X3 color={theme.text} size={22} />} title="Grid page" subtitle="Square paper for diagrams." onPress={() => handleCreateNotebook("grid")} />
          </View>
          {notebooks.length > 0 ? (
            <View style={[styles.recentGrid, device.isTablet && styles.recentGridTablet]}>
              {notebooks.slice(0, 6).map((notebook) => (
                <NotebookCard key={notebook.id} notebook={notebook} onOpen={() => handleNotebook(notebook)} onRemove={() => removeNotebook(notebook.id)} />
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent files</Text>
          {recentFiles.length === 0 ? (
            <EmptyState title="No recent PDFs yet." />
          ) : (
            <View style={[styles.recentGrid, device.isTablet && styles.recentGridTablet]}>
              {recentFiles.map((file) => (
                <RecentFileCard key={file.id} file={file} onOpen={() => handleRecent(file.id)} onRemove={() => removeRecentFile(file.id)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TemplateCard({ icon, title, subtitle, onPress, tablet = false }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void; tablet?: boolean }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={[styles.templateCard, tablet ? styles.templateCardTablet : null, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.templateLead}>
        <View style={[styles.templateIcon, { backgroundColor: theme.elevated, borderColor: theme.border }]}>{icon}</View>
        <View style={styles.templateText}>
          <Text style={[styles.templateTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.templateSubtitle, { color: theme.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
      </View>
      <View style={tablet ? styles.templateActionTablet : styles.templateAction}>
        <Button label="Create" icon={<BookOpen color="#FFFFFF" size={17} />} onPress={onPress} />
      </View>
    </View>
  );
}

function NotebookCard({ notebook, onOpen, onRemove }: { notebook: NotebookRecord; onOpen: () => void; onRemove: () => void }) {
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  return (
    <View style={[styles.notebookCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.notebookInfo}>
        <Text style={[styles.templateTitle, { color: theme.text }]} numberOfLines={1}>
          {notebook.title}
        </Text>
        <Text style={[styles.templateSubtitle, { color: theme.textMuted }]}>
          {notebook.strokes.length} strokes · {notebook.voiceNotes.length} recordings
        </Text>
      </View>
      <View style={styles.notebookActions}>
        <Button label="Open" variant="secondary" onPress={onOpen} />
        <Button label="Remove" variant="ghost" onPress={onRemove} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 26 },
  badgeText: { fontSize: 12, fontWeight: "800" },
  chip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 22 },
  chipText: { fontSize: 12, fontWeight: "800" },
  content: { gap: 34, padding: 20, paddingBottom: 42 },
  error: { fontSize: 13, fontWeight: "700", marginTop: 14 },
  hero: { maxWidth: 720, paddingTop: 24 },
  recentGrid: { gap: 12 },
  recentGridTablet: { display: "flex", gap: 14 },
  root: { flex: 1 },
  section: { gap: 14, width: "100%" },
  sectionBadge: { alignItems: "center", flexDirection: "row", gap: 6 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 17, lineHeight: 25, marginTop: 12, maxWidth: 620 },
  tabletContent: { alignSelf: "center", maxWidth: 1100, width: "100%" },
  templateAction: { flexShrink: 0 },
  templateActionTablet: { alignSelf: "stretch", marginTop: 4 },
  templateCard: { alignItems: "center", borderRadius: 8, borderWidth: 1, flex: 1, flexDirection: "row", gap: 12, padding: 14 },
  templateCardTablet: { alignItems: "stretch", flexDirection: "column", minHeight: 160, padding: 16 },
  templateGrid: { gap: 12 },
  templateGridTablet: { flexDirection: "row" },
  templateIcon: { alignItems: "center", borderRadius: 8, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  templateLead: { alignItems: "center", flex: 1, flexDirection: "row", gap: 12, minWidth: 0 },
  templateSubtitle: { fontSize: 12, fontWeight: "700", marginTop: 3 },
  templateText: { flex: 1, minWidth: 0 },
  templateTitle: { fontSize: 15, fontWeight: "900" },
  notebookActions: { flexDirection: "row", gap: 8 },
  notebookCard: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 },
  notebookInfo: { flex: 1 },
  title: { fontSize: 38, fontWeight: "900", lineHeight: 44, marginTop: 32 }
});
