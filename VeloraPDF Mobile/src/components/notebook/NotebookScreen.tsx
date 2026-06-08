import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Eraser, FileDown, FilePlus2, Hand, Highlighter, Mic, MousePointer2, Pause, PenLine, Play, Redo2, StopCircle, Undo2 } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Line, Polyline } from "react-native-svg";
import { IconButton } from "@/components/ui/IconButton";
import { exportNotebookPdf } from "@/lib/notebook/exportNotebookPdf";
import { copyRecordingToNotebook } from "@/lib/notebook/notebookStorage";
import { createId } from "@/lib/utils/ids";
import { useDeviceClass } from "@/lib/device/breakpoints";
import { useNotebookStore } from "@/stores/useNotebookStore";
import { useUiStore } from "@/stores/useUiStore";
import { annotationColors, getTheme } from "@/theme/tokens";
import type { NotebookTemplate, NoteStroke, VoiceNote } from "@/types";

const inkColor = "#121217";
const paperColor = "#FFFEFB";
type NotebookTool = "select" | "pen" | "highlight" | "eraser";
const noteColors = [inkColor, annotationColors.inkPurple, annotationColors.inkRed, annotationColors.blue, annotationColors.yellow, annotationColors.green, annotationColors.pink];

export function NotebookScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const device = useDeviceClass();
  const resolvedTheme = useUiStore((state) => state.resolvedTheme);
  const eyeProtection = useUiStore((state) => state.eyeProtection);
  const theme = getTheme(resolvedTheme, eyeProtection);
  const notebook = useNotebookStore((state) => state.currentNotebook);
  const [currentPage, setCurrentPage] = useState(1);
  const hydrate = useNotebookStore((state) => state.hydrate);
  const addStroke = useNotebookStore((state) => state.addStroke);
  const undoStroke = useNotebookStore((state) => state.undoStroke);
  const redoStroke = useNotebookStore((state) => state.redoStroke);
  const deleteStroke = useNotebookStore((state) => state.deleteStroke);
  const addPage = useNotebookStore((state) => state.addPage);
  const setPageOrientation = useNotebookStore((state) => state.setPageOrientation);
  const canRedo = useNotebookStore((state) => Boolean(notebook && (state.undoneStrokesByNotebook[notebook.id] ?? []).some((stroke) => (stroke.page || 1) === currentPage)));
  const addVoiceNote = useNotebookStore((state) => state.addVoiceNote);
  const [pageSize, setPageSize] = useState({ width: 1, height: 1 });
  const [draft, setDraft] = useState<{ x: number; y: number }[]>([]);
  const [tool, setTool] = useState<NotebookTool>("pen");
  const [color, setColor] = useState(inkColor);
  const [palmRejection, setPalmRejection] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const lastInkPoint = useRef({ x: 0.5, y: 0.16 });
  const activePointerAllowed = useRef(false);
  const isLandscape = width > height;
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const screenPageOrientation = isLandscape ? "landscape" : "portrait";
  const currentPageOrientation = notebook?.pageOrientations?.[String(currentPage)] ?? screenPageOrientation;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      staysActiveInBackground: false
    }).catch(() => {});
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const pageCount = Math.max(1, notebook?.pageCount || 1);
  const currentPageStrokes = useMemo(() => notebook?.strokes.filter((stroke) => (stroke.page || 1) === currentPage) ?? [], [currentPage, notebook?.strokes]);
  const currentPageVoiceNotes = useMemo(() => notebook?.voiceNotes.filter((voiceNote) => (voiceNote.page || 1) === currentPage) ?? [], [currentPage, notebook?.voiceNotes]);
  const toolbarButtonSize = device.isTablet ? 36 : 40;
  const pageButtonSize = device.isTablet ? 34 : 36;
  const availablePageHeight = Math.max(320, height - (isLandscape ? 230 : device.isTablet ? 330 : 420));
  const availablePageWidth = Math.max(320, width - 24);
  const pageAspect = currentPageOrientation === "landscape" ? 1.414 : 1 / 1.414;
  const maxPageWidth = Math.min(availablePageWidth, device.isTablet ? (currentPageOrientation === "landscape" ? 1280 : 860) : availablePageWidth);
  const pageWidth = Math.min(maxPageWidth, availablePageHeight * pageAspect);
  const pageHeight = pageWidth / pageAspect;
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(tool === "select")
        .onUpdate((event) => {
          translateX.value = savedTranslateX.value + event.translationX;
          translateY.value = savedTranslateY.value + event.translationY;
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [savedTranslateX, savedTranslateY, tool, translateX, translateY]
  );
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          scale.value = Math.max(1, Math.min(5, savedScale.value * event.scale));
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
  const pageTransformStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }]
  }));

  useEffect(() => {
    if (!notebook) return;
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, notebook.pageCount || 1)));
  }, [notebook]);

  useEffect(() => {
    if (!notebook) return;
    void setPageOrientation(notebook.id, currentPage, screenPageOrientation);
  }, [currentPage, notebook?.id, screenPageOrientation, setPageOrientation]);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [currentPage, height, savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY, width]);

  function normalize(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(1, x / Math.max(pageSize.width, 1))),
      y: Math.max(0, Math.min(1, y / Math.max(pageSize.height, 1)))
    };
  }

  function updatePalmRejection(nativeEvent: Record<string, unknown>) {
    if (!palmRejection || tool === "select") {
      activePointerAllowed.current = true;
      return;
    }
    const pointerType = typeof nativeEvent.pointerType === "string" ? nativeEvent.pointerType : "unknown";
    activePointerAllowed.current = pointerType === "pen" || pointerType === "stylus";
  }

  function acceptsTouchEvent(event: { nativeEvent: { touches?: unknown[] } }) {
    if (!palmRejection || tool === "select") return true;
    const touches = event.nativeEvent.touches ?? [];
    return activePointerAllowed.current && touches.length <= 1;
  }

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: (event) => Boolean(notebook && tool !== "select" && acceptsTouchEvent(event)),
    onMoveShouldSetPanResponder: (event) => Boolean(notebook && tool !== "select" && acceptsTouchEvent(event)),
    onPanResponderGrant: (event) => {
      if (!acceptsTouchEvent(event)) {
        setDraft([]);
        return;
      }
      const point = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
      lastInkPoint.current = point;
      if (tool === "eraser" && notebook) {
        const stroke = findNearestStroke(currentPageStrokes, point);
        if (stroke) void deleteStroke(notebook.id, stroke.id);
        return;
      }
      setDraft([point]);
    },
    onPanResponderMove: (event) => {
      if (!acceptsTouchEvent(event)) {
        setDraft([]);
        return;
      }
      const point = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
      lastInkPoint.current = point;
      if (tool === "eraser" && notebook) {
        const stroke = findNearestStroke(currentPageStrokes, point);
        if (stroke) void deleteStroke(notebook.id, stroke.id);
        return;
      }
      setDraft((current) => [...current, point]);
    },
    onPanResponderRelease: async () => {
      if (!notebook || tool === "eraser" || draft.length < 2) {
        setDraft([]);
        return;
      }
      const stroke: NoteStroke = {
        id: createId("stroke"),
        page: currentPage,
        tool: tool === "highlight" ? "highlight" : "pen",
        points: draft,
        color,
        strokeWidth: tool === "highlight" ? (device.isTablet ? 18 : 15) : device.isTablet ? 3 : 2.6,
        opacity: tool === "highlight" ? 0.28 : 1,
        createdAt: Date.now()
      };
      setDraft([]);
      await addStroke(notebook.id, stroke);
    },
    onPanResponderTerminate: () => setDraft([])
  });

  async function startRecording() {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Microphone permission", "Microphone permission is needed to record audio notes.");
      return;
    }
    await soundRef.current?.unloadAsync().catch(() => {});
    soundRef.current = null;
    const created = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(created.recording);
  }

  async function stopRecording() {
    if (!recording || !notebook) return;
    await recording.stopAndUnloadAsync();
    const status = await recording.getStatusAsync();
    const uri = recording.getURI();
    setRecording(null);
    if (!uri) return;
    const id = createId("voice");
    const savedUri = await copyRecordingToNotebook(uri, id);
    const anchor = lastInkPoint.current;
    const voiceNote: VoiceNote = {
      id,
      page: currentPage,
      uri: savedUri,
      x: Math.max(0.06, Math.min(0.94, anchor.x)),
      y: Math.max(0.06, Math.min(0.94, anchor.y)),
      durationMillis: "durationMillis" in status ? status.durationMillis : undefined,
      createdAt: Date.now()
    };
    await addVoiceNote(notebook.id, voiceNote);
  }

  async function handleAddPage() {
    if (!notebook) return;
    const nextPage = await addPage(notebook.id);
    setCurrentPage(nextPage);
  }

  async function handleExportPdf() {
    if (!notebook || exporting) return;
    try {
      setExporting(true);
      const uri = await exportNotebookPdf(notebook);
      Alert.alert("PDF ready", "Notebook PDF export is ready.", [{ text: "OK" }]);
      console.info(`Notebook PDF exported: ${uri}`);
    } catch (error) {
      Alert.alert("Export failed", error instanceof Error ? error.message : "Could not export this notebook.");
    } finally {
      setExporting(false);
    }
  }

  async function playVoice(note: VoiceNote) {
    if (playingId === note.id) {
      await soundRef.current?.pauseAsync();
      setPlayingId(null);
      return;
    }
    await soundRef.current?.unloadAsync().catch(() => {});
    const { sound } = await Audio.Sound.createAsync({ uri: note.uri });
    soundRef.current = sound;
    setPlayingId(note.id);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) setPlayingId(null);
    });
    await sound.playAsync();
  }

  if (!notebook) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.app }]}>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No notebook selected.</Text>
          <IconButton onPress={() => router.replace("/")}>
            <ChevronLeft color={theme.text} size={20} />
          </IconButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.app }]}>
      <View style={[styles.header, { backgroundColor: theme.toolbar, borderColor: theme.border }]}>
        <IconButton onPress={() => router.replace("/")}>
          <ChevronLeft color={theme.text} size={20} />
        </IconButton>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {notebook.title}
          </Text>
          <Text style={[styles.meta, { color: theme.textMuted }]}>{labelForTemplate(notebook.template)}</Text>
        </View>
        {!device.isTablet ? (
          <>
            <IconButton onPress={handleExportPdf} disabled={exporting}>
              <FileDown color={theme.text} size={20} />
            </IconButton>
            <IconButton onPress={recording ? stopRecording : startRecording} active={Boolean(recording)}>
              {recording ? <StopCircle color="#FFFFFF" size={21} /> : <Mic color={theme.text} size={20} />}
            </IconButton>
          </>
        ) : null}
      </View>
      <View style={[styles.dock, device.isTablet ? styles.dockTablet : null, isLandscape ? styles.dockLandscape : null, { backgroundColor: theme.toolbar, borderColor: theme.border }]}>
        <View style={styles.pageRow}>
          <IconButton onPress={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage <= 1} size={pageButtonSize}>
            <ChevronLeft color={theme.text} size={18} />
          </IconButton>
          <Text style={[styles.pageText, { color: theme.text }]}>{currentPage} / {pageCount}</Text>
          <IconButton onPress={() => setCurrentPage((page) => Math.min(pageCount, page + 1))} disabled={currentPage >= pageCount} size={pageButtonSize}>
            <ChevronRight color={theme.text} size={18} />
          </IconButton>
          <IconButton onPress={handleAddPage} size={pageButtonSize}>
            <FilePlus2 color={theme.text} size={18} />
          </IconButton>
          <IconButton onPress={handleExportPdf} disabled={exporting} size={pageButtonSize}>
            <FileDown color={theme.text} size={18} />
          </IconButton>
        </View>
        <View style={styles.toolRow}>
          <IconButton active={palmRejection} onPress={() => setPalmRejection((value) => !value)} size={toolbarButtonSize}>
            <Hand color={palmRejection ? "#FFFFFF" : theme.text} size={19} />
          </IconButton>
          <IconButton active={tool === "select"} onPress={() => setTool("select")} size={toolbarButtonSize}>
            <MousePointer2 color={tool === "select" ? "#FFFFFF" : theme.text} size={19} />
          </IconButton>
          <IconButton active={tool === "pen"} onPress={() => setTool("pen")} size={toolbarButtonSize}>
            <PenLine color={tool === "pen" ? "#FFFFFF" : theme.text} size={19} />
          </IconButton>
          <IconButton active={tool === "highlight"} onPress={() => setTool("highlight")} size={toolbarButtonSize}>
            <Highlighter color={tool === "highlight" ? "#FFFFFF" : theme.text} size={19} />
          </IconButton>
          <IconButton active={tool === "eraser"} onPress={() => setTool("eraser")} size={toolbarButtonSize}>
            <Eraser color={tool === "eraser" ? "#FFFFFF" : theme.text} size={19} />
          </IconButton>
          <IconButton onPress={() => undoStroke(notebook.id, currentPage)} disabled={currentPageStrokes.length === 0} size={toolbarButtonSize}>
            <Undo2 color={theme.text} size={19} />
          </IconButton>
          <IconButton onPress={() => redoStroke(notebook.id, currentPage)} disabled={!canRedo} size={toolbarButtonSize}>
            <Redo2 color={theme.text} size={19} />
          </IconButton>
        </View>
        <View style={styles.colorRow}>
          {noteColors.map((item) => (
            <Pressable key={item} onPress={() => setColor(item)} style={[styles.swatch, device.isTablet ? styles.swatchTablet : null, { backgroundColor: item, borderColor: color === item ? theme.accent : theme.border, transform: [{ scale: color === item ? 1.1 : 1 }] }]} />
          ))}
        </View>
        <View style={styles.audioRow}>
          <IconButton onPress={recording ? stopRecording : startRecording} active={Boolean(recording)} size={toolbarButtonSize}>
            {recording ? <StopCircle color="#FFFFFF" size={20} /> : <Mic color={theme.text} size={19} />}
          </IconButton>
          <Text style={[styles.dockText, { color: theme.textMuted }]} numberOfLines={1}>
            {recording ? "Recording while writing" : "Audio notes"}
          </Text>
          {recording ? <View style={styles.recordingDot} /> : null}
          {currentPageVoiceNotes.slice(-3).map((note) => (
            <IconButton key={note.id} onPress={() => playVoice(note)} size={40}>
              {playingId === note.id ? <Pause color={theme.text} size={18} /> : <Play color={theme.text} size={18} />}
            </IconButton>
          ))}
        </View>
      </View>
      <View style={styles.workspace}>
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
          <Animated.View
            onPointerDown={(event) => updatePalmRejection(event.nativeEvent as unknown as Record<string, unknown>)}
            onPointerMove={(event) => updatePalmRejection(event.nativeEvent as unknown as Record<string, unknown>)}
            onPointerUp={() => {
              activePointerAllowed.current = !palmRejection;
            }}
            onPointerCancel={() => {
              activePointerAllowed.current = !palmRejection;
              setDraft([]);
            }}
            onLayout={(event) => {
              const { width: nextWidth, height: nextHeight } = event.nativeEvent.layout;
              setPageSize((current) => (current.width === nextWidth && current.height === nextHeight ? current : { width: nextWidth, height: nextHeight }));
            }}
            style={[styles.paper, { width: pageWidth, height: pageHeight }, pageTransformStyle]}
          >
            <Svg {...responder.panHandlers} width="100%" height="100%" style={StyleSheet.absoluteFill}>
              {renderTemplate(notebook.template, pageSize.width, pageSize.height)}
              {currentPageStrokes.map((stroke) => renderStroke(stroke, pageSize.width, pageSize.height))}
              {draft.length > 1 ? renderStroke({ id: "draft", page: currentPage, tool: tool === "highlight" ? "highlight" : "pen", points: draft, color, strokeWidth: tool === "highlight" ? (device.isTablet ? 18 : 15) : device.isTablet ? 3 : 2.6, opacity: tool === "highlight" ? 0.28 : 1, createdAt: Date.now() }, pageSize.width, pageSize.height) : null}
            </Svg>
          </Animated.View>
        </GestureDetector>
      </View>
    </SafeAreaView>
  );
}

