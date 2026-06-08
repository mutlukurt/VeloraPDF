import Pdf from "react-native-pdf";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { AnnotationOverlay } from "@/components/pdf/AnnotationOverlay";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PdfReader() {
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const file = usePdfStore((state) => state.currentFile);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);
  const setPageCount = usePdfStore((state) => state.setPageCount);
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pageFrame = useMemo(() => {
    if (!pageSize || pageSize.width <= 0 || pageSize.height <= 0) {
      return { width: viewport.width, height: viewport.height };
    }
    const horizontalPadding = 18;
    const verticalPadding = 18;
    const maxWidth = Math.max(1, viewport.width - horizontalPadding * 2);
    const maxHeight = Math.max(1, viewport.height - verticalPadding * 2);
    const pageRatio = pageSize.width / pageSize.height;
    const viewportRatio = maxWidth / maxHeight;
    if (pageRatio > viewportRatio) {
      return { width: maxWidth, height: maxWidth / pageRatio };
    }
    return { width: maxHeight * pageRatio, height: maxHeight };
  }, [pageSize, viewport.height, viewport.width]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(activeTool === "select")
        .onUpdate((event) => {
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [activeTool, savedTranslateX, savedTranslateY, translateX, translateY]
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .enabled(activeTool === "select")
        .onUpdate((event) => {
          scale.value = Math.max(1, Math.min(4, savedScale.value * event.scale));
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          if (scale.value <= 1.01) {
            scale.value = 1;
            savedScale.value = 1;
            translateX.value = 0;
            translateY.value = 0;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
          }
        }),
    [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]
  );

  const animatedPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }]
  }));

  if (!file) return null;

  return (
    <View
      style={[styles.wrap, { backgroundColor: theme.canvas }]}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
    >
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
        <Animated.View style={[styles.page, { width: pageFrame.width, height: pageFrame.height }, animatedPageStyle]}>
          <Pdf
            source={{ uri: file.uri }}
            page={currentPage}
            trustAllCerts={false}
            enablePaging={false}
            enableRTL={false}
            enableDoubleTapZoom={false}
            scrollEnabled={false}
            singlePage
            fitPolicy={2}
            spacing={0}
            scale={1}
            minScale={1}
            maxScale={1}
            onLoadComplete={(pages, _path, size) => {
              setPageCount(pages);
              setPageSize(size);
            }}
            onPageChanged={(page) => setCurrentPage(page)}
            onError={() => {}}
            renderActivityIndicator={() => (
              <View style={styles.loading}>
                <ActivityIndicator color={theme.accent} />
                <Text style={[styles.loadingText, { color: theme.textMuted }]}>Opening PDF...</Text>
              </View>
            )}
            style={[styles.pdf, { backgroundColor: "#FFFFFF" }]}
          />
          <AnnotationOverlay />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: "center", gap: 12, justifyContent: "center" },
  loadingText: { fontSize: 13, fontWeight: "700" },
  page: {
    backgroundColor: "#FFFFFF",
    elevation: 8,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
    shadowRadius: 18
  },
  pdf: { flex: 1, height: "100%", width: "100%" },
  wrap: { alignItems: "center", borderRadius: 8, flex: 1, justifyContent: "center", overflow: "hidden" }
});
