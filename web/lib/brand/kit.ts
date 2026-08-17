// Brand kit — local-first organization-like brand profile, shared across projects.
//
// Everything lives in the device's IndexedDB (via the existing kvGet/kvSet global
// keys) and NEVER leaves the browser: binary assets are stored as Blobs, and any
// summary handed to the LLM deliberately strips blobs/data URLs so no binary
// payload ever enters the chat history or the agent API call.
//
// The storage adapter is injected (default = the app's IndexedDB kv) so the pure
// CRUD/normalization logic is unit-testable in node without an indexedDB shim.

import { kvGet, kvSet } from "@/lib/storage";

export const BRAND_KIT_VERSION = 1 as const;

export type BrandAssetRole = "logo" | "reference";

/** A binary asset inside a brand kit. `blob` is IndexedDB-only. */
export interface BrandAssetMeta {
  id: string;
  name: string;
  role: BrandAssetRole;
  mime: string;
  width?: number;
  height?: number;
  blob: Blob;
}

/** Versioned, normalized brand kit contract. */
export interface BrandKit {
  version: 1;
  id: string;
  /** Organization / kit name. */
  organization: string;
  tagline?: string;
  /** Writing/formulation guidelines (Hebrew expected). */
  writingGuidelines: string;
  /** Normalized unique lowercase hex colors (#rrggbb). */
  colors: string[];
  assets: BrandAssetMeta[];
  createdAt: number;
  updatedAt: number;
}

export interface BrandKitInput {
  organization?: string;
  tagline?: string;
  writingGuidelines?: string;
  colors?: string[];
  assets?: BrandAssetMeta[];
}

// ─── kv adapter (isolated so node tests run without IndexedDB) ───────────────

export interface BrandKv {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
}

export const defaultBrandKv: BrandKv = { get: kvGet, set: kvSet };

// ─── IndexedDB global keys (reuse the app-wide kv store; blobs stay in IDB) ───

export const BRAND_KITS_KEY = "brand.kits";
export const BRAND_ACTIVE_KEY = "brand.active";
export const brandKitKey = (id: string) => `brand.kit:${id}`;

export interface BrandKitIndexEntry {
  id: string;
  organization: string;
  updatedAt: number;
}

// ─── pure helpers ─────────────────────────────────────────────────────────────

function uidBrand(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

/** Accepts "#fff", "fff", "#A1B2C3" → normalized lowercase "#rrggbb". */
export function normalizeHexColor(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let h = raw.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-f]{6}$/.test(h) ? `#${h}` : null;
}

/** Unique, valid, lowercase hex colors only — drops anything else. */
export function normalizeColors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const c of raw) {
    const n = normalizeHexColor(c);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

function normalizeName(raw: unknown, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.slice(0, 120) || fallback;
}

/** Keeps only well-formed assets that carry a real Blob payload. */
export function normalizeAssets(raw: unknown): BrandAssetMeta[] {
  if (!Array.isArray(raw)) return [];
  const out: BrandAssetMeta[] = [];
  for (const a of raw) {
    if (!a || typeof a !== "object") continue;
    const rec = a as Record<string, unknown>;
    if (!(rec.blob instanceof Blob)) continue; // no payload → unusable, drop defensively
    const role: BrandAssetRole = rec.role === "logo" ? "logo" : "reference";
    const name = typeof rec.name === "string" && rec.name.trim() ? rec.name.trim().slice(0, 200) : `asset-${out.length + 1}`;
    const mime = typeof rec.mime === "string" && rec.mime ? rec.mime : (rec.blob as Blob).type || "application/octet-stream";
    const width = typeof rec.width === "number" && Number.isFinite(rec.width) && rec.width > 0 ? Math.round(rec.width) : undefined;
    const height = typeof rec.height === "number" && Number.isFinite(rec.height) && rec.height > 0 ? Math.round(rec.height) : undefined;
    out.push({
      id: typeof rec.id === "string" && rec.id ? rec.id : uidBrand("ba"),
      name,
      role,
      mime,
      ...(width != null ? { width } : {}),
      ...(height != null ? { height } : {}),
      blob: rec.blob as Blob,
    });
  }
  return out;
}

/**
 * Parse a stored record defensively. Returns null for unusable records (missing
 * id/organization), recovers valid assets/colors, drops the rest. Legacy records
 * without a version are normalized into the current versioned shape.
 */
export function sanitizeBrandKit(raw: unknown): BrandKit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id ? r.id : null;
  const organization = typeof r.organization === "string" && r.organization.trim() ? r.organization.trim().slice(0, 120) : null;
  if (!id || !organization) return null;
  const now = Date.now();
  return {
    version: BRAND_KIT_VERSION,
    id,
    organization,
    tagline: typeof r.tagline === "string" && r.tagline.trim() ? r.tagline.trim().slice(0, 300) : undefined,
    writingGuidelines: typeof r.writingGuidelines === "string" ? r.writingGuidelines.slice(0, 2000) : "",
    colors: normalizeColors(r.colors),
    assets: normalizeAssets(r.assets),
    createdAt: typeof r.createdAt === "number" && Number.isFinite(r.createdAt) ? r.createdAt : now,
    updatedAt: typeof r.updatedAt === "number" && Number.isFinite(r.updatedAt) ? r.updatedAt : now,
  };
}