function labelForTemplate(template: NotebookTemplate) {
  if (template === "lined") return "Lined page";
  if (template === "grid") return "Grid page";
  return "Blank page";
}

function renderTemplate(template: NotebookTemplate, width: number, height: number) {
  if (template === "blank") return null;
  const items = [];
  if (template === "lined") {
    for (let y = 56; y < height; y += 34) {
      items.push(<Line key={`line-${y}`} x1={28} x2={width - 28} y1={y} y2={y} stroke="#D9DCEA" strokeWidth={1} />);
    }
    return items;
  }
  for (let x = 28; x < width; x += 28) {
    items.push(<Line key={`grid-x-${x}`} x1={x} x2={x} y1={0} y2={height} stroke="#E4E7F0" strokeWidth={1} />);
  }
  for (let y = 28; y < height; y += 28) {
    items.push(<Line key={`grid-y-${y}`} x1={0} x2={width} y1={y} y2={y} stroke="#E4E7F0" strokeWidth={1} />);
  }
  return items;
}

function renderStroke(stroke: NoteStroke, width: number, height: number) {
  return <Polyline key={stroke.id} points={stroke.points.map((point) => `${point.x * width},${point.y * height}`).join(" ")} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.strokeWidth} opacity={stroke.opacity ?? 1} />;
}

