import { Copy, Trash2, Edit2 } from "lucide-react";
import { IconButton } from "../ui/IconButton";
import { useAnnotationStore } from "../../stores/useAnnotationStore";

const colors = ["#FFE66D", "#89F7B4", "#C7B7FF", "#FFB5D8", "#A7D8FF", "#6657FF", "#FF5B5B"];

export function AnnotationToolbar() {
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
    >
      {colors.map((color) => (
        <button
          key={color}
          aria-label={`Set color ${color}`}
          className="h-6 w-6 rounded-lg border border-white/20"
          style={{ background: color }}
          onClick={() => updateAnnotation(selected.id, { color } as Partial<typeof selected>)}
        />
      ))}
      {hasText && (
        <IconButton
          label="Edit note content"
          className="h-8 w-8"
          onClick={() => {
            const newText = window.prompt("Edit note content", (selected as any).text);
            if (newText !== null && newText.trim() !== "") {
              updateAnnotation(selected.id, { text: newText });
            }
          }}
        >
          <Edit2 size={14} />
        </IconButton>
      )}
      <IconButton label="Duplicate annotation" className="h-8 w-8" onClick={() => duplicateAnnotation(selected.id)}><Copy size={14} /></IconButton>
      <IconButton label="Delete annotation" className="h-8 w-8 text-red-400" onClick={() => deleteAnnotation(selected.id)}><Trash2 size={14} /></IconButton>
    </div>
  );
}
