import { invoke } from "@tauri-apps/api/core";
import { pickBrowserPdfFile, readBrowserRecentPdf } from "../browser/browserPdfAccess";

export type PickedPdf = {
  name: string;
  path?: string;
  browserId?: string;
  data: Uint8Array;
};

type PickedFilePayload = {
  name: string;
  path: string;
  data: number[];
};

function isTauriRuntime() {
  return Boolean(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
}

function payloadToPickedPdf(payload: PickedFilePayload): PickedPdf {
  return {
    name: payload.name,
    path: payload.path,
    data: new Uint8Array(payload.data),
  };
}

export async function pickPdfFile(): Promise<PickedPdf | null> {
  if (!isTauriRuntime()) return pickBrowserPdfFile();

  const result = await invoke<PickedFilePayload | null>("pick_pdf_file");
  return result ? payloadToPickedPdf(result) : null;
}

export async function readPdfFile(path?: string, browserId?: string): Promise<PickedPdf> {
  if (!isTauriRuntime() && browserId) return readBrowserRecentPdf(browserId);

  if (!isTauriRuntime()) {
    throw new Error("This browser recent file needs to be opened once again.");
  }

  if (!path) throw new Error("Missing PDF file path.");

  return payloadToPickedPdf(await invoke<PickedFilePayload>("read_pdf_file", { path }));
}

export async function saveJsonSidecar(defaultPath: string | undefined, payload: unknown) {
  const fileName = defaultPath ? `${defaultPath.replace(/\.pdf$/i, "")}.velora.json` : "annotations.velora.json";

  if (!isTauriRuntime()) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "annotations.velora.json";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  await invoke<string | null>("save_text_with_dialog", {
    defaultName: fileName,
    contents: JSON.stringify(payload, null, 2),
  });
}

export async function savePdfBytes(defaultName: string, bytes: Uint8Array) {
  if (!isTauriRuntime()) {
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const blob = new Blob([copy.buffer], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = defaultName;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  await invoke<string | null>("save_binary_with_dialog", {
    defaultName: defaultName,
    data: Array.from(bytes),
  });
}

export async function pickJsonFile(): Promise<string | null> {
  if (!isTauriRuntime()) return null;
  return invoke<string | null>("pick_json_file");
}
