import {
  Highlighter,
  MessageSquare,
  PenTool,
  Type,
  Square,
  Circle,
  ArrowUpRight,
  Trash2,
  Edit2,
  Underline as UnderlineIcon,
  Strikethrough as StrikeIcon,
  Image as ImageIcon
} from "lucide-react";
import { useAnnotationStore, type Annotation } from "../../stores/useAnnotationStore";
import { usePdfStore } from "../../stores/usePdfStore";

function getAnnotationIcon(type: string) {
  switch (type) {
    case "highlight":
      return <Highlighter size={14} />;
    case "underline":
      return <UnderlineIcon size={14} />;
    case "strike":
      return <StrikeIcon size={14} />;
    case "signature":
      return <ImageIcon size={14} />;
    case "pen":
      return <PenTool size={14} />;
    case "text":
      return <Type size={14} />;
    case "sticky":
      return <MessageSquare size={14} />;
    case "rectangle":
      return <Square size={14} />;
    case "circle":
      return <Circle size={14} />;
    case "arrow":
      return <ArrowUpRight size={14} />;
    default:
      return <MessageSquare size={14} />;
  }
}

function getAnnotationLabel(type: string) {
  switch (type) {
    case "highlight":
      return "Highlight";
    case "underline":
      return "Underline";
    case "strike":
      return "Strikeout";
    case "signature":
      return "Signature";
    case "pen":
      return "Freehand Draw";
    case "text":
      return "Text Note";
    case "sticky":
      return "Sticky Note";
    case "rectangle":
      return "Rectangle Shape";
    case "circle":
      return "Circle Shape";
    case "arrow":
      return "Arrow Shape";
    default:
      return "Annotation";
  }
}

export function PdfCommentsPanel() {
  const annotations = useAnnotationStore((state) => state.annotations);
  const deleteAnnotation = useAnnotationStore((state) => state.deleteAnnotation);
  const updateAnnotation = useAnnotationStore((state) => state.updateAnnotation);
  const setSelectedId = useAnnotationStore((state) => state.setSelectedId);
  const setCurrentPage = usePdfStore((state) => state.setCurrentPage);

  // Group annotations by page, sorted by page then by createdAt
  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });

  const handleJump = (annotation: Annotation) => {
    setCurrentPage(annotation.page);
    setSelectedId(annotation.id);
    setTimeout(() => {
      document.getElementById(`page-${annotation.page}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const handleEdit = (e: React.MouseEvent, annotation: Annotation) => {
    e.stopPropagation();
    if (annotation.type === "text" || annotation.type === "sticky") {
      const text = window.prompt("Edit note content", annotation.text);
      if (text !== null && text.trim() !== "") {
        updateAnnotation(annotation.id, { text });
      }
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteAnnotation(id);
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-border bg-sidebar h-full overflow-hidden">
      <div className="p-4 border-b border-border shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Comments & Notes</h2>
        <p className="text-xs text-secondary mt-0.5">Summary of all document annotations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sortedAnnotations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center text-xs text-secondary leading-5">
            No annotations created yet. Select a drawing or text tool from the toolbar and click/drag on the PDF to start annotating.
          </div>
        ) : (
          sortedAnnotations.map((annotation) => {
            const hasText = annotation.type === "text" || annotation.type === "sticky";
            const annotationColor = "color" in annotation ? annotation.color : "#6657FF";

            return (
              <div
                key={annotation.id}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 transition hover:border-accent/40 hover:bg-elevated cursor-pointer"
                onClick={() => handleJump(annotation)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-accent border border-border"
                      style={{ color: annotationColor }}
                    >
                      {getAnnotationIcon(annotation.type)}
                    </span>
                    <span className="text-xs font-bold text-primary">
                      {getAnnotationLabel(annotation.type)}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-secondary">Page {annotation.page}</span>
                </div>

                {hasText && (
                  <p className="text-xs leading-5 text-primary break-words bg-[var(--surface-muted)] p-2 rounded-lg border border-border">
                    {annotation.text}
                  </p>
                )}

                <div className="flex items-center justify-between mt-1 pt-1 border-t border-border/40">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full border border-black/10"
                      style={{ background: annotationColor }}
                    />
                    <span className="text-[10px] text-secondary">
                      {new Date(annotation.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    {hasText && (
                      <button
                        aria-label="Edit comment text"
                        className="p-1 text-secondary hover:text-accent rounded-lg transition"
                        onClick={(e) => handleEdit(e, annotation)}
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    <button
                      aria-label="Delete comment"
                      className="p-1 text-secondary hover:text-red-400 rounded-lg transition"
                      onClick={(e) => handleDelete(e, annotation.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
