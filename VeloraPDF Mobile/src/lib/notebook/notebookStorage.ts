import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import type { NotebookRecord } from "@/types";

const NOTEBOOKS_KEY = "velora.notebooks.v1";
export const NOTEBOOK_AUDIO_DIR = `${FileSystem.documentDirectory ?? ""}notebook-audio/`;

export async function ensureNotebookAudioDir() {
  const info = await FileSystem.getInfoAsync(NOTEBOOK_AUDIO_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(NOTEBOOK_AUDIO_DIR, { intermediates: true });
}

export async function loadNotebooks(): Promise<NotebookRecord[]> {
  const raw = await AsyncStorage.getItem(NOTEBOOKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as NotebookRecord[];
  } catch {
    return [];
  }
}

export async function saveNotebooks(notebooks: NotebookRecord[]) {
  await AsyncStorage.setItem(NOTEBOOKS_KEY, JSON.stringify(notebooks));
}

export async function copyRecordingToNotebook(recordingUri: string, id: string) {
  await ensureNotebookAudioDir();
  const destination = `${NOTEBOOK_AUDIO_DIR}${id}.m4a`;
  await FileSystem.copyAsync({ from: recordingUri, to: destination });
  return destination;
}
