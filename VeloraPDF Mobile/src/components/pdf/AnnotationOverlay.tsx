import { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, View } from "react-native";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";
import { createId } from "@/lib/utils/ids";
import { useAnnotationStore } from "@/stores/useAnnotationStore";
import { usePdfStore } from "@/stores/usePdfStore";
import type { Annotation } from "@/types";

const EMPTY_ANNOTATIONS: Annotation[] = [];
const HIGHLIGHT_OPACITY = 0.18;

type Draft =
  | { type: "highlight"; x: number; y: number; width: number; height: number }
  | { type: "pen"; points: { x: number; y: number }[] }
  | null;

type PalmNativeEvent = {
  pointerType?: string;
  touches?: unknown[];
  width?: number;
  height?: number;
};

export function AnnotationOverlay() {
  const file = usePdfStore((state) => state.currentFile);
  const page = usePdfStore((state) => state.currentPage);
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const color = useAnnotationStore((state) => state.color);
  const palmRejection = useAnnotationStore((state) => state.palmRejection);
  const annotationsByFile = useAnnotationStore((state) => state.annotationsByFile);
  const annotations = file ? annotationsByFile[file.id] ?? EMPTY_ANNOTATIONS : EMPTY_ANNOTATIONS;
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const deleteAnnotation = useAnnotationStore((state) => state.deleteAnnotation);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [draft, setDraft] = useState<Draft>(null);
  const start = useRef({ x: 0, y: 0 });
  const activePointerAllowed = useRef(false);

  const pageAnnotations = useMemo(() => annotations.filter((item) => item.page === page), [annotations, page]);
  const drawing = activeTool !== "select";

  function normalize(x: number, y: number) {
    return {
      x: Math.max(0, Math.min(1, x / Math.max(size.width, 1))),
      y: Math.max(0, Math.min(1, y / Math.max(size.height, 1)))
    };
  }

  function updatePalmRejection(nativeEvent: PalmNativeEvent) {
    if (!palmRejection || activeTool === "select") {
      activePointerAllowed.current = true;
      return;
    }
    const pointerType = nativeEvent.pointerType ?? "unknown";
    activePointerAllowed.current = pointerType === "pen" || pointerType === "stylus";
  }

  function acceptsTouchEvent(nativeEvent: PalmNativeEvent) {
    if (!palmRejection || activeTool === "select") return true;
    return activePointerAllowed.current && (nativeEvent.touches?.length ?? 0) <= 1;
  }

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: (event) => drawing && acceptsTouchEvent(event.nativeEvent as PalmNativeEvent),
        onMoveShouldSetPanResponder: (event) => drawing && acceptsTouchEvent(event.nativeEvent as PalmNativeEvent),
        onPanResponderGrant: (event) => {
          if (!acceptsTouchEvent(event.nativeEvent as PalmNativeEvent)) {
            setDraft(null);
            return;
          }
          const point = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
          start.current = point;
          if (activeTool === "eraser") {
            const annotation = findNearestAnnotation(pageAnnotations, point);
            if (file && annotation) void deleteAnnotation(file.id, annotation.id);
            return;
          }
          if (activeTool === "pen") setDraft({ type: "pen", points: [point] });
          else setDraft({ type: "highlight", x: point.x, y: point.y, width: 0, height: 0 });
        },
        onPanResponderMove: (event) => {
          if (!acceptsTouchEvent(event.nativeEvent as PalmNativeEvent)) {
            setDraft(null);
            return;
          }
          const point = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
          if (activeTool === "eraser") {
            const annotation = findNearestAnnotation(pageAnnotations, point);
            if (file && annotation) void deleteAnnotation(file.id, annotation.id);
            return;
          }
          if (activeTool === "pen") {
            setDraft((current) => (current?.type === "pen" ? { type: "pen", points: [...current.points, point] } : current));
            return;
          }
          const x = Math.min(start.current.x, point.x);
          const y = Math.min(start.current.y, point.y);
          setDraft({ type: "highlight", x, y, width: Math.abs(point.x - start.current.x), height: Math.abs(point.y - start.current.y) });
        },
        onPanResponderRelease: async () => {
          if (!file || !draft) return;
          if (draft.type === "pen" && draft.points.length > 1) {
            const annotation: Annotation = {
              id: createId("pen"),
              page,
              type: "pen",
              points: draft.points,
              color,
              strokeWidth: 3,
              createdAt: Date.now()
            };
            await addAnnotation(file.id, annotation);
          }
          if (draft.type === "highlight" && draft.width > 0.01 && draft.height > 0.01) {
            const type = activeTool === "circle" ? "circle" : activeTool === "rectangle" || activeTool === "arrow" ? activeTool : "highlight";
            const annotation: Annotation =
              type === "highlight"
                ? { id: createId("highlight"), page, type, x: draft.x, y: draft.y, width: draft.width, height: draft.height, color, opacity: HIGHLIGHT_OPACITY, createdAt: Date.now() }
                : { id: createId(type), page, type, x: draft.x, y: draft.y, width: draft.width, height: draft.height, color, strokeWidth: 2, createdAt: Date.now() };
            await addAnnotation(file.id, annotation);
          }
          setDraft(null);
        },
        onPanResponderTerminate: () => setDraft(null)
      }),
    [activeTool, addAnnotation, color, deleteAnnotation, drawing, draft, file, page, pageAnnotations, palmRejection, size.height, size.width]
  );

  return (
    <View
      pointerEvents={drawing ? "auto" : "none"}
      {...responder.panHandlers}
      style={StyleSheet.absoluteFill}
      onPointerDown={(event) => updatePalmRejection(event.nativeEvent as PalmNativeEvent)}
      onPointerMove={(event) => updatePalmRejection(event.nativeEvent as PalmNativeEvent)}
      onPointerUp={() => {
        activePointerAllowed.current = !palmRejection;
      }}
      onPointerCancel={() => {
        activePointerAllowed.current = !palmRejection;
        setDraft(null);
      }}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
      }}
    >
      <Svg width="100%" height="100%" style={styles.highlightLayer}>
        {pageAnnotations.filter((annotation) => annotation.type === "highlight").map((annotation) => renderAnnotation(annotation, size))}
        {draft && activeTool === "highlight" ? renderDraft(draft, size, color) : null}
      </Svg>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        {pageAnnotations.filter((annotation) => annotation.type !== "highlight").map((annotation) => renderAnnotation(annotation, size))}
        {draft && activeTool !== "highlight" ? renderDraft(draft, size, color) : null}
      </Svg>
    </View>
  );
}

