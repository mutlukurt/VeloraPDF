import { MessageSquare, Pin, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnnotationToolbar } from "../annotations/AnnotationToolbar";
import { createAnnotationId, type Annotation, type Point, useAnnotationStore } from "../../stores/useAnnotationStore";
import { useUiStore } from "../../stores/useUiStore";
import { usePdfStore } from "../../stores/usePdfStore";
import { Button } from "../ui/Button";

type AnnotationLayerProps = {
  page: number;
  width: number;
  height: number;
};

type Draft =
  | { type: "highlight" | "rectangle" | "circle" | "arrow" | "underline" | "strike" | "crop"; start: Point; current: Point }
  | { type: "pen"; points: Point[] };

const STICKY_CARD_WIDTH = 190;
const STICKY_CARD_HEIGHT = 154;

function pointFromEvent(event: React.PointerEvent<HTMLDivElement>, element: HTMLDivElement): Point {
  const rect = element.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function AnnotationLayer({ page, width, height }: AnnotationLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const stickyInputRef = useRef<HTMLTextAreaElement>(null);
  const stickyDragRef = useRef<{
    id: string;
    pointerId: number;
    startClient: Point;
    start: Point;
    moved: boolean;
    element: HTMLButtonElement;
  } | null>(null);
  const stickySuppressEditRef = useRef(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [stickyDraft, setStickyDraft] = useState<{
    id?: string;
    point: Point;
    text: string;
    color: string;
    type: "sticky" | "text";
  } | null>(null);
  const activeTool = useUiStore((state) => state.activeTool);
  const annotations = useAnnotationStore((state) => state.annotations);
  const addAnnotation = useAnnotationStore((state) => state.addAnnotation);
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation);
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const setSelectedId = useAnnotationStore((state) => state.setSelectedId);
  const pageAnnotations = useMemo(() => annotations.filter((item) => item.page === page), [annotations, page]);
  const pageMetrics = { pageWidth: width, pageHeight: height };

  // Signature States
  const [isSignatureOpen, setIsSignatureOpen] = useState(false);
  const [sigPos, setSigPos] = useState<Point | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  useEffect(() => {
    if (!stickyDraft) return;
    stickyInputRef.current?.focus();
  }, [stickyDraft]);

  const saveStickyDraft = () => {
    if (!stickyDraft) return;
    if (stickyDraft.id) {
      updateAnnotation(stickyDraft.id, { text: stickyDraft.text.trim() || "Note" });
      setStickyDraft(null);
      return;
    }
    addAnnotation({
      id: createAnnotationId(),
      page,
      ...pageMetrics,
      type: "sticky",
      x: stickyDraft.point.x,
      y: stickyDraft.point.y,
      text: stickyDraft.text.trim() || "Note",
      color: stickyDraft.color,
      createdAt: Date.now(),
    });
    setStickyDraft(null);
  };

  const openTextEditor = (annotation: Extract<Annotation, { type: "sticky" | "text" }>) => {
    setSelectedId(annotation.id);
    setStickyDraft({
      id: annotation.id,
      point: { x: annotation.x, y: annotation.y },
      text: annotation.text,
      color: annotation.color,
      type: annotation.type,
    });
  };

  const moveSticky = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = stickyDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const nextX = clamp(drag.start.x + event.clientX - drag.startClient.x, 0, Math.max(0, width - STICKY_CARD_WIDTH));
    const nextY = clamp(drag.start.y + event.clientY - drag.startClient.y, 0, Math.max(0, height - STICKY_CARD_HEIGHT));
    const moved = Math.abs(nextX - drag.start.x) > 1 || Math.abs(nextY - drag.start.y) > 1;
    stickyDragRef.current = { ...drag, moved: drag.moved || moved };
    drag.element.style.left = `${nextX}px`;
    drag.element.style.top = `${nextY}px`;
    drag.element.style.transform = "rotate(0deg)";
  };

  const finishSticky = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = stickyDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const nextX = clamp(drag.start.x + event.clientX - drag.startClient.x, 0, Math.max(0, width - STICKY_CARD_WIDTH));
    const nextY = clamp(drag.start.y + event.clientY - drag.startClient.y, 0, Math.max(0, height - STICKY_CARD_HEIGHT));
    const moved = drag.moved || Math.abs(nextX - drag.start.x) > 1 || Math.abs(nextY - drag.start.y) > 1;
    stickySuppressEditRef.current = moved;
    if (moved) {
      updateAnnotation(drag.id, { x: nextX, y: nextY });
    }
    stickyDragRef.current = null;
    event.currentTarget.style.transition = "";
    event.currentTarget.style.transform = "rotate(-2deg)";
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const begin = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const point = pointFromEvent(event, ref.current);
    if (activeTool === "select") {
      setSelectedId(null);
      return;
    }
    if (
      activeTool === "highlight" ||
      activeTool === "rectangle" ||
      activeTool === "circle" ||
      activeTool === "arrow" ||
      activeTool === "underline" ||
      activeTool === "strike" ||
      activeTool === "crop"
    ) {
      setDraft({ type: activeTool, start: point, current: point });
      ref.current.setPointerCapture(event.pointerId);
    }
    if (activeTool === "pen") {
      setDraft({ type: "pen", points: [point] });
      ref.current.setPointerCapture(event.pointerId);
    }
    if (activeTool === "text") {
      const text = window.prompt("Text note");
      if (text) {
        addAnnotation({
          id: createAnnotationId(),
          page,
          ...pageMetrics,
          type: "text",
          x: point.x,
          y: point.y,
          text,
          color: "#6657FF",
          fontSize: 16,
          createdAt: Date.now(),
        });
      }
      useUiStore.getState().setActiveTool("select");
    }
    if (activeTool === "sticky") {
      setSelectedId(null);
      setStickyDraft({ point, text: "", color: "#FFE66D", type: "sticky" });
      return;
    }
    if (activeTool === "signature") {
      setSigPos(point);
      setIsSignatureOpen(true);
    }
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft || !ref.current) return;
    const point = pointFromEvent(event, ref.current);
    if (draft.type === "pen") {
      setDraft({ type: "pen", points: [...draft.points, point] });
    } else {
      setDraft({ ...draft, current: point });
    }
  };

  const finish = () => {
    if (!draft) return;
    if (draft.type === "pen" && draft.points.length > 2) {
      addAnnotation({
        id: createAnnotationId(),
        page,
        ...pageMetrics,
        type: "pen",
        points: draft.points,
        color: "#6657FF",
        strokeWidth: 3,
        createdAt: Date.now(),
      });
    }
    if (draft.type !== "pen") {
      const x = Math.min(draft.start.x, draft.current.x);
      const y = Math.min(draft.start.y, draft.current.y);
      const annotationWidth = Math.abs(draft.current.x - draft.start.x);
      const annotationHeight = Math.abs(draft.current.y - draft.start.y);

      if (draft.type === "crop") {
        if (annotationWidth > 15 && annotationHeight > 15) {
          usePdfStore.getState().setPageCrop(page, {
            x: x / width,
            y: y / height,
            width: annotationWidth / width,
            height: annotationHeight / height,
          });
        }
        useUiStore.getState().setActiveTool("select");
      } else if (annotationWidth > 5 || annotationHeight > 5) {
        const base = {
          id: createAnnotationId(),
          page,
          ...pageMetrics,
          x,
          y,
          width: annotationWidth,
          height: annotationHeight,
          color: draft.type === "highlight" ? "#FFE66D" : "#EF4444",
          createdAt: Date.now(),
        };

        let annotation: Annotation;
        if (draft.type === "highlight") {
          annotation = { ...base, type: "highlight", opacity: 0.45 };
        } else if (draft.type === "underline" || draft.type === "strike") {
          annotation = { ...base, type: draft.type, strokeWidth: 2 };
        } else {
          annotation = { ...base, type: draft.type as "rectangle" | "circle" | "arrow", strokeWidth: 2.5 };
        }
        addAnnotation(annotation);
        useUiStore.getState().setActiveTool("select");
      }
    }
    setDraft(null);
  };

  // Signature canvas handlers
  const sigStart = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#18181b"; // deep ink dark gray
    setIsDrawingSig(true);
  };

  const sigMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const sigEnd = () => {
    setIsDrawingSig(false);
  };

  const clearSig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySig = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas || !sigPos) return;
    const dataUrl = canvas.toDataURL("image/png");
    addAnnotation({
      id: createAnnotationId(),
      page,
      ...pageMetrics,
      type: "signature",
      x: sigPos.x - 75,
      y: sigPos.y - 37,
      width: 150,
      height: 75,
      dataUrl,
      createdAt: Date.now(),
    });
    setIsSignatureOpen(false);
    setSigPos(null);
    useUiStore.getState().setActiveTool("select");
  };

  return (
    <>
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
              return (
                <rect
                  key={annotation.id}
                  x={annotation.x}
                  y={annotation.y}
                  width={annotation.width}
                  height={annotation.height}
                  fill={annotation.color}
                  opacity={annotation.opacity}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "pen") {
              const d = annotation.points
                .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
                .join(" ");
              return (
                <path
                  key={annotation.id}
                  d={d}
                  fill="none"
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "rectangle") {
              return (
                <rect
                  key={annotation.id}
                  x={annotation.x}
                  y={annotation.y}
                  width={annotation.width}
                  height={annotation.height}
                  fill="none"
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "circle") {
              return (
                <ellipse
                  key={annotation.id}
                  cx={annotation.x + annotation.width / 2}
                  cy={annotation.y + annotation.height / 2}
                  rx={Math.abs(annotation.width / 2)}
                  ry={Math.abs(annotation.height / 2)}
                  fill="none"
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "arrow") {
              return (
                <line
                  key={annotation.id}
                  x1={annotation.x}
                  y1={annotation.y}
                  x2={annotation.x + annotation.width}
                  y2={annotation.y + annotation.height}
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  markerEnd="url(#arrow)"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "underline") {
              return (
                <line
                  key={annotation.id}
                  x1={annotation.x}
                  y1={annotation.y + annotation.height}
                  x2={annotation.x + annotation.width}
                  y2={annotation.y + annotation.height}
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "strike") {
              return (
                <line
                  key={annotation.id}
                  x1={annotation.x}
                  y1={annotation.y + annotation.height / 2}
                  x2={annotation.x + annotation.width}
                  y2={annotation.y + annotation.height / 2}
                  stroke={annotation.color}
                  strokeWidth={annotation.strokeWidth}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            if (annotation.type === "signature") {
              return (
                <image
                  key={annotation.id}
                  href={annotation.dataUrl}
                  x={annotation.x}
                  y={annotation.y}
                  width={annotation.width}
                  height={annotation.height}
                  preserveAspectRatio="none"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(annotation.id);
                  }}
                />
              );
            }
            return null;
          })}

          {/* Render draft elements */}
          {draft && draft.type !== "pen" && draft.type !== "underline" && draft.type !== "strike" && draft.type !== "crop" ? (
            <rect
              x={Math.min(draft.start.x, draft.current.x)}
              y={Math.min(draft.start.y, draft.current.y)}
              width={Math.abs(draft.current.x - draft.start.x)}
              height={Math.abs(draft.current.y - draft.start.y)}
              fill={draft.type === "highlight" ? "#FFE66D" : "none"}
              stroke="#6657FF"
              opacity={0.45}
              strokeDasharray="6 6"
            />
          ) : null}
          {draft?.type === "crop" ? (
            <rect
              x={Math.min(draft.start.x, draft.current.x)}
              y={Math.min(draft.start.y, draft.current.y)}
              width={Math.abs(draft.current.x - draft.start.x)}
              height={Math.abs(draft.current.y - draft.start.y)}
              fill="rgba(102, 87, 255, 0.08)"
              stroke="#6657FF"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          ) : null}
          {draft?.type === "underline" ? (
            <line
              x1={Math.min(draft.start.x, draft.current.x)}
              y1={Math.max(draft.start.y, draft.current.y)}
              x2={Math.max(draft.start.x, draft.current.x)}
              y2={Math.max(draft.start.y, draft.current.y)}
              stroke="#EF4444"
              strokeWidth={2}
            />
          ) : null}
          {draft?.type === "strike" ? (
            <line
              x1={Math.min(draft.start.x, draft.current.x)}
              y1={(draft.start.y + draft.current.y) / 2}
              x2={Math.max(draft.start.x, draft.current.x)}
              y2={(draft.start.y + draft.current.y) / 2}
              stroke="#EF4444"
              strokeWidth={2}
            />
          ) : null}
          {draft?.type === "pen" ? (
            <path
              d={draft.points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ")}
              fill="none"
              stroke="#6657FF"
              strokeWidth={3}
              strokeLinecap="round"
            />
          ) : null}
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#6657FF" />
            </marker>
          </defs>
        </svg>

        {pageAnnotations.map((annotation) => {
          if (annotation.type === "text") {
            return (
              <button
                key={annotation.id}
                className="absolute font-semibold"
                style={{ left: annotation.x, top: annotation.y, color: annotation.color, fontSize: annotation.fontSize }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setSelectedId(annotation.id);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  openTextEditor(annotation);
                }}
              >
                {annotation.text}
              </button>
            );
          }
          if (annotation.type === "sticky") {
            return (
              <button
                key={annotation.id}
                title={annotation.text}
                className={`absolute w-[190px] cursor-grab touch-none rounded-[8px] border border-white/80 bg-white p-4 pt-7 text-left text-zinc-950 shadow-[0_18px_38px_rgba(15,15,20,.20)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_52px_rgba(15,15,20,.25)] active:cursor-grabbing ${
                  selectedId === annotation.id ? "ring-2 ring-accent ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" : ""
                }`}
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  transform: "rotate(-2deg)",
                }}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSelectedId(annotation.id);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  e.currentTarget.style.transition = "none";
                  e.currentTarget.style.transform = "rotate(0deg)";
                  stickyDragRef.current = {
                    id: annotation.id,
                    pointerId: e.pointerId,
                    startClient: { x: e.clientX, y: e.clientY },
                    start: { x: annotation.x, y: annotation.y },
                    moved: false,
                    element: e.currentTarget,
                  };
                }}
                onPointerMove={moveSticky}
                onPointerUp={finishSticky}
                onPointerCancel={finishSticky}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (stickySuppressEditRef.current) {
                    stickySuppressEditRef.current = false;
                    return;
                  }
                  openTextEditor(annotation);
                }}
              >
                <span
                  className="absolute left-1/2 top-0 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 shadow-[0_10px_22px_rgba(15,15,20,.24)]"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, white 0%, color-mix(in srgb, ${annotation.color} 70%, white) 22%, ${annotation.color} 72%)`,
                    boxShadow: `0 10px 24px color-mix(in srgb, ${annotation.color} 52%, transparent)`,
                  }}
                >
                  <Pin size={16} className="rotate-45 text-white drop-shadow-sm" fill="currentColor" />
                </span>
                <div
                  className="min-h-[108px] rounded-[8px] border p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.46)]"
                  style={{
                    background: `linear-gradient(135deg, color-mix(in srgb, ${annotation.color} 30%, white), color-mix(in srgb, ${annotation.color} 52%, white))`,
                    borderColor: `color-mix(in srgb, ${annotation.color} 42%, white)`,
                  }}
                >
                  <div
                    className="mb-2 text-[20px] font-medium leading-none"
                    style={{ color: `color-mix(in srgb, ${annotation.color} 78%, #111827)` }}
                  >
                    {String(page).padStart(2, "0")}
                  </div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold leading-tight text-zinc-950">
                    <MessageSquare size={12} />
                    Sticky Note
                  </div>
                  <p className="line-clamp-4 break-words text-[11px] font-medium leading-snug text-zinc-700">{annotation.text || "Note"}</p>
                </div>
              </button>
            );
          }
          return null;
        })}
        {stickyDraft ? (
          <div
            className="absolute z-50 w-[300px] rounded-[8px] border border-white/80 bg-white p-4 pt-8 text-zinc-950 shadow-[0_28px_80px_rgba(15,15,20,.28)] transition-all duration-200"
            style={{
              left: Math.min(stickyDraft.point.x, Math.max(0, width - 300)),
              top: Math.min(stickyDraft.point.y, Math.max(0, height - 260)),
              transform: "rotate(-1deg)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
          >
            <span
              className="absolute left-1/2 top-0 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 shadow-[0_12px_26px_rgba(15,15,20,.28)]"
              style={{
                background:
                  stickyDraft.type === "sticky"
                    ? `radial-gradient(circle at 35% 30%, white 0%, color-mix(in srgb, ${stickyDraft.color} 70%, white) 22%, ${stickyDraft.color} 72%)`
                    : "radial-gradient(circle at 35% 30%, white 0%, #a7d8ff 24%, #6657ff 72%)",
                boxShadow:
                  stickyDraft.type === "sticky"
                    ? `0 12px 26px color-mix(in srgb, ${stickyDraft.color} 52%, transparent)`
                    : "0 12px 26px rgba(102,87,255,.36)",
              }}
            >
              <Pin size={17} className="rotate-45 text-white drop-shadow-sm" fill="currentColor" />
            </span>
            <div
              className="rounded-[8px] border p-3"
              style={{
                background:
                  stickyDraft.type === "sticky"
                    ? `linear-gradient(135deg, color-mix(in srgb, ${stickyDraft.color} 30%, white), color-mix(in srgb, ${stickyDraft.color} 52%, white))`
                    : "linear-gradient(135deg, #eef3ff, #e4e7ff)",
                borderColor:
                  stickyDraft.type === "sticky"
                    ? `color-mix(in srgb, ${stickyDraft.color} 42%, white)`
                    : "rgba(102,87,255,.18)",
              }}
            >
              <div
                className="mb-2 text-[22px] font-medium leading-none"
                style={{ color: stickyDraft.type === "sticky" ? `color-mix(in srgb, ${stickyDraft.color} 78%, #111827)` : "#4f46e5" }}
              >
                {String(page).padStart(2, "0")}
              </div>
              <div className="mb-2 flex items-center gap-1.5 text-sm font-extrabold text-zinc-950">
                <MessageSquare size={14} />
                {stickyDraft.type === "sticky" ? "Sticky Note" : "Text Note"}
              </div>
            <textarea
              ref={stickyInputRef}
              value={stickyDraft.text}
              aria-label="Sticky note content"
                className="h-32 w-full resize-none rounded-[8px] border border-white/60 bg-white/60 p-3 text-sm font-medium leading-relaxed text-zinc-800 outline-none placeholder:text-zinc-500/70 focus:border-white focus:ring-2 focus:ring-white/60"
                placeholder="Write a note..."
                onChange={(e) => setStickyDraft({ ...stickyDraft, text: e.target.value })}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    saveStickyDraft();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setStickyDraft(null);
                  }
                }}
              />
              <div className="mt-3 flex justify-end gap-1.5">
                <Button variant="ghost" size="sm" className="h-8 rounded-lg px-3 text-[11px] text-zinc-700 hover:bg-white/50" onClick={() => setStickyDraft(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" className="h-8 rounded-lg px-3.5 text-[11px]" onClick={saveStickyDraft}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : null}
        {selectedId ? <AnnotationToolbar onEditText={openTextEditor} /> : null}
      </div>

      {/* Signature Modal */}
      {isSignatureOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative flex w-[440px] flex-col gap-4 rounded-3xl border border-border bg-sidebar p-6 text-foreground shadow-2xl">
            <button
              aria-label="Close modal"
              className="absolute right-4 top-4 text-secondary hover:text-foreground transition"
              onClick={() => {
                setIsSignatureOpen(false);
                setSigPos(null);
                useUiStore.getState().setActiveTool("select");
              }}
            >
              <X size={18} />
            </button>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-accent">Draw Signature</h3>
              <p className="text-xs text-secondary mt-0.5">Use your mouse or trackpad to sign</p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-white p-1">
              <canvas
                ref={sigCanvasRef}
                width={382}
                height={180}
                className="block cursor-crosshair touch-none bg-white rounded-xl"
                onPointerDown={sigStart}
                onPointerMove={sigMove}
                onPointerUp={sigEnd}
                onPointerLeave={sigEnd}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={clearSig}
                className="text-xs px-4 py-2"
              >
                Clear
              </Button>
              <Button
                variant="primary"
                onClick={applySig}
                className="text-xs px-4 py-2"
              >
                Apply Signature
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
