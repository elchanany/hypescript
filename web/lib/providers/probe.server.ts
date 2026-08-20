// Live provider probes — SERVER ONLY. Actually calls each provider's API so the UI can
// say "ready" / "unhealthy" instead of guessing from "the env var exists".
// Never returns key material: only masked fingerprints, status and quota.

export type ProbeStatus = "ready" | "unhealthy" | "missing_key";

export interface ProbeResult {
  id: string;
  label: string;
  status: ProbeStatus;
  httpStatus?: number;
  /** Hebrew, user-facing. Safe to display. */
  detailHe: string;
  /** Present when the provider reports usage. */
  quota?: { tier?: string; used?: number; limit?: number; pctUsed?: number };
  keyFingerprint?: string; // e.g. "sk_499…fe88" — enough to tell two keys apart, never usable
  latencyMs: number;
  checkedAt: string;
}

const TIMEOUT_MS = 10000;

function fingerprint(key: string): string {
  if (key.length < 10) return `len=${key.length}`;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

async function timedFetch(url: string, init: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try { return await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" }); }
  finally { clearTimeout(to); }
}

function httpDetailHe(status: number, body: string): string {
  const snip = body.slice(0, 160).replace(/\s+/g, " ");
  if (status === 401) return `המפתח נדחה (401) — שגוי, הוחלף או שפג תוקפו. ${snip}`;
  if (status === 403) return `אין הרשאה (403) — למפתח חסרות הרשאות או שהחשבון חסום. ${snip}`;
  if (status === 429) return `חריגה ממכסה או מקצב (429). ${snip}`;
  if (status >= 500) return `תקלה זמנית אצל הספק (${status}). ${snip}`;
  return `שגיאה ${status}: ${snip}`;
}

type Probe = (key: string) => Promise<Omit<ProbeResult, "id" | "label" | "latencyMs" | "checkedAt" | "keyFingerprint">>;

/** GET a URL and treat 2xx as healthy. Used by the OpenAI-compatible providers. */
function simpleProbe(url: string, headers: (k: string) => Record<string, string>): Probe {
  return async (key) => {
    const r = await timedFetch(url, { headers: headers(key) });
    if (r.ok) return { status: "ready", httpStatus: r.status, detailHe: "מחובר ופעיל" };
    return { status: "unhealthy", httpStatus: r.status, detailHe: httpDetailHe(r.status, await r.text()) };
  };
}

const elevenLabsProbe: Probe = async (key) => {
  const r = await timedFetch("https://api.elevenlabs.io/v1/user", { headers: { "xi-api-key": key } });
  if (!r.ok) return { status: "unhealthy", httpStatus: r.status, detailHe: httpDetailHe(r.status, await r.text()) };
  const body = (await r.json()) as any;
  const sub = body?.subscription || {};
  const used = Number(sub.character_count ?? 0);
  const limit = Number(sub.character_limit ?? 0);
  const pctUsed = limit > 0 ? Math.round((used / limit) * 100) : undefined;
  const tier = String(sub.tier ?? "");
  const quota = { tier, used, limit, pctUsed };
  // A valid key that is out of quota will fail real work -> report it as unhealthy.
  if (limit > 0 && used >= limit) {
    return { status: "unhealthy", httpStatus: r.status, quota, detailHe: `המכסה נוצלה במלואה (${used}/${limit}, מסלול ${tier}). התמלול ייכשל עד לחידוש או שדרוג.` };
  }
  const warn = pctUsed != null && pctUsed >= 80 ? ` — שים לב: נוצלו ${pctUsed}% מהמכסה` : "";
  return { status: "ready", httpStatus: r.status, quota, detailHe: `מחובר ופעיל (מסלול ${tier}, ${used}/${limit} תווים)${warn}` };
};

interface ProviderProbeDef { id: string; label: string; envKeys: string[]; probe: Probe; }

export const PROVIDER_PROBES: ProviderProbeDef[] = [
  { id: "elevenlabs", label: "ElevenLabs", envKeys: ["ELEVENLABS_API_KEY"], probe: elevenLabsProbe },
  { id: "groq", label: "Groq", envKeys: ["GROQ_API_KEY"], probe: simpleProbe("https://api.groq.com/openai/v1/models", (k) => ({ Authorization: `Bearer ${k}` })) },
  { id: "openai", label: "OpenAI", envKeys: ["OPENAI_API_KEY"], probe: simpleProbe("https://api.openai.com/v1/models", (k) => ({ Authorization: `Bearer ${k}` })) },
  { id: "deepseek", label: "DeepSeek", envKeys: ["DEEPSEEK_API_KEY"], probe: simpleProbe("https://api.deepseek.com/models", (k) => ({ Authorization: `Bearer ${k}` })) },
  { id: "anthropic", label: "Anthropic", envKeys: ["ANTHROPIC_API_KEY"], probe: simpleProbe("https://api.anthropic.com/v1/models", (k) => ({ "x-api-key": k, "anthropic-version": "2023-06-01" })) },
  { id: "gemini", label: "Google Gemini", envKeys: ["GEMINI_API_KEY"], probe: async (key) => {
    const r = await timedFetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`, {});
    if (r.ok) return { status: "ready", httpStatus: r.status, detailHe: "מחובר ופעיל" };
    return { status: "unhealthy", httpStatus: r.status, detailHe: httpDetailHe(r.status, await r.text()) };
  } },
];

export async function probeProvider(def: ProviderProbeDef): Promise<ProbeResult> {
  const started = Date.now();
  const base = { id: def.id, label: def.label, checkedAt: new Date().toISOString() };
  const key = def.envKeys.map((k) => (process.env[k] || "").trim()).find(Boolean) || "";
  if (!key) {
    return { ...base, status: "missing_key", detailHe: `לא הוגדר מפתח (${def.envKeys.join(" / ")})`, latencyMs: 0 };
  }
  try {
    const res = await def.probe(key);
    return { ...base, ...res, keyFingerprint: fingerprint(key), latencyMs: Date.now() - started };
  } catch (e: any) {
    const aborted = e?.name === "AbortError";
    return {
      ...base, status: "unhealthy", keyFingerprint: fingerprint(key), latencyMs: Date.now() - started,
      detailHe: aborted ? `הספק לא הגיב תוך ${TIMEOUT_MS / 1000} שניות` : `שגיאת רשת: ${String(e?.message || e).slice(0, 160)}`,
    };
  }
}

export async function probeAllProviders(): Promise<ProbeResult[]> {
  return Promise.all(PROVIDER_PROBES.map(probeProvider));
}
