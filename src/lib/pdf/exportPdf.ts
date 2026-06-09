import { PDFDocument, rgb } from "pdf-lib";
import type { Annotation } from "../../stores/useAnnotationStore";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function pageScale(annotation: Annotation, pdfWidth: number, pdfHeight: number) {
  const sourceWidth = annotation.pageWidth || 760;
  const sourceHeight = annotation.pageHeight || 980;
  return {
    sx: pdfWidth / sourceWidth,
    sy: pdfHeight / sourceHeight,
  };
}

export async function exportAnnotatedPdf(source: Uint8Array, annotations: Annotation[]) {
  const pdf = await PDFDocument.load(source);
  const pages = pdf.getPages();

  annotations.forEach((annotation) => {
    const page = pages[annotation.page - 1];
    if (!page) return;
    const { width, height } = page.getSize();
    const { sx, sy } = pageScale(annotation, width, height);

    if (annotation.type === "highlight") {
      page.drawRectangle({
        x: annotation.x * sx,
        y: height - (annotation.y + annotation.height) * sy,
        width: annotation.width * sx,
        height: annotation.height * sy,
        color: hexToRgb(annotation.color),
        opacity: annotation.opacity,
      });
    }

    if (annotation.type === "rectangle") {
      page.drawRectangle({
        x: annotation.x * sx,
        y: height - (annotation.y + annotation.height) * sy,
        width: annotation.width * sx,
        height: annotation.height * sy,
        borderColor: hexToRgb(annotation.color),
        borderWidth: annotation.strokeWidth,
        opacity: 0.9,
      });
    }

    if (annotation.type === "circle") {
      page.drawEllipse({
        x: (annotation.x + annotation.width / 2) * sx,
        y: height - (annotation.y + annotation.height / 2) * sy,
        xScale: Math.abs(annotation.width * sx) / 2,
        yScale: Math.abs(annotation.height * sy) / 2,
        borderColor: hexToRgb(annotation.color),
        borderWidth: annotation.strokeWidth,
      });
    }

    if (annotation.type === "pen" && annotation.points.length > 1) {
      annotation.points.slice(1).forEach((point, index) => {
        const previous = annotation.points[index];
        page.drawLine({
          start: { x: previous.x * sx, y: height - previous.y * sy },
          end: { x: point.x * sx, y: height - point.y * sy },
          color: hexToRgb(annotation.color),
          thickness: annotation.strokeWidth,
          opacity: 0.9,
        });
      });
    }

    if (annotation.type === "text") {
      page.drawText(annotation.text || "Note", {
        x: annotation.x * sx,
        y: height - (annotation.y + annotation.fontSize) * sy,
        size: annotation.fontSize * Math.min(sx, sy),
        color: hexToRgb(annotation.color),
        maxWidth: 220 * sx,
      });
    }

    if (annotation.type === "sticky") {
      const noteWidth = 160;
      const noteHeight = 62;
      const padding = 10;
      const x = annotation.x * sx;
      const y = height - (annotation.y + noteHeight) * sy;

      page.drawRectangle({
        x,
        y,
        width: noteWidth * sx,
        height: noteHeight * sy,
        color: hexToRgb(annotation.color),
        opacity: 0.95,
        borderColor: rgb(0.76, 0.64, 0.22),
        borderWidth: 0.8,
      });
      page.drawText(annotation.text || "Note", {
        x: x + padding * sx,
        y: y + noteHeight * sy - 20 * sy,
        size: 10.5 * Math.min(sx, sy),
        color: rgb(0.12, 0.1, 0.05),
        maxWidth: (noteWidth - padding * 2) * sx,
        lineHeight: 13 * sy,
      });
    }
  });

  return pdf.save();
}
