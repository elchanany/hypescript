// חיפוש מדיה חופשית (stock) מארבעה ספקים: Pexels, Pixabay, Unsplash, Freesound.
// המפתחות נשמרים ב-env בצד השרת בלבד ולעולם לא נכללים בתשובות.
// שגיאות נזרקות כ-StockError עם קוד קטלוגי (ראו web/lib/errors/messages.ts).

export type StockProvider = "pexels" | "pixabay" | "unsplash" | "freesound";
export type StockKind = "video" | "photo" | "audio";

export interface StockItem {
  provider: StockProvider;
  kind: StockKind;
  id: string;
  title: string;
  downloadUrl: string;
  previewUrl: string;
  width?: number;
  height?: number;
  durationSec?: number;
  author: string;
  license: string;
  attribution: string;
}

export type StockErrorCode =
  | "stock_not_configured"
  | "stock_search_failed"
  | "stock_bad_request";

export class StockError extends Error {
  readonly code: StockErrorCode;

  constructor(code: StockErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "StockError";
    this.code = code;
  }
}

const STOCK_PROVIDERS: readonly StockProvider[] = ["pexels", "pixabay", "unsplash", "freesound"];

export const STOCK_PROVIDER_KINDS: Record<StockProvider, readonly StockKind[]> = {
  pexels: ["video", "photo"],
  pixabay: ["photo", "video"],
  unsplash: ["photo"],
  freesound: ["audio"],
};

export const MAX_STOCK_PER_PAGE = 24;
const DEFAULT_STOCK_PER_PAGE = 12;

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function requireEnv(provider: StockProvider): string {
  const name =
    provider === "pexels"
      ? "PEXELS_API_KEY"
      : provider === "pixabay"
        ? "PIXABAY_API_KEY"
        : provider === "unsplash"
          ? "UNSPLASH_ACCESS_KEY"
          : "FREESOUND_API_KEY";
  const value = env(name);
  if (!value) throw new StockError("stock_not_configured", name);
  return value;
}

export function parseStockProvider(value: unknown): StockProvider | null {
  return typeof value === "string" && (STOCK_PROVIDERS as readonly string[]).includes(value)
    ? (value as StockProvider)
    : null;
}

export function isKindSupported(provider: StockProvider, kind: unknown): kind is StockKind {
  return (
    typeof kind === "string" && (STOCK_PROVIDER_KINDS[provider] as readonly string[]).includes(kind)
  );
}

/** per_page מוגבל ל-1..MAX_STOCK_PER_PAGE (24). */
export function clampStockPerPage(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return DEFAULT_STOCK_PER_PAGE;
  return Math.min(MAX_STOCK_PER_PAGE, Math.max(1, Math.floor(n)));
}

// --- הרשאת הורדה: רשימת hostnames מדויקת לכל ספק (הגנת SSRF) -------------

// pixabay.com/get — רק תחת הנתיב /get. שאר ה-hosts: התאמה מדויקת.
export const STOCK_DOWNLOAD_HOST_RULES: Record<StockProvider, readonly string[]> = {
  pexels: ["videos.pexels.com", "images.pexels.com"],
  pixabay: ["cdn.pixabay.com", "pixabay.com/get"],
  unsplash: ["images.unsplash.com"],
  freesound: ["cdn.freesound.org"],
};

export function isAllowedStockDownloadUrl(provider: StockProvider, rawUrl: string): boolean {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  return STOCK_DOWNLOAD_HOST_RULES[provider].some((rule) => {
    const slash = rule.indexOf("/");
    const host = slash < 0 ? rule : rule.slice(0, slash);
    const pathPrefix = slash < 0 ? "" : rule.slice(slash);
    return url.hostname === host && url.pathname.startsWith(pathPrefix);
  });
}

export function assertAllowedStockDownloadUrl(provider: StockProvider, rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new StockError("stock_bad_request");
  }
  if (!isAllowedStockDownloadUrl(provider, rawUrl)) {
    throw new StockError("stock_bad_request", url.hostname);
  }
  return url;
}

