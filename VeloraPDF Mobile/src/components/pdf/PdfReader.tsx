import Pdf from "react-native-pdf";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { AnnotationOverlay } from "@/components/pdf/AnnotationOverlay";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import { useUiStore } from "@/stores/useUiStore";
import { getTheme } from "@/theme/tokens";

export function PdfReader() {
  const [pageSize, setPageSize] = useState<{ width: number; height: number } | null>(null);
  const [viewport, setViewport] = useState({ width: 1, height: 1 });
  const pdfRef = useRef<Pdf>(null);
  const device = useDeviceClass();
  const file = usePdfStore((state) => state.currentFile);
  const currentPage = usePdfStore((state) => state.currentPage);
  const setPageCount = usePdfStore((state) => state.setPageCount);
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const readingMode = useUiStore((state) => state.readingMode);
  const setReadingMode = useUiStore((state) => state.setReadingMode);
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
    const readableMaxWidth =
      device.isTablet && !device.isLandscape && !readingMode
        ? Math.min(viewport.width - horizontalPadding * 2, 520)
        : viewport.width - horizontalPadding * 2;
    const maxWidth = Math.max(1, readableMaxWidth);
    const maxHeight = Math.max(1, viewport.height - verticalPadding * 2);
    const pageRatio = pageSize.width / pageSize.height;
    const viewportRatio = maxWidth / maxHeight;
    if (pageRatio > viewportRatio) {
      return { width: maxWidth, height: maxWidth / pageRatio };
    }
    return { width: maxHeight * pageRatio, height: maxHeight };
  }, [device.isLandscape, device.isTablet, pageSize, readingMode, viewport.height, viewport.width]);

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

  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(readingMode)
        .numberOfTaps(2)
        .runOnJS(true)
        .onEnd(() => setReadingMode(false)),
    [readingMode, setReadingMode]
  );

  const animatedPageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }]
  }));

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [currentPage, file?.id, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  useEffect(() => {
    pdfRef.current?.setPage(currentPage);
  }, [currentPage]);

  if (!file) return null;

  return (
    <View
      style={styles.wrap}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setViewport((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
    >
      <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture, doubleTapGesture)}>
        <Animated.View style={[styles.page, { width: pageFrame.width, height: pageFrame.height }, animatedPageStyle]}>
          <Pdf
            ref={pdfRef}
            key={`${file.id}-${currentPage}`}
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
            onPageChanged={() => {}}
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
    overflow: "hidden",
    backgroundColor: "transparent",
    zIndex: 0
  },
  pdf: { flex: 1, height: "100%", width: "100%" },
  wrap: { alignItems: "center", flex: 1, justifyContent: "center", overflow: "hidden", zIndex: 0 }
});