function findNearestAnnotation(annotations: Annotation[], point: { x: number; y: number }) {
  let nearest: { annotation: Annotation; distance: number } | null = null;
  for (const annotation of annotations) {
    const distance = distanceToAnnotation(annotation, point);
    if (!nearest || distance < nearest.distance) nearest = { annotation, distance };
  }
  return nearest && nearest.distance < 0.055 ? nearest.annotation : null;
}

function distanceToAnnotation(annotation: Annotation, point: { x: number; y: number }) {
  if (annotation.type === "pen") {
    return annotation.points.reduce((min, item) => Math.min(min, distance(point, item)), Number.POSITIVE_INFINITY);
  }
  if (annotation.type === "text" || annotation.type === "sticky") {
    return distance(point, { x: annotation.x, y: annotation.y });
  }
  const center = { x: annotation.x + annotation.width / 2, y: annotation.y + annotation.height / 2 };
  const halfWidth = annotation.width / 2;
  const halfHeight = annotation.height / 2;
  const dx = Math.max(Math.abs(point.x - center.x) - halfWidth, 0);
  const dy = Math.max(Math.abs(point.y - center.y) - halfHeight, 0);
  return Math.hypot(dx, dy);
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function renderAnnotation(annotation: Annotation, frame: { width: number; height: number }) {
  const { width, height } = frame;
  if (annotation.type === "pen") {
    const points = annotation.points.map((point) => `${point.x * width},${point.y * height}`).join(" ");
    return <Polyline key={annotation.id} points={points} fill="none" stroke={annotation.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={annotation.strokeWidth} />;
  }
  if (annotation.type === "circle") {
    return <Circle key={annotation.id} cx={(annotation.x + annotation.width / 2) * width} cy={(annotation.y + annotation.height / 2) * height} r={(Math.min(annotation.width, annotation.height) * Math.min(width, height)) / 2} fill="transparent" stroke={annotation.color} strokeWidth={annotation.strokeWidth} />;
  }
  if (annotation.type === "text" || annotation.type === "sticky") {
    return <Circle key={annotation.id} cx={annotation.x * width} cy={annotation.y * height} r={8} fill={annotation.color} opacity={0.8} />;
  }
  const opacity = annotation.type === "highlight" ? Math.min(annotation.opacity, HIGHLIGHT_OPACITY) : 0;
  return (
    <Rect
      key={annotation.id}
      x={annotation.x * width}
      y={annotation.y * height}
      width={annotation.width * width}
      height={annotation.height * height}
      fill={annotation.type === "highlight" ? annotation.color : "transparent"}
      fillOpacity={opacity}
      stroke={annotation.type === "highlight" ? "transparent" : annotation.color}
      strokeWidth={"strokeWidth" in annotation ? annotation.strokeWidth : 0}
      rx={annotation.type === "highlight" ? 4 : 0}
    />
  );
}

function renderDraft(draft: Draft, frame: { width: number; height: number }, color: string) {
  if (!draft) return null;
  const { width, height } = frame;
  if (draft.type === "pen") {
    return <Polyline points={draft.points.map((point) => `${point.x * width},${point.y * height}`).join(" ")} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} opacity={0.85} />;
  }
  return <Rect x={draft.x * width} y={draft.y * height} width={draft.width * width} height={draft.height * height} fill={color} fillOpacity={HIGHLIGHT_OPACITY} rx={4} />;
}

const styles = StyleSheet.create({
  highlightLayer: {
    ...StyleSheet.absoluteFillObject,
    mixBlendMode: "multiply"
  }
});
