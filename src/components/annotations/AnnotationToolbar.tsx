import { Copy, Trash2 } from "lucide-react";
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

  if (!selected || !("x" in selected)) return null;

  return (
    <div
      className="absolute z-40 flex items-center gap-1 rounded-2xl border border-border bg-toolbar p-1 shadow-velora"
      style={{ left: selected.x, top: Math.max(8, selected.y - 54) }}
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
      <IconButton label="Duplicate annotation" className="h-8 w-8" onClick={() => duplicateAnnotation(selected.id)}><Copy size={14} /></IconButton>
      <IconButton label="Delete annotation" className="h-8 w-8 text-red-400" onClick={() => deleteAnnotation(selected.id)}><Trash2 size={14} /></IconButton>
    </div>
  );
}