async function fetchJson(url: string, headers: Record<string, string>): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err: unknown) {
    throw new StockError("stock_search_failed", err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) {
    // מנקה פירוט שעלול להכיל סודות — מוחזר רק קוד HTTP.
    throw new StockError("stock_search_failed", `HTTP ${res.status}`);
  }
  try {
    return await res.json();
  } catch {
    throw new StockError("stock_search_failed");
  }
}

// --- Pexels ----------------------------------------------------------------

function pickPexelsVideoFile(files: any[]): any | undefined {
  const usable = files.filter((f) => f?.link);
  if (!usable.length) return undefined;
  const withinHd = usable.filter((f) => (Number(f.width) || 0) <= 1920);
  const pool = withinHd.length ? withinHd : usable;
  return pool.reduce((a, b) => ((Number(a.width) || 0) >= (Number(b.width) || 0) ? a : b));
}

async function searchPexels(kind: StockKind, query: string, perPage: number): Promise<StockItem[]> {
  const key = requireEnv("pexels");
  const base =
    kind === "video" ? "https://api.pexels.com/videos/search" : "https://api.pexels.com/v1/search";
  const url = `${base}?query=${encodeURIComponent(query)}&per_page=${perPage}`;
  const data = await fetchJson(url, { Authorization: key });
  const rows: any[] = Array.isArray(data?.[kind === "video" ? "videos" : "photos"])
    ? data[kind === "video" ? "videos" : "photos"]
    : [];
  const items: StockItem[] = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const author = String(row.user?.name || row.photographer || "").trim();
    if (kind === "video") {
      const file = pickPexelsVideoFile(row.video_files || []);
      if (!file) continue;
      items.push({
        provider: "pexels",
        kind,
        id: String(row.id),
        title: String(row.url || author || "Pexels video"),
        downloadUrl: file.link,
        previewUrl: String(row.image || file.link),
        width: Number(file.width) || undefined,
        height: Number(file.height) || undefined,
        durationSec: Number(row.duration) || undefined,
        author,
        license: "Pexels License",
        attribution: `${author} @ Pexels`,
      });
    } else {
      const original = row.src?.original;
      if (!original) continue;
      items.push({
        provider: "pexels",
        kind,
        id: String(row.id),
        title: String(row.alt || author || "Pexels photo"),
        downloadUrl: original,
        previewUrl: String(row.src.medium || row.src.tiny || original),
        width: Number(row.width) || undefined,
        height: Number(row.height) || undefined,
        author,
        license: "Pexels License",
        attribution: `${author} @ Pexels`,
      });
    }
  }
  return items;
}

// --- Pixabay ---------------------------------------------------------------

async function searchPixabay(kind: StockKind, query: string, perPage: number): Promise<StockItem[]> {
  const key = requireEnv("pixabay");
  const endpoint = kind === "video" ? "https://pixabay.com/api/videos/" : "https://pixabay.com/api/";
  const url = `${endpoint}?key=${encodeURIComponent(key)}&q=${encodeURIComponent(
    query,
  )}&per_page=${perPage}&safesearch=true`;
  const data = await fetchJson(url, {});
  const rows: any[] = Array.isArray(data?.hits) ? data.hits : [];
  const items: StockItem[] = [];
  for (const row of rows) {
    if (!row?.id) continue;
    const title = String(row.tags || `Pixabay ${kind}`);
    const author = String(row.user || "").trim();
    if (kind === "video") {
      const file = row.videos?.large || row.videos?.medium || row.videos?.small || row.videos?.tiny;
      if (!file?.url) continue;
      items.push({
        provider: "pixabay",
        kind,
        id: String(row.id),
        title,
        downloadUrl: file.url,
        previewUrl: String(file.url),
        width: Number(file.width) || undefined,
        height: Number(file.height) || undefined,
        durationSec: Number(row.duration) || undefined,
        author,
        license: "Pixabay Content License",
        attribution: `${author} @ Pixabay`,
      });
    } else {
      const full = row.largeImageURL || row.webformatURL;
      if (!full) continue;
      items.push({
        provider: "pixabay",
        kind,
        id: String(row.id),
        title,
        downloadUrl: String(full),
        previewUrl: String(row.previewURL || row.webformatURL || full),
        width: Number(row.imageWidth) || undefined,
        height: Number(row.imageHeight) || undefined,
        author,
        license: "Pixabay Content License",
        attribution: `${author} @ Pixabay`,
      });
    }
  }
  return items;
}

