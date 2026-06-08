import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { NotebookRecord, NotebookTemplate, NoteStroke } from "@/types";

const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function templateSvg(template: NotebookTemplate) {
  if (template === "blank") return "";
  const items: string[] = [];
  if (template === "lined") {
    for (let y = 72; y < A4_HEIGHT - 36; y += 42) {
      items.push(`<line x1="64" x2="${A4_WIDTH - 64}" y1="${y}" y2="${y}" stroke="#D9DCEA" stroke-width="1" />`);
    }
    return items.join("");
  }
  for (let x = 48; x < A4_WIDTH; x += 32) {
    items.push(`<line x1="${x}" x2="${x}" y1="0" y2="${A4_HEIGHT}" stroke="#E4E7F0" stroke-width="1" />`);
  }
  for (let y = 48; y < A4_HEIGHT; y += 32) {
    items.push(`<line x1="0" x2="${A4_WIDTH}" y1="${y}" y2="${y}" stroke="#E4E7F0" stroke-width="1" />`);
  }
  return items.join("");
}

function strokeSvg(stroke: NoteStroke) {
  const points = stroke.points.map((point) => `${point.x * A4_WIDTH},${point.y * A4_HEIGHT}`).join(" ");
  return `<polyline points="${points}" fill="none" stroke="${escapeHtml(stroke.color)}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${stroke.strokeWidth}" opacity="${stroke.opacity ?? 1}" />`;
}

function pageHtml(notebook: NotebookRecord, page: number) {
  const strokes = notebook.strokes.filter((stroke) => (stroke.page || 1) === page).map(strokeSvg).join("");
  return `
    <section class="page">
      <svg width="${A4_WIDTH}" height="${A4_HEIGHT}" viewBox="0 0 ${A4_WIDTH} ${A4_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#FFFEFB" />
        ${templateSvg(notebook.template)}
        ${strokes}
      </svg>
    </section>
  `;
}

export async function exportNotebookPdf(notebook: NotebookRecord) {
  const pageCount = Math.max(1, notebook.pageCount || 1);
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #ffffff; }
          .page { width: 210mm; height: 297mm; page-break-after: always; overflow: hidden; }
          .page:last-child { page-break-after: auto; }
          svg { display: block; width: 210mm; height: 297mm; }
        </style>
        <title>${escapeHtml(notebook.title)}</title>
      </head>
      <body>
        ${Array.from({ length: pageCount }, (_, index) => pageHtml(notebook, index + 1)).join("")}
      </body>
    </html>
  `;
  const printed = await Print.printToFileAsync({ html, base64: false });
  if (!(await Sharing.isAvailableAsync())) return printed.uri;
  await Sharing.shareAsync(printed.uri, {
    dialogTitle: `${notebook.title}.pdf`,
    mimeType: "application/pdf"
  });
  return printed.uri;
}