// ─── LLM-safe summaries (never contain blobs / data URLs) ─────────────────────

export interface BrandAssetSummary {
  id: string;
  name: string;
  role: BrandAssetRole;
  mime: string;
  width?: number;
  height?: number;
}

export interface BrandKitSummary {
  id: string;
  organization: string;
  tagline?: string;
  writingGuidelines: string;
  colors: string[];
  assets: BrandAssetSummary[];
  updatedAt: number;
}

/** Concise, binary-free summary — the only shape allowed to reach the LLM. */
export function summarizeBrandKit(kit: BrandKit): BrandKitSummary {
  return {
    id: kit.id,
    organization: kit.organization,
    ...(kit.tagline ? { tagline: kit.tagline } : {}),
    writingGuidelines: kit.writingGuidelines,
    colors: [...kit.colors],
    assets: kit.assets.map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role,
      mime: a.mime,
      ...(a.width != null && a.width > 0 ? { width: a.width } : {}),
      ...(a.height != null && a.height > 0 ? { height: a.height } : {}),
    })),
    updatedAt: kit.updatedAt,
  };
}

/** Hebrew one-block prompt snippet for the agent, built from a summary only. */
export function brandKitPrompt(summary: BrandKitSummary): string {
  const lines: string[] = [`ערכת מותג: ${summary.organization}`];
  if (summary.tagline) lines.push(`סלוגן: ${summary.tagline}`);
  if (summary.colors.length) lines.push(`פלטת צבעים: ${summary.colors.join(" · ")}`);
  if (summary.writingGuidelines.trim()) lines.push(`הנחיות ניסוח:\n${summary.writingGuidelines.trim()}`);
  if (summary.assets.length) {
    lines.push("נכסים זמינים (id/שם/תפקיד):");
    for (const a of summary.assets) {
      const dims = a.width && a.height ? ` (${a.width}×${a.height})` : "";
      lines.push(`• id=${a.id} — ${a.name} [${a.role === "logo" ? "לוגו" : "ייחוס"}] (${a.mime}${dims})`);
    }
  }
  return lines.join("\n");
}

// ─── CRUD / active-kit (IndexedDB-backed) ─────────────────────────────────────

export async function listBrandKits(adapter: BrandKv = defaultBrandKv): Promise<BrandKitIndexEntry[]> {
  const raw = await adapter.get<unknown>(BRAND_KITS_KEY);
  if (!Array.isArray(raw)) return [];
  const out: BrandKitIndexEntry[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    if (typeof rec.id !== "string" || !rec.id) continue; // skip malformed index rows
    out.push({
      id: rec.id,
      organization: normalizeName(rec.organization, "ללא שם"),
      updatedAt: typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt) ? rec.updatedAt : 0,
    });
  }
  return out;
}

export async function getBrandKit(id: string, adapter: BrandKv = defaultBrandKv): Promise<BrandKit | null> {
  if (!id) return null;
  return sanitizeBrandKit(await adapter.get<unknown>(brandKitKey(id)));
}

async function writeIndex(entries: BrandKitIndexEntry[], adapter: BrandKv): Promise<void> {
  await adapter.set(BRAND_KITS_KEY, entries);
}

