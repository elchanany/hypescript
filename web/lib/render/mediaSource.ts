import { MediaAsset } from "@/lib/editor/model";

/** Resolver that fetches a signed download URL for a cloud asset. */
export type CloudAssetResolver = (cloudAssetId: string) => Promise<string>;

export interface ResolveSourceInput {
  asset: MediaAsset;
  resolveCloudUrl: CloudAssetResolver;
}

/**
 * Returns true when the source has non-zero content:
 * - File/Blob with size > 0
 * - non-empty string
 * - Uint8Array with byteLength > 0
 */
export function isUsableSource(source: unknown): boolean {
  if (source == null) return false;
  if (typeof source === "string") return source.length > 0;
  if (source instanceof Blob || source instanceof File) return source.size > 0;
  if (source instanceof Uint8Array) return source.byteLength > 0;
  return true;
}

/**
 * Returns true when the string looks like a fetchable URL (http/https/blob/data).
 * URL strings are NOT subject to size/HTML/JSON junk checks — they are fetched by
 * FFmpeg, not written as raw bytes.
 */
function isUrlString(source: string): boolean {
  return /^(https?:|blob:|data:|file:)/i.test(source.trimStart());
}

/**
 * Reject zero/trivially tiny and obvious HTML/JSON response bodies before
 * FFmpeg write — without over-rejecting valid media or URL strings.
 *
 * Rules:
 * - Any Blob/File < 8 bytes is junk (empty/truncated response).
 * - Any string < 8 bytes is junk (BUT URL strings are excluded — they are fetched).
 * - If the leading byte/character is '<', '{' or '[' (HTML/JSON signature) it is junk.
 */
export function isJunkPayload(source: unknown): boolean {
  if (source instanceof Blob || source instanceof File) {
    return source.size < 8;
  }
  if (typeof source === "string") {
    // URL strings are never junk — they are fetched by FFmpeg.
    if (isUrlString(source)) return false;
    if (source.length < 8) return true;
    const first = source.trimStart().charCodeAt(0);
    // '<' = 0x3C, '{' = 0x7B, '[' = 0x5B
    if (first === 0x3c || first === 0x7b || first === 0x5b) return true;
    return false;
  }
  if (source instanceof Uint8Array) {
    if (source.byteLength < 8) return true;
    const first = source[0];
    if (first === 0x3c || first === 0x7b || first === 0x5b) return true;
    return false;
  }
  return false;
}

/**
 * Resolve the best media source for FFmpeg rendering.
 *
 * Priority (strictly ordered):
 *   1. Non-empty local File  (asset.file.size > 0)
 *   2. Signed cloud URL      (via injected resolver, only if cloudAssetId exists)
 *   3. Usable asset.url      (non-empty, non-junk)
 *
 * Throws a concise Hebrew error when none of the above is available.
 */
export async function resolveMediaSource(input: ResolveSourceInput): Promise<string | File | Blob> {
  const { asset, resolveCloudUrl } = input;

  // 1. Non-empty local File — always preferred
  if (asset.file && asset.file.size > 0) {
    return asset.file;
  }

  // 2. Signed cloud URL via injected resolver
  if (asset.cloudAssetId) {
    try {
      const url = await resolveCloudUrl(asset.cloudAssetId);
      if (isUsableSource(url) && !isJunkPayload(url)) {
        return url;
      }
    } catch (err) {
      console.warn("cloud asset resolution failed:", asset.cloudAssetId, err);
    }
  }

  // 3. Usable asset.url (e.g. blob URL created during session)
  if (isUsableSource(asset.url) && !isJunkPayload(asset.url)) {
    return asset.url;
  }

  // No usable source — fail in concise Hebrew
  throw new Error(`חסר מקור לרינדור: ${asset.name || asset.id} — הקובץ המקומי ריק ולא נטען מהענן.`);
}

// ---------------------------------------------------------------------------
// materializeSource — convert any render source to Uint8Array bytes
// ---------------------------------------------------------------------------

export type UrlFetcher = (url: string) => Promise<Uint8Array | ArrayBuffer>;

/**
 * Materialize a render source into raw Uint8Array bytes.
 *
 * - Uint8Array → returned directly.
 * - Blob/File → arrayBuffer → Uint8Array.
 * - string (URL) → calls the injected `fetcher` and returns fetched bytes.
 *   Never returns the URL text itself.
 *
 * Validates the result:
 *   - < 8 bytes → junk.
 *   - Leading byte '<' / '{' / '[' → HTML/JSON, not video.
 * Throws concise Hebrew errors with an optional label.
 */
export async function materializeSource(
  source: unknown,
  fetcher: UrlFetcher,
  label?: string,
): Promise<Uint8Array> {
  let raw: Uint8Array;
  if (source instanceof Uint8Array) {
    raw = source;
  } else if (source instanceof Blob || source instanceof File) {
    raw = new Uint8Array(await source.arrayBuffer());
  } else if (typeof source === "string") {
    const fetched = await fetcher(source);
    raw = fetched instanceof Uint8Array ? fetched : new Uint8Array(fetched);
  } else {
    const fetched = await fetcher(String(source));
    raw = fetched instanceof Uint8Array ? fetched : new Uint8Array(fetched);
  }
  const display = label || "קובץ";
  if (raw.byteLength < 8) {
    throw new Error(`הקובץ "${display}" ריק או פגום (${raw.byteLength} בתים) — בדוק שהמקור תקין.`);
  }
  const first = raw[0];
  if (first === 0x3c || first === 0x7b || first === 0x5b) {
    throw new Error(`הקובץ "${display}" מכיל תוכן HTML/JSON במקום וידאו — בדוק את מקור הקובץ.`);
  }
  return raw;
}
