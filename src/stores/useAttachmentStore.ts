import { create } from "zustand";

export type AttachmentItem = {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  createdAt: number;
};

type AttachmentState = {
  attachments: Record<string, AttachmentItem[]>;
  lastError: string | null;
  addAttachment: (fileId: string, name: string, size: number, type: string, dataUrl: string) => void;
  deleteAttachment: (fileId: string, attachmentId: string) => void;
  clearAttachmentError: () => void;
};

const ATTACHMENTS_KEY = "velora:attachments";

function loadAttachments(): Record<string, AttachmentItem[]> {
  try {
    const raw = localStorage.getItem(ATTACHMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistAttachments(attachments: Record<string, AttachmentItem[]>): boolean {
  try {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(attachments));
    return true;
  } catch (err) {
    console.error("Failed to save attachments to localStorage", err);
    return false;
  }
}

export const useAttachmentStore = create<AttachmentState>((set) => ({
  attachments: loadAttachments(),
  lastError: null,
  addAttachment: (fileId, name, size, type, dataUrl) =>
    set((state) => {
      const current = state.attachments[fileId] || [];
      const newItem: AttachmentItem = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        size,
        type,
        dataUrl,
        createdAt: Date.now(),
      };
      const updated = {
        ...state.attachments,
        [fileId]: [...current, newItem],
      };
      const saved = persistAttachments(updated);
      return saved
        ? { attachments: updated, lastError: null }
        : {
            attachments: state.attachments,
            lastError: "Attachment could not be saved. Try a smaller file.",
          };
    }),
  deleteAttachment: (fileId, attachmentId) =>
    set((state) => {
      const current = state.attachments[fileId] || [];
      const updated = {
        ...state.attachments,
        [fileId]: current.filter((item) => item.id !== attachmentId),
      };
      const saved = persistAttachments(updated);
      return saved
        ? { attachments: updated, lastError: null }
        : { attachments: state.attachments, lastError: "Attachment could not be deleted." };
    }),
  clearAttachmentError: () => set({ lastError: null }),
}));
