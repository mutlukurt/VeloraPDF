import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";
import { PhoneReaderLayout } from "./PhoneReaderLayout";
import { TabletReaderLayout } from "./TabletReaderLayout";

export function AppShell() {
  const router = useRouter();
  const device = useDeviceClass();
  const file = usePdfStore((state) => state.currentFile);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);

  useEffect(() => {
    if (!file) router.replace("/");
  }, [file, router]);

  if (!file) return <View style={[styles.root, { backgroundColor: theme.app }]} />;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.app }]}>
      {device.isPhone ? <PhoneReaderLayout /> : <TabletReaderLayout />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
