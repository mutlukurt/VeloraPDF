import { convertFileSrc, invoke } from "@tauri-apps/api/core";

export type VoiceRecordingFile = {
  path: string;
  src: string;
};

function isTauriRuntime() {
  return Boolean("__TAURI_INTERNALS__" in window);
}

export function canStreamVoiceRecording() {
  return isTauriRuntime();
}

export async function createVoiceRecordingFile(filename: string) {
  const path = await invoke<string>("create_voice_recording_file", { filename });
  return { path, src: convertFileSrc(path) } satisfies VoiceRecordingFile;
}

export async function appendVoiceRecordingChunk(path: string, bytes: Uint8Array) {
  await invoke("append_voice_recording_chunk", { path, data: Array.from(bytes) });
}

export async function deleteVoiceRecordingFile(path: string) {
  await invoke("delete_voice_recording_file", { path });
}
