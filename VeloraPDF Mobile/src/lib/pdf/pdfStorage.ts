import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import ReactNativeBlobUtil from "react-native-blob-util";
import type { Annotation, PdfFileRecord } from "@/types";

const RECENTS_KEY = "velora.recentFiles.v1";
const ANNOTATIONS_KEY = "velora.annotations.v1";
const PDF_DIR = `${FileSystem.documentDirectory ?? ""}pdfs/`;

export async function ensurePdfDir() {
  const info = await FileSystem.getInfoAsync(PDF_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PDF_DIR, { intermediates: true });
}

export async function copyPdfToLocal(asset: { name?: string | null; uri: string }): Promise<PdfFileRecord> {
  await ensurePdfDir();
  const name = asset.name && asset.name.toLowerCase().endsWith(".pdf") ? asset.name : `${asset.name ?? "document"}.pdf`;
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  const safeName = name.replace(/[^\w.\-() ]+/g, "_");
  const destination = `${PDF_DIR}${id}-${safeName}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  const pageCount = await readPdfPageCount(destination);
  return {
    id,
    name,
    uri: destination,
    originalUri: asset.uri,
    pageCount,
    lastOpened: Date.now()
  };
}

export async function readPdfPageCount(uri: string): Promise<number | undefined> {
  try {
    const path = uri.replace(/^file:\/\//, "");
    const raw = await ReactNativeBlobUtil.fs.readFile(path, "utf8");
    const pageTreeCounts = [
      ...raw.matchAll(/\/Type\s*\/Pages\b(?:(?!endobj).){0,800}?\/Count\s+(\d+)/gs),
      ...raw.matchAll(/\/Count\s+(\d+)(?:(?!endobj).){0,800}?\/Type\s*\/Pages\b/gs)
    ]
      .map((match) => Number(match[1]))
      .filter((count) => Number.isFinite(count) && count > 0);
    if (pageTreeCounts.length) return Math.max(...pageTreeCounts);
    const matches = raw.match(/\/Type\s*\/Page\b/g);
    return matches?.length ? matches.length : undefined;
  } catch {
    return undefined;
  }
}

export async function loadRecentFiles(): Promise<PdfFileRecord[]> {
  const raw = await AsyncStorage.getItem(RECENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PdfFileRecord[];
  } catch {
    return [];
  }
}

export async function saveRecentFiles(files: PdfFileRecord[]) {
  await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(files.slice(0, 24)));
}

export async function loadAnnotations(): Promise<Record<string, Annotation[]>> {
  const raw = await AsyncStorage.getItem(ANNOTATIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, Annotation[]>;
  } catch {
    return {};
  }
}

export async function saveAnnotationsByFile(data: Record<string, Annotation[]>) {
  await AsyncStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(data));
}
