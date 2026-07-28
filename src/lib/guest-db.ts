"use client";

export type GuestTask = {
  localId: string; deviceId: string; title: string; createdAt: string; updatedAt: string; importedAt?: string;
};
export type GuestItem = {
  localId: string; deviceId: string; taskLocalId: string; date: string; title: string;
  status: "planned" | "completed"; dailyGoalMinutes: number | null; completedAt: string | null;
  dismissedAt?: string | null; createdAt: string; updatedAt: string; importedAt?: string;
};
export type GuestSession = {
  localId: string; deviceId: string; itemLocalId: string; startedAt: string; endedAt: string | null;
  durationSeconds: number | null; createdAt: string; updatedAt: string; importedAt?: string;
};
export type GuestBundle = { version: 1; deviceId: string; tasks: GuestTask[]; items: GuestItem[]; sessions: GuestSession[] };

const DB_NAME = "workday-local";
const DB_VERSION = 1;

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ["tasks", "items", "sessions", "meta"]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: name === "meta" ? "key" : "localId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store<T>(name: string, mode: IDBTransactionMode, operation: (objectStore: IDBObjectStore) => IDBRequest<T>) {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const request = operation(tx.objectStore(name));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDeviceId() {
  const existing = await store<{ key: string; value: string } | undefined>("meta", "readonly", objectStore => objectStore.get("deviceId"));
  if (existing?.value) return existing.value;
  const value = crypto.randomUUID();
  await store("meta", "readwrite", objectStore => objectStore.put({ key: "deviceId", value }));
  return value;
}

export async function getAll<T>(name: "tasks" | "items" | "sessions") {
  return store<T[]>(name, "readonly", objectStore => objectStore.getAll());
}

export async function putGuest<T>(name: "tasks" | "items" | "sessions", value: T) {
  await store(name, "readwrite", objectStore => objectStore.put(value));
}

export async function deleteGuest(name: "tasks" | "items" | "sessions", localId: string) {
  await store(name, "readwrite", objectStore => objectStore.delete(localId));
}

export async function exportGuestBundle(): Promise<GuestBundle> {
  const [deviceId, tasks, items, sessions] = await Promise.all([
    getDeviceId(), getAll<GuestTask>("tasks"), getAll<GuestItem>("items"), getAll<GuestSession>("sessions"),
  ]);
  return { version: 1, deviceId, tasks, items, sessions };
}

export async function markBundleImported(importedAt: string) {
  const bundle = await exportGuestBundle();
  await Promise.all([
    ...bundle.tasks.map(record => putGuest("tasks", { ...record, importedAt })),
    ...bundle.items.map(record => putGuest("items", { ...record, importedAt })),
    ...bundle.sessions.map(record => putGuest("sessions", { ...record, importedAt })),
  ]);
}
