import { emptyWorkspace, type Workspace } from "./knowledge";

type Stored = { workspace: Workspace; revision: number };
let connection: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (!connection) {
    connection = new Promise((resolve, reject) => {
      const request = indexedDB.open("nexus-local", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); connection = undefined; };
        resolve(request.result);
      };
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("Database upgrade blocked"));
    });
    connection.catch(() => { connection = undefined; });
  }
  return connection;
}

export async function loadLocal(): Promise<Stored> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction("state").objectStore("state").get("workspace");
    request.onsuccess = () => resolve(request.result ?? { workspace: emptyWorkspace, revision: 0 });
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocal(workspace: Workspace, expectedRevision: number): Promise<Stored | null> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("state", "readwrite");
    const store = tx.objectStore("state");
    const current = store.get("workspace");
    let saved: Stored | null = null;
    current.onsuccess = () => {
      if ((current.result?.revision ?? 0) !== expectedRevision) return;
      saved = { workspace, revision: expectedRevision + 1 };
      store.put(saved, "workspace");
    };
    tx.oncomplete = () => resolve(saved);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}
