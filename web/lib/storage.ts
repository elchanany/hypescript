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

export async function purgeAllLocalData(): Promise<void> {
  await kvClear();
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("hs_") || k.startsWith("hypescript_") || k === "projects" || k === "currentProjectId")) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch { /* ignore */ }
  }
}

// --- ניהול פרויקטים מרובים ---
// כל פרויקט מחזיק בנפרד: מדיה, מצב עריכה ושיחה, תחת מפתחות p:<id>:<key>.
export interface ProjectMeta { id: string; name: string; updatedAt: number; }
const IDX = "projects";
const CUR = "currentProjectId";

export const pk = (id: string, key: string) => `p:${id}:${key}`;

export async function listProjects(): Promise<ProjectMeta[]> {
  let list = (await kvGet<ProjectMeta[]>(IDX)) || [];
  if ((!list || list.length === 0) && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("hs_projects_mirror");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
          await kvSet(IDX, list);
        }
      }
    } catch { /* ignore */ }
  }
  return list;
}

export async function getCurrentProjectId(): Promise<string | null> {
  let id = await kvGet<string>(CUR);
  if (!id && typeof window !== "undefined") {
    try {
      id = localStorage.getItem("hs_current_project_mirror");
    } catch { /* ignore */ }
  }
  return id;
}

export async function setCurrentProject(id: string): Promise<void> {
  await kvSet(CUR, id);
  if (typeof window !== "undefined") {
    try {
      if (id) localStorage.setItem("hs_current_project_mirror", id);
      else localStorage.removeItem("hs_current_project_mirror");
    } catch { /* ignore */ }
  }
}

export async function createProject(name: string): Promise<string> {
  const id = "prj_" + Math.random().toString(36).slice(2, 9);
  const list = await listProjects();
  list.unshift({ id, name, updatedAt: Date.now() });
  await kvSet(IDX, list);
  if (typeof window !== "undefined") {
    try { localStorage.setItem("hs_projects_mirror", JSON.stringify(list)); } catch { /* ignore */ }
  }
  await setCurrentProject(id);
  return id;
}

export async function renameProject(id: string, name: string): Promise<void> {
  const list = await listProjects();
  const p = list.find((x) => x.id === id);
  if (p) {
    p.name = name;
    p.updatedAt = Date.now();
    await kvSet(IDX, list);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("hs_projects_mirror", JSON.stringify(list)); } catch { /* ignore */ }
    }
  }
}

export async function deleteProject(id: string): Promise<void> {
  const list = (await listProjects()).filter((x) => x.id !== id);
  await kvSet(IDX, list);
  if (typeof window !== "undefined") {
    try { localStorage.setItem("hs_projects_mirror", JSON.stringify(list)); } catch { /* ignore */ }
  }
  await kvSet(pk(id, "media"), null);
  await kvSet(pk(id, "state"), null);
  await kvSet(pk(id, "chat"), null);
  if ((await getCurrentProjectId()) === id) await setCurrentProject(list[0]?.id || "");
}

export async function touchProject(id: string): Promise<void> {
  const list = await listProjects();
  const p = list.find((x) => x.id === id);
  if (p) {
    p.updatedAt = Date.now();
    await kvSet(IDX, list);
    if (typeof window !== "undefined") {
      try { localStorage.setItem("hs_projects_mirror", JSON.stringify(list)); } catch { /* ignore */ }
    }
  }
}

// מחזיר פרויקט נוכחי תקין, יוצר ראשון אם אין. גם מהגר סשן ישן (media/state/chat גלובליים).
export async function ensureProject(): Promise<string> {
  const cur = await getCurrentProjectId();
  const list = await listProjects();
  if (cur && list.some((p) => p.id === cur)) return cur;
  if (list.length) {
    await setCurrentProject(list[0].id);
    return list[0].id;
  }
  const id = await createProject("פרויקט 1");
  // מיגרציה: אם קיים סשן ישן בשורש — נעביר לפרויקט הראשון.
  for (const k of ["media", "state", "chat"] as const) {
    const old = await kvGet(k);
    if (old != null) { await kvSet(pk(id, k), old); await kvSet(k, null); }
  }
  return id;
}
