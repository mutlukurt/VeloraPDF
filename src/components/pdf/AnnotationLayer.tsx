import { MessageSquare } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AnnotationToolbar } from "../annotations/AnnotationToolbar";
import { createAnnotationId, type Annotation, type Point, useAnnotationStore } from "../../stores/useAnnotationStore";
import { useUiStore } from "../../stores/useUiStore";

type AnnotationLayerProps = {
  page: number;
  width: number;
  height: number;
};

type Draft =
  | { type: "highlight" | "rectangle" | "circle" | "arrow"; start: Point; current: Point }
  | { type: "pen"; points: Point[] };

function pointFromEvent(event: React.PointerEvent<HTMLDivElement>, element: HTMLDivElement): Point {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

export function AnnotationLayer({ page, width, height }: AnnotationLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const activeTool = useUiStore((state) => state.activeTool);
  const annotations = useAnnotationStore((state) => state.annotations);
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const setSelectedId = useAnnotationStore((state) => state.setSelectedId);
  const pageAnnotations = useMemo(() => annotations.filter((item) => item.page === page), [annotations, page]);

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const point = pointFromEvent(event, ref.current);
    if (activeTool === "select") {
      setSelectedId(null);
      return;
    }
    if (activeTool === "highlight" || activeTool === "rectangle" || activeTool === "circle" || activeTool === "arrow") {
      setDraft({ type: activeTool, start: point, current: point });
      ref.current.setPointerCapture(event.pointerId);
    }
    if (activeTool === "pen") {
      setDraft({ type: "pen", points: [point] });
      ref.current.setPointerCapture(event.pointerId);
    }
    if (activeTool === "text") {
      const text = window.prompt("Text note");
      if (text) addAnnotation({ id: createAnnotationId(), page, type: "text", x: point.x, y: point.y, text, color: "#6657FF", fontSize: 16, createdAt: Date.now() });
    }
    if (activeTool === "sticky") {
      const text = window.prompt("Sticky note");
      addAnnotation({ id: createAnnotationId(), page, type: "sticky", x: point.x, y: point.y, text: text || "Note", color: "#FFE66D", createdAt: Date.now() });
    }
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft || !ref.current) return;
    const point = pointFromEvent(event, ref.current);
    if (draft.type === "pen") setDraft({ type: "pen", points: [...draft.points, point] });
    else setDraft({ ...draft, current: point });
  };

  const finish = () => {
    if (!draft) return;
    if (draft.type === "pen" && draft.points.length > 2) {
      addAnnotation({ id: createAnnotationId(), page, type: "pen", points: draft.points, color: "#6657FF", strokeWidth: 3, createdAt: Date.now() });
    }
    if (draft.type !== "pen") {
      const x = Math.min(draft.start.x, draft.current.x);
      const y = Math.min(draft.start.y, draft.current.y);
      const annotationWidth = Math.abs(draft.current.x - draft.start.x);
      const annotationHeight = Math.abs(draft.current.y - draft.start.y);
      if (annotationWidth > 8 && annotationHeight > 8) {
        const base = { id: createAnnotationId(), page, x, y, width: annotationWidth, height: annotationHeight, color: draft.type === "highlight" ? "#FFE66D" : "#6657FF", createdAt: Date.now() };
        const annotation: Annotation =
          draft.type === "highlight"
            ? { ...base, type: "highlight", opacity: 0.45 }
            : { ...base, type: draft.type, strokeWidth: 2.5 };
        addAnnotation(annotation);
      }
    }
    setDraft(null);
  };

  return (
    <div
      ref={ref}
      className="absolute inset-0 touch-none"
      style={{ width, height, cursor: activeTool === "select" ? "default" : "crosshair" }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        {pageAnnotations.map((annotation) => {
          if (annotation.type === "highlight") {
            return <rect key={annotation.id} x={annotation.x} y={annotation.y} width={annotation.width} height={annotation.height} fill={annotation.color} opacity={annotation.opacity} onPointerDown={(e) => { e.stopPropagation(); setSelectedId(annotation.id); }} />;
          }
          if (annotation.type === "pen") {
            const d = annotation.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
            return <path key={annotation.id} d={d} fill="none" stroke={annotation.color} strokeWidth={annotation.strokeWidth} strokeLinecap="round" strokeLinejoin="round" onPointerDown={(e) => { e.stopPropagation(); setSelectedId(annotation.id); }} />;
          }
          if (annotation.type === "rectangle") {
            return <rect key={annotation.id} x={annotation.x} y={annotation.y} width={annotation.width} height={annotation.height} fill="none" stroke={annotation.color} strokeWidth={annotation.strokeWidth} onPointerDown={(e) => { e.stopPropagation(); setSelectedId(annotation.id); }} />;
          }
          if (annotation.type === "circle") {
            return <ellipse key={annotation.id} cx={annotation.x + annotation.width / 2} cy={annotation.y + annotation.height / 2} rx={Math.abs(annotation.width / 2)} ry={Math.abs(annotation.height / 2)} fill="none" stroke={annotation.color} strokeWidth={annotation.strokeWidth} onPointerDown={(e) => { e.stopPropagation(); setSelectedId(annotation.id); }} />;
          }
          if (annotation.type === "arrow") {
            return <line key={annotation.id} x1={annotation.x} y1={annotation.y} x2={annotation.x + annotation.width} y2={annotation.y + annotation.height} stroke={annotation.color} strokeWidth={annotation.strokeWidth} markerEnd="url(#arrow)" onPointerDown={(e) => { e.stopPropagation(); setSelectedId(annotation.id); }} />;
          }
          return null;
        })}
        {draft?.type !== "pen" && draft ? (
          <rect x={Math.min(draft.start.x, draft.current.x)} y={Math.min(draft.start.y, draft.current.y)} width={Math.abs(draft.current.x - draft.start.x)} height={Math.abs(draft.current.y - draft.start.y)} fill={draft.type === "highlight" ? "#FFE66D" : "none"} stroke="#6657FF" opacity={0.45} strokeDasharray="6 6" />
        ) : null}
        {draft?.type === "pen" ? <path d={draft.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")} fill="none" stroke="#6657FF" strokeWidth={3} strokeLinecap="round" /> : null}
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
            <path d="M0,0 L0,6 L9,3 z" fill="#6657FF" />
          </marker>
        </defs>
      </svg>
      {pageAnnotations.map((annotation) => {
        if (annotation.type === "text") return <button key={annotation.id} className="absolute font-semibold" style={{ left: annotation.x, top: annotation.y, color: annotation.color, fontSize: annotation.fontSize }} onClick={() => setSelectedId(annotation.id)}>{annotation.text}</button>;
        if (annotation.type === "sticky") return <button key={annotation.id} title={annotation.text} className="absolute grid h-8 w-8 place-items-center rounded-xl text-zinc-950 shadow-lg" style={{ left: annotation.x, top: annotation.y, background: annotation.color }} onClick={() => setSelectedId(annotation.id)}><MessageSquare size={16} /></button>;
        return null;
      })}
      {selectedId ? <AnnotationToolbar /> : null}
    </div>
  );
}
