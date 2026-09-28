import type { PocketJob, PocketRequest } from "./pocket-sync";

const DB_NAME = "kasb-pocket";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("jobs")) db.createObjectStore("jobs", { keyPath: "localId" });
      if (!db.objectStoreNames.contains("requests")) db.createObjectStore("requests", { keyPath: "localId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function all<T>(store: "jobs" | "requests") {
  return openDb().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const tx = db.transaction(store, "readonly");
        const request = tx.objectStore(store).getAll();
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(request.error);
      }),
  );
}

function putAll<T extends { localId: string }>(store: "jobs" | "requests", rows: T[]) {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        const objectStore = tx.objectStore(store);
        objectStore.clear();
        for (const row of rows) objectStore.put(row);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
  );
}

export function loadPocketJobs() {
  return all<PocketJob>("jobs");
}

export function savePocketJobs(rows: PocketJob[]) {
  return putAll("jobs", rows);
}

export function loadPocketRequests() {
  return all<PocketRequest>("requests");
}

export function savePocketRequests(rows: PocketRequest[]) {
  return putAll("requests", rows);
}

export function newLocalId() {
  return crypto.randomUUID();
}
