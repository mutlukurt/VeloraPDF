import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BottomToolDock } from "@/components/layout/BottomToolDock";
import { PageNavigator } from "@/components/layout/PageNavigator";
import { SearchSheet } from "@/components/layout/SearchSheet";
import { SettingsSheet } from "@/components/layout/SettingsSheet";
import { PdfPageSurface } from "@/components/pdf/PdfPageSurface";
import { Sheet } from "@/components/ui/Sheet";
import { useUiStore } from "@/stores/useUiStore";

export function PhoneReaderLayout() {
  const pagesOpen = useUiStore((state) => state.pagesPanelOpen);
  const setPagesPanelOpen = useUiStore((state) => state.setPagesPanelOpen);
  useEffect(() => {
    setPagesPanelOpen(false);
  }, [setPagesPanelOpen]);

  return (
    <View style={styles.root}>
      <AppHeader />
      <BottomToolDock />
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
  reader: { flex: 1 },
  root: { flex: 1 }
});
