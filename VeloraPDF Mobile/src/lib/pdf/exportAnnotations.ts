import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { Annotation, PdfFileRecord } from "@/types";
import { slugifyFileName } from "@/lib/utils/ids";

export async function shareOriginalPdf(file: PdfFileRecord) {
  if (!(await Sharing.isAvailableAsync())) throw new Error("Sharing is not available on this device.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", dialogTitle: file.name });
}

export async function exportAnnotationJson(file: PdfFileRecord, annotations: Annotation[]) {
  const base = slugifyFileName(file.name);
  const uri = `${FileSystem.documentDirectory}${base}.velora.json`;
  const payload = {
    app: "Velora PDF Mobile",
    version: "1.0.0",
    file: {
      id: file.id,
      name: file.name,
      pageCount: file.pageCount ?? null,
      exportedAt: new Date().toISOString()
    },
    annotations
  };

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: `${base}.velora.json` });
  }
  return uri;
}
