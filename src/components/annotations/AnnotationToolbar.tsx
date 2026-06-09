import { Copy, Trash2, Edit2 } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { type Annotation, useAnnotationStore } from "../../stores/useAnnotationStore";

const colors = ["#FFE66D", "#89F7B4", "#C7B7FF", "#FFB5D8", "#A7D8FF", "#6657FF", "#FF5B5B"];

type AnnotationToolbarProps = {
  onEditText?: (annotation: Extract<Annotation, { type: "text" | "sticky" }>) => void;
};

export function AnnotationToolbar({ onEditText }: AnnotationToolbarProps) {
  const selectedId = useAnnotationStore((state) => state.selectedId);
  const annotations = useAnnotationStore((state) => state.annotations);
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation);
  const deleteAnnotation = useAnnotationStore((state) => state.deleteAnnotation);
  const duplicateAnnotation = useAnnotationStore((state) => state.duplicateAnnotation);
  const selected = annotations.find((item) => item.id === selectedId);

  if (!selected) return null;

  let x = 0;
  let y = 0;
  if ("x" in selected) {
    x = selected.x;
    y = selected.y;
  } else if (selected.type === "pen" && selected.points.length > 0) {
    x = Math.min(...selected.points.map((p) => p.x));
    y = Math.min(...selected.points.map((p) => p.y));
  } else {
    return null;
  }

  const hasText = selected.type === "text" || selected.type === "sticky";

  return (
    <div
      className="absolute z-40 flex items-center gap-1 rounded-2xl border border-border bg-toolbar p-1 shadow-velora"
      style={{ left: x, top: Math.max(8, y - 54) }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
    >
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Set color ${color}`}
          className={`h-6 w-6 rounded-lg border border-white/20 ${"color" in selected && selected.color === color ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--toolbar)]" : ""}`}
          style={{ background: color }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            updateAnnotation(selected.id, { color } as Partial<typeof selected>);
          }}
        />
      ))}
      {hasText && (
        <IconButton
          label="Edit note content"
          className="h-8 w-8"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEditText?.(selected as Extract<Annotation, { type: "text" | "sticky" }>);
          }}
        >
          <Edit2 size={14} />
        </IconButton>
      )}
      <IconButton
        label="Duplicate annotation"
        className="h-8 w-8"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          duplicateAnnotation(selected.id);
        }}
      >
        <Copy size={14} />
      </IconButton>
      <IconButton
        label="Delete annotation"
        className="h-8 w-8 text-red-400"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          deleteAnnotation(selected.id);
        }}
      >
        <Trash2 size={14} />
      </IconButton>
    </div>
  );
}