function findNearestStroke(strokes: NoteStroke[], point: { x: number; y: number }) {
  let nearest: { stroke: NoteStroke; distance: number } | null = null;
  for (const stroke of strokes) {
    const distance = stroke.points.reduce((min, item) => Math.min(min, Math.hypot(point.x - item.x, point.y - item.y)), Number.POSITIVE_INFINITY);
    if (!nearest || distance < nearest.distance) nearest = { stroke, distance };
  }
  return nearest && nearest.distance < 0.045 ? nearest.stroke : null;
}

const styles = StyleSheet.create({
  audioRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  colorRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  dock: { alignItems: "center", alignSelf: "center", borderRadius: 8, borderWidth: 1, elevation: 20, gap: 8, marginBottom: 8, marginHorizontal: 12, maxWidth: "96%", padding: 8, shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 12, zIndex: 20 },
  dockLandscape: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 6, padding: 6 },
  dockTablet: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center", marginBottom: 10, paddingHorizontal: 10, paddingVertical: 8 },
  dockText: { fontSize: 12, fontWeight: "800" },
  empty: { alignItems: "center", flex: 1, gap: 16, justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "800" },
  header: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, margin: 12, padding: 8 },
  headerText: { flex: 1 },
  meta: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  paper: { backgroundColor: paperColor, borderRadius: 8, elevation: 8, overflow: "hidden", shadowColor: "#000000", shadowOpacity: 0.18, shadowRadius: 18 },
  pageRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  pageText: { fontSize: 13, fontWeight: "900", minWidth: 52, textAlign: "center" },
  recordingDot: { backgroundColor: "#FF3B30", borderRadius: 5, height: 10, width: 10 },
  root: { flex: 1 },
  title: { fontSize: 18, fontWeight: "900" },
  swatch: { borderRadius: 8, borderWidth: 2, height: 28, width: 28 },
  swatchTablet: { height: 24, width: 24 },
  toolRow: { flexDirection: "row", gap: 6 },
  workspace: { alignItems: "center", flex: 1, justifyContent: "center", paddingBottom: 12 }
});