export async function createBrandKit(input: BrandKitInput, adapter: BrandKv = defaultBrandKv): Promise<BrandKit> {
  const now = Date.now();
  const kit: BrandKit = {
    version: BRAND_KIT_VERSION,
    id: uidBrand("kit"),
    organization: normalizeName(input.organization, "ארגון ללא שם"),
    ...(input.tagline && String(input.tagline).trim() ? { tagline: String(input.tagline).trim().slice(0, 300) } : {}),
    writingGuidelines: typeof input.writingGuidelines === "string" ? input.writingGuidelines.slice(0, 2000) : "",
    colors: normalizeColors(input.colors),
    assets: normalizeAssets(input.assets),
    createdAt: now,
    updatedAt: now,
  };
  await adapter.set(brandKitKey(kit.id), kit);
  const index = await listBrandKits(adapter);
  index.unshift({ id: kit.id, organization: kit.organization, updatedAt: now });
  await writeIndex(index, adapter);
  return kit;
}

export async function updateBrandKit(
  id: string,
  patch: BrandKitInput,
  adapter: BrandKv = defaultBrandKv,
): Promise<BrandKit | null> {
  const existing = await getBrandKit(id, adapter);
  if (!existing) return null;
  const next: BrandKit = {
    ...existing,
    organization: patch.organization != null ? normalizeName(patch.organization, existing.organization) : existing.organization,
    ...(patch.tagline != null
      ? (String(patch.tagline).trim().slice(0, 300) ? { tagline: String(patch.tagline).trim().slice(0, 300) } : {})
      : existing.tagline ? { tagline: existing.tagline } : {}),
    writingGuidelines: patch.writingGuidelines != null ? String(patch.writingGuidelines).slice(0, 2000) : existing.writingGuidelines,
    colors: patch.colors != null ? normalizeColors(patch.colors) : existing.colors,
    assets: patch.assets != null ? normalizeAssets(patch.assets) : existing.assets,
    updatedAt: Date.now(),
  };
  await adapter.set(brandKitKey(id), next);
  const index = await listBrandKits(adapter);
  const entry = index.find((e) => e.id === id);
  if (entry) {
    entry.organization = next.organization;
    entry.updatedAt = next.updatedAt;
  }
  await writeIndex(index, adapter);
  return next;
}

export async function deleteBrandKit(id: string, adapter: BrandKv = defaultBrandKv): Promise<boolean> {
  const index = await listBrandKits(adapter);
  if (!index.some((e) => e.id === id)) return false;
  const next = index.filter((e) => e.id !== id);
  await writeIndex(next, adapter);
  await adapter.set(brandKitKey(id), null);
  const active = await adapter.get<string>(BRAND_ACTIVE_KEY);
  if (active === id) {
    // active kit deleted → fall back to the first remaining kit, else clear.
    await adapter.set(BRAND_ACTIVE_KEY, next[0]?.id ?? null);
  }
  return true;
}

export async function getActiveBrandKitId(adapter: BrandKv = defaultBrandKv): Promise<string | null> {
  const active = await adapter.get<string>(BRAND_ACTIVE_KEY);
  return typeof active === "string" && active ? active : null;
}

export async function getActiveBrandKit(adapter: BrandKv = defaultBrandKv): Promise<BrandKit | null> {
  const activeId = await getActiveBrandKitId(adapter);
  if (!activeId) return null;
  const kit = await getBrandKit(activeId, adapter);
  if (kit) return kit;
  // Stale active pointer (kit was removed out-of-band) → repair by clearing;
  // never auto-activate a kit the user didn't choose.
  await adapter.set(BRAND_ACTIVE_KEY, null);
  return null;
}

/** Returns the new active id, or null when the requested kit does not exist. */
export async function setActiveBrandKit(id: string, adapter: BrandKv = defaultBrandKv): Promise<string | null> {
  const kit = await getBrandKit(id, adapter);
  if (!kit) return null;
  await adapter.set(BRAND_ACTIVE_KEY, id);
  if (typeof window !== "undefined") {
    void syncActiveBrandKitToCloud(kit);
  }
  return id;
}

export async function syncActiveBrandKitToCloud(kit: BrandKit | null): Promise<void> {
  if (typeof window === "undefined" || !kit) return;
  try {
    const summary = summarizeBrandKit(kit);
    await fetch("/api/cloud/brand", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kit: summary }),
    }).catch(() => {});
  } catch {
    // Local-first non-blocking fallback
  }
}
