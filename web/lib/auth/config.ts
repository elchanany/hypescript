// Auth is OPTIONAL. Without these env vars the editor works exactly as before
// (local IndexedDB only). Never throw at import time — crash-free boot.

export type PublicKeyKind =
  | "publishable"
  | "jwt_anon"
  | "jwt_service_role"
  | "secret"
  | "unknown"
  | "empty";

export interface AuthDiagnostics {
  configured: boolean;
  urlHost: string | null;
  keyKind: PublicKeyKind;
  keyLen: number;
  /** Safe hint only — never the key itself. */
  issue: string | null;
}

/** Strip whitespace / wrapping quotes that break Supabase "apikey". */
export function sanitizeEnvValue(raw: string): string {
  let v = (raw || "").trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  // Vercel / copy-paste sometimes keeps a trailing newline mid-value
  v = v.replace(/\s+/g, "");
  return v;
}

/**
 * Normalize Project URL from env.
 * Users sometimes paste the Data API URL (`…/rest/v1`) or a trailing slash.
 */
export function normalizeSupabaseUrl(raw: string): string {
  let url = sanitizeEnvValue(raw).replace(/\/+$/, "");
  url = url.replace(/\/rest\/v1$/i, "");
  url = url.replace(/\/auth\/v1$/i, "");
  url = url.replace(/\/+$/, "");
  return url;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob in browser; Buffer in Node
    const json =
      typeof atob === "function"
        ? atob(pad)
        : Buffer.from(pad, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function classifyPublicKey(raw: string): PublicKeyKind {
  const key = sanitizeEnvValue(raw);
  if (!key) return "empty";
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.split(".").length === 3) {
    const payload = decodeJwtPayload(key);
    const role = typeof payload?.role === "string" ? payload.role : "";
    if (role === "service_role") return "jwt_service_role";
    if (role === "anon" || role === "authenticated") return "jwt_anon";
    return "unknown";
  }
  return "unknown";
}

export function getRawPublicKey(): string {
  // Prefer explicit publishable alias when present.
  const publishable = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "");
  const anon = sanitizeEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
  return publishable || anon;
}

export function getAuthDiagnostics(): AuthDiagnostics {
  const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  const key = getRawPublicKey();
  const keyKind = classifyPublicKey(key);
  let urlHost: string | null = null;
  try {
    if (url) urlHost = new URL(url).host;
  } catch {
    urlHost = null;
  }

  let issue: string | null = null;
  if (!url && !key) issue = "missing_both";
  else if (!url) issue = "missing_url";
  else if (!key) issue = "missing_key";
  else if (!urlHost || !url.startsWith("https://")) issue = "bad_url";
  else if (keyKind === "jwt_service_role" || keyKind === "secret") issue = "secret_used_as_public";
  else if (keyKind === "unknown") issue = "key_format_unknown";
  else if (keyLenTooShort(key, keyKind)) issue = "key_too_short";

  const configured =
    !!url &&
    !!key &&
    !issue;

  return {
    configured,
    urlHost,
    keyKind,
    keyLen: key.length,
    issue: configured ? null : issue,
  };
}

function keyLenTooShort(key: string, kind: PublicKeyKind): boolean {
  if (kind === "publishable") return key.length < 20;
  if (kind === "jwt_anon") return key.length < 80;
  return false;
}

export function isAuthConfigured(): boolean {
  return getAuthDiagnostics().configured;
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const diag = getAuthDiagnostics();
  if (!diag.configured) return null;
  return {
    url: normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
    anonKey: getRawPublicKey(),
  };
}

export function authIssueMessage(issue: string | null): string | null {
  switch (issue) {
    case "missing_both":
    case "missing_url":
    case "missing_key":
      return "התחברות לא מוגדרת — חסר URL או מפתח Supabase ב-Vercel.";
    case "bad_url":
      return "כתובת Supabase לא תקינה. צריך https://xxxx.supabase.co בלי /rest/v1.";
    case "secret_used_as_public":
      return "הוזן מפתח Secret/service_role במקום Publishable/anon. החלף ב-Vercel ל-Publishable key בלבד ב־NEXT_PUBLIC_SUPABASE_ANON_KEY.";
    case "key_format_unknown":
    case "key_too_short":
      return "מפתח ה-API נראה לא תקין (קטוע / עם תווים מיותרים). הדבק מחדש Publishable או anon legacy מ-Supabase → API Keys.";
    default:
      return null;
  }
}
