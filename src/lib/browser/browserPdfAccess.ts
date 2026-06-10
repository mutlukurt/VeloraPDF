import type { PickedPdf } from "../tauri/fileDialog";

type StoredBrowserPdf = {
  id: string;
  name: string;
  size: number;
  lastModified: number;
  handle?: FileSystemFileHandle;
  blob?: Blob;
};

type FileSystemReadPermissionDescriptor = { mode: "read" };
type PermissionAwareFileHandle = FileSystemFileHandle & {
  queryPermission?: (descriptor?: FileSystemReadPermissionDescriptor) => Promise<PermissionState>;
  requestPermission?: (descriptor?: FileSystemReadPermissionDescriptor) => Promise<PermissionState>;
};

const DB_NAME = "velora-browser-pdfs";
const DB_VERSION = 1;
const STORE_NAME = "pdfs";

type WindowWithFilePicker = Window &
  typeof globalThis & {
    showOpenFilePicker?: (options?: {
      multiple?: boolean;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<FileSystemFileHandle[]>;
  };

function browserPdfId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const request = run(transaction.objectStore(STORE_NAME));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

async function saveRecord(record: StoredBrowserPdf) {
  await withStore("readwrite", (store) => store.put(record));
}

async function getRecord(id: string) {
  return withStore<StoredBrowserPdf | undefined>("readonly", (store) => store.get(id));
}

async function fileFromHandle(handle: FileSystemFileHandle) {
  const permissionDescriptor: FileSystemReadPermissionDescriptor = { mode: "read" };
  const permissionHandle = handle as PermissionAwareFileHandle;
  const query = await permissionHandle.queryPermission?.(permissionDescriptor);
  if (query !== "granted") {
    const requested = await permissionHandle.requestPermission?.(permissionDescriptor);
    if (requested !== "granted") throw new Error("PDF file access was not granted.");
  }
  return handle.getFile();
}

async function pickedFromFile(file: File, browserId: string): Promise<PickedPdf> {
  return {
    name: file.name,
    data: new Uint8Array(await file.arrayBuffer()),
    browserId,
  };
}

export async function pickBrowserPdfFile(): Promise<PickedPdf | null> {
  const picker = (window as WindowWithFilePicker).showOpenFilePicker;
  if (picker) {
    const handles = await picker({
      multiple: false,
      types: [{ description: "PDF document", accept: { "application/pdf": [".pdf"] } }],
    });
    const handle = handles[0];
    if (!handle) return null;
    const file = await handle.getFile();
    const id = browserPdfId(file);
    await saveRecord({ id, name: file.name, size: file.size, lastModified: file.lastModified, handle, blob: file });
    return pickedFromFile(file, id);
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const id = browserPdfId(file);
      await saveRecord({ id, name: file.name, size: file.size, lastModified: file.lastModified, blob: file });
      resolve(await pickedFromFile(file, id));
    };
    input.click();
  });
}

export async function readBrowserRecentPdf(browserId: string): Promise<PickedPdf> {
  const record = await getRecord(browserId);
  if (!record) throw new Error("This PDF is no longer available in browser storage.");

  if (record.handle) {
    try {
      const file = await fileFromHandle(record.handle);
      await saveRecord({ ...record, name: file.name, size: file.size, lastModified: file.lastModified, blob: file });
      return pickedFromFile(file, browserId);
    } catch (error) {
      if (!record.blob) throw error;
    }
  }

  if (!record.blob) throw new Error("This PDF could not be restored from browser storage.");
  return pickedFromFile(new File([record.blob], record.name, { type: "application/pdf", lastModified: record.lastModified }), browserId);
}
