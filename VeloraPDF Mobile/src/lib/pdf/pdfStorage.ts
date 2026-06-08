import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
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
  return {
    id,
    name,
    uri: destination,
    originalUri: asset.uri,
    lastOpened: Date.now()
  };
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
