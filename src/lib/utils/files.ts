export async function downloadBlob(blob: Blob, filename: string) {
  const isTauri = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
  if (isTauri()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const buffer = new Uint8Array(await blob.arrayBuffer());
      const path = await invoke<string>("save_file_to_downloads", {
        filename,
        data: Array.from(buffer),
      });
      alert(`Saved to: ${path}`);
      return;
    } catch (error) {
      console.error("Tauri save failed, falling back to browser download:", error);
    }
  }
  
  // Browser fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadText(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  return downloadBlob(blob, filename);
}

export function safeFileName(name: string, fallback = "untitled"): string {
  const clean = name.replace(/[^a-zA-Z0-9_\u00C0-\u017F.-]/g, "_").trim();
  return clean || fallback;
}
