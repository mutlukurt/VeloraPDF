import React, { useRef } from "react";
import { Paperclip, Trash2, Download, Plus } from "lucide-react";
import { usePdfStore } from "../../stores/usePdfStore";
import { useAttachmentStore } from "../../stores/useAttachmentStore";
import { Button } from "../ui/Button";

export function PdfAttachmentsPanel() {
  const activeFile = usePdfStore((state) => state.activeFile);
  const fileId = activeFile ? (activeFile.path ?? activeFile.name) : "";

  const attachments = useAttachmentStore(
    (state) => state.attachments[fileId] || []
  );
  const addAttachment = useAttachmentStore((state) => state.addAttachment);
  const deleteAttachment = useAttachmentStore((state) => state.deleteAttachment);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fileId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      addAttachment(fileId, file.name, file.size, file.type, dataUrl);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const handleDownload = (name: string, dataUrl: string) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col border-r border-border bg-sidebar h-full overflow-hidden">
      <div className="p-4 border-b border-border flex flex-col gap-3 shrink-0">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-secondary">Attachments</h2>
          <p className="text-xs text-secondary mt-0.5">Manage files attached to this document</p>
        </div>
        <Button
          variant="primary"
          onClick={handleAttachClick}
          disabled={!activeFile}
          className="w-full text-xs py-2 h-9"
          icon={<Plus size={14} />}
        >
          Attach File
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {attachments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-6 text-center text-xs text-secondary leading-5">
            No files attached to this document. Click "Attach File" above to associate any document, image, or raw resource.
          </div>
        ) : (
          attachments.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between rounded-xl border border-border bg-surface p-3 transition hover:border-accent/40 hover:bg-elevated"
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-accent truncate">
                  <Paperclip size={12} className="shrink-0 text-secondary" />
                  <span className="truncate" title={item.name}>{item.name}</span>
                </div>
                <div className="text-[10px] text-secondary mt-0.5">
                  {formatSize(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  aria-label="Download attachment"
                  className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-accent rounded-lg transition"
                  onClick={() => handleDownload(item.name, item.dataUrl)}
                >
                  <Download size={13} />
                </button>
                <button
                  aria-label="Delete attachment"
                  className="opacity-0 group-hover:opacity-100 p-1 text-secondary hover:text-red-400 rounded-lg transition"
                  onClick={() => deleteAttachment(fileId, item.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
