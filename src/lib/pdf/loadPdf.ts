import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.mjs", import.meta.url).toString();

export async function loadPdfDocument(data: Uint8Array): Promise<PDFDocumentProxy> {
  return pdfjsLib.getDocument({ data: data.slice().buffer }).promise;
}
