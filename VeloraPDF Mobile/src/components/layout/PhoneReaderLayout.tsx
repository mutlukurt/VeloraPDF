import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomToolDock } from "@/components/layout/BottomToolDock";
import { PageNavigator } from "@/components/layout/PageNavigator";
import { SearchSheet } from "@/components/layout/SearchSheet";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { PageControl } from "@/components/pdf/PageControl";
import { PdfPageSurface } from "@/components/pdf/PdfPageSurface";
import { Sheet } from "@/components/ui/Sheet";
import { useUiStore } from "@/stores/useUiStore";

export function PhoneReaderLayout() {
  const pagesOpen = useUiStore((state) => state.pagesPanelOpen);
  const readingMode = useUiStore((state) => state.readingMode);
  const setReadingMode = useUiStore((state) => state.setReadingMode);
  const setPagesPanelOpen = useUiStore((state) => state.setPagesPanelOpen);
  useEffect(() => {
    setPagesPanelOpen(false);
    setReadingMode(false);
  }, [setPagesPanelOpen, setReadingMode]);

  return (
    <View style={styles.root}>
      {!readingMode ? (
        <View style={styles.controlsLayer}>
          <AppHeader />
          <BottomToolDock />
          <View style={styles.pageControl}>
            <PageControl compact />
          </View>
        </View>
      ) : null}
      <View style={styles.reader}>
        <PdfPageSurface />
      </View>
      <Sheet open={pagesOpen} onClose={() => setPagesPanelOpen(false)}>
        <PageNavigator compact />
      </Sheet>
      <SettingsSheet />
      <SearchSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  controlsLayer: { elevation: 30, zIndex: 30 },
  pageControl: { alignItems: "center", marginBottom: 8 },
  reader: { flex: 1, overflow: "hidden", zIndex: 0 },
  root: { flex: 1, overflow: "hidden" }
});
