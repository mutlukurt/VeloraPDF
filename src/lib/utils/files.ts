export async function downloadBlob(blob: Blob, filename: string) {
  const androidFiles = typeof window !== "undefined" ? (window as Window & {
    VeloraAndroidFiles?: {
      saveDownload: (filename: string, mimeType: string, base64Data: string) => string;
    };
  }).VeloraAndroidFiles : undefined;

  if (androidFiles) {
    const buffer = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    const chunkSize = 0x8000;
    for (let offset = 0; offset < buffer.length; offset += chunkSize) {
      binary += String.fromCharCode(...buffer.subarray(offset, offset + chunkSize));
    }
    const result = JSON.parse(androidFiles.saveDownload(filename, blob.type || "application/octet-stream", btoa(binary))) as {
      ok?: boolean;
      path?: string;
      error?: string;
    };
    if (!result.ok) throw new Error(result.error || "Android download failed.");
    return;
  }

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
