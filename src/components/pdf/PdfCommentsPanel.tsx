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
import { useState } from "react";
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
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
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
      setEditing({ id: annotation.id, text: annotation.text });
    }
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editing) return;
    updateAnnotation(editing.id, { text: editing.text.trim() || "Note" });
    setEditing(null);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteAnnotation(id);
  };

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar md:w-72">
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

                {hasText && editing?.id !== annotation.id && (
                  <p className="text-xs leading-5 text-primary break-words bg-[var(--surface-muted)] p-2 rounded-lg border border-border">
                    {annotation.text}
                  </p>
                )}

                {hasText && editing?.id === annotation.id && (
                  <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editing.text}
                      aria-label="Edit comment text"
                      className="h-20 w-full resize-none rounded-lg border border-border bg-elevated p-2 text-xs leading-5 text-primary outline-none focus:border-accent"
                      onChange={(e) => setEditing({ id: annotation.id, text: e.target.value })}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          updateAnnotation(annotation.id, { text: editing.text.trim() || "Note" });
                          setEditing(null);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setEditing(null);
                        }
                      }}
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg px-2 py-1 text-[10px] font-semibold text-secondary hover:bg-elevated"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-accent px-2 py-1 text-[10px] font-semibold text-white hover:brightness-110"
                        onClick={saveEdit}
                      >
                        Save
                      </button>
                    </div>
                  </div>
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
                  <div className="flex items-center gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
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
