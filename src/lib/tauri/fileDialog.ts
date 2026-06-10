import { open, save } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { pickBrowserPdfFile, readBrowserRecentPdf } from "../browser/browserPdfAccess";

export type PickedPdf = {
  name: string;
  path?: string;
  browserId?: string;
  data: Uint8Array;
};

function isTauriRuntime() {
  return Boolean("__TAURI_INTERNALS__" in window);
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).pop() || "Untitled.pdf";
}

export async function pickPdfFile(): Promise<PickedPdf | null> {
  if (!isTauriRuntime()) return pickBrowserPdfFile();

  const selected = await open({
    multiple: false,
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
  });

  if (typeof selected !== "string") return null;
  const data = await readFile(selected);
  return { name: fileNameFromPath(selected), path: selected, data };
}

export async function readPdfFile(path?: string, browserId?: string): Promise<PickedPdf> {
  if (!isTauriRuntime() && browserId) return readBrowserRecentPdf(browserId);

  if (!isTauriRuntime()) {
    throw new Error("This browser recent file needs to be opened once again.");
  }

  if (!path) throw new Error("Missing PDF file path.");

  const data = await readFile(path);
  return { name: fileNameFromPath(path), path, data };
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

  const selected = await save({
    defaultPath: fileName,
    filters: [{ name: "Velora annotations", extensions: ["json"] }],
  });
  if (!selected) return;
  await writeFile(selected, new TextEncoder().encode(JSON.stringify(payload, null, 2)));
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

  const selected = await save({
    defaultPath: defaultName,
    filters: [{ name: "PDF document", extensions: ["pdf"] }],
  });
  if (!selected) return;
  await writeFile(selected, bytes);
}