// --- Unsplash --------------------------------------------------------------

async function searchUnsplash(query: string, perPage: number): Promise<StockItem[]> {
  const key = requireEnv("unsplash");
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
    query,
  )}&per_page=${perPage}&content_filter=high`;
  const data = await fetchJson(url, { Authorization: `Client-ID ${key}` });
  const rows: any[] = Array.isArray(data?.results) ? data.results : [];
  const items: StockItem[] = [];
  for (const row of rows) {
    const download = row?.urls?.raw || row?.urls?.full || row?.urls?.regular;
    if (!row?.id || !download) continue;
    const author = String(row.user?.name || "").trim();
    items.push({
      provider: "unsplash",
      kind: "photo",
      id: String(row.id),
      title: String(row.alt_description || row.description || author || "Unsplash photo"),
      downloadUrl: String(download),
      previewUrl: String(row.urls.small || row.urls.thumb || download),
      width: Number(row.width) || undefined,
      height: Number(row.height) || undefined,
      author,
      license: "Unsplash License",
      attribution: `${author} @ Unsplash`,
    });
  }
  return items;
}

// --- Freesound -------------------------------------------------------------

// ההורדה המקורית דורשת OAuth; מספקים את קובץ התצוגה המקדימה (MP3).
function freesoundLicense(licenseUrl: unknown): string {
  const s = String(licenseUrl || "");
  if (s.includes("/zero/")) return "CC0 1.0";
  if (s.includes("/by-nc/")) return "CC BY-NC 3.0";
  if (s.includes("/by/")) return "CC BY 3.0";
  return "CC0 1.0";
}

async function searchFreesound(query: string, perPage: number): Promise<StockItem[]> {
  const token = requireEnv("freesound");
  const fields = "id,name,previews,duration,license,username";
  const url = `https://freesound.org/apiv2/search/text/?query=${encodeURIComponent(
    query,
  )}&token=${encodeURIComponent(token)}&page_size=${perPage}&fields=${fields}`;
  const data = await fetchJson(url, {});
  const rows: any[] = Array.isArray(data?.results) ? data.results : [];
  const items: StockItem[] = [];
  for (const row of rows) {
    const preview = row?.previews?.["preview-hq-mp3"] || row?.previews?.["preview-lq-mp3"];
    if (!row?.id || !preview) continue;
    const author = String(row.username || "").trim();
    items.push({
      provider: "freesound",
      kind: "audio",
      id: String(row.id),
      title: String(row.name || `Freesound ${row.id}`),
      downloadUrl: String(preview),
      previewUrl: String(preview),
      durationSec: Number(row.duration) || undefined,
      author,
      license: freesoundLicense(row.license),
      attribution: `${author} @ Freesound`,
    });
  }
  return items;
}

export async function searchStock(opts: {
  provider: StockProvider | string;
  kind: StockKind | string;
  query: string;
  perPage?: number;
}): Promise<{ items: StockItem[] }> {
  const provider = parseStockProvider(opts.provider);
  if (!provider) throw new StockError("stock_bad_request", "provider");
  if (!isKindSupported(provider, opts.kind)) throw new StockError("stock_bad_request", "kind");
  const query = String(opts.query || "").trim();
  if (!query) throw new StockError("stock_bad_request", "query");
  const perPage = clampStockPerPage(opts.perPage);

  const items =
    provider === "pexels"
      ? await searchPexels(opts.kind as StockKind, query, perPage)
      : provider === "pixabay"
        ? await searchPixabay(opts.kind as StockKind, query, perPage)
        : provider === "unsplash"
          ? await searchUnsplash(query, perPage)
          : await searchFreesound(query, perPage);
  return { items };
}
