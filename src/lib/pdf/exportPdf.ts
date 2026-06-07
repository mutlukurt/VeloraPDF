import { PDFDocument, rgb } from "pdf-lib";
import type { Annotation } from "../../stores/useAnnotationStore";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

export async function exportAnnotatedPdf(source: Uint8Array, annotations: Annotation[]) {
  const pdf = await PDFDocument.load(source);
  const pages = pdf.getPages();

  annotations.forEach((annotation) => {
    const page = pages[annotation.page - 1];
    if (!page) return;
    const { width, height } = page.getSize();
    const sx = width / 760;
    const sy = height / 980;

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

    if (annotation.type === "text" || annotation.type === "sticky") {
      page.drawText(annotation.text || "Note", {
        x: annotation.x * sx,
        y: height - annotation.y * sy,
        size: annotation.type === "text" ? annotation.fontSize : 11,
        color: hexToRgb(annotation.color),
        maxWidth: 220 * sx,
      });
    }
  });

  return pdf.save();
}
