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
  addAttachment: (fileId: string, name: string, size: number, type: string, dataUrl: string) => void;
  deleteAttachment: (fileId: string, attachmentId: string) => void;
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

function persistAttachments(attachments: Record<string, AttachmentItem[]>) {
  try {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(attachments));
  } catch (err) {
    console.error("Failed to save attachments to localStorage", err);
  }
}

export const useAttachmentStore = create<AttachmentState>((set) => ({
  attachments: loadAttachments(),
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
      persistAttachments(updated);
      return { attachments: updated };
    }),
  deleteAttachment: (fileId, attachmentId) =>
    set((state) => {
      const current = state.attachments[fileId] || [];
      const updated = {
        ...state.attachments,
        [fileId]: current.filter((item) => item.id !== attachmentId),
      };
      persistAttachments(updated);
      return { attachments: updated };
    }),
}));
