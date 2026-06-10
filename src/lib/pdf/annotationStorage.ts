import type { ActiveFile } from "../../stores/usePdfStore";
import type { Annotation } from "../../stores/useAnnotationStore";

const STORAGE_PREFIX = "velora:pdf-annotations:";

function encodeKeyPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

export function annotationStorageKey(file: ActiveFile) {
  const identity = file.path ? `path:${file.path}` : `browser:${file.browserId ?? `${file.name}:${file.data.byteLength}`}`;
  return `${STORAGE_PREFIX}${encodeKeyPart(identity)}`;
}

export function loadStoredAnnotations(file: ActiveFile): Annotation[] {
  try {
    const raw = localStorage.getItem(annotationStorageKey(file));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Annotation[]) : [];
  } catch (error) {
    console.error("Could not load stored annotations:", error);
    return [];
  }
}

export function persistStoredAnnotations(file: ActiveFile, annotations: Annotation[]) {
  try {
    localStorage.setItem(annotationStorageKey(file), JSON.stringify(annotations));
  } catch (error) {
    console.error("Could not persist annotations:", error);
  }
}
