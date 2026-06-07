import type { PDFDocumentProxy } from "pdfjs-dist";

export type SearchResult = {
  page: number;
  snippet: string;
};

export async function searchPdf(pdf: PDFDocumentProxy, query: string): Promise<SearchResult[]> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const results: SearchResult[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    const index = text.toLowerCase().indexOf(normalized);
    if (index >= 0) {
      const start = Math.max(0, index - 56);
      const end = Math.min(text.length, index + query.length + 72);
      results.push({ page: pageNumber, snippet: text.slice(start, end).trim() });
    }
  }
  return results;
}
