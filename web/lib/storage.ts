// אחסון מקומי מתמשך (IndexedDB) — שומר את הסשן כך שרענון משחזר הכל:
// קבצי מדיה (Blobs), מצב הפרויקט (קליפים/כתוביות/תמלול) ושיחת הסוכן.
// IndexedDB, בניגוד ל-localStorage, יכול להחזיק את קובצי הווידאו עצמם.

"use client";

const DB_NAME = "hypescript";
const STORE = "kv";

function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function kvSet(key: string, val: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const r = db.transaction(STORE, "readwrite").objectStore(STORE).put(val, key);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    });
  } catch { /* quota/private-mode — לא קריטי */ }
}

export async function kvGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return await new Promise<T | null>((res) => {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      r.onsuccess = () => res((r.result as T) ?? null);
      r.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function kvClear(): Promise<void> {
  try {
    const db = await openDB();
    db.transaction(STORE, "readwrite").objectStore(STORE).clear();
  } catch { /* ignore */ }
}
