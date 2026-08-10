// Pure helpers for preview object-URL bookkeeping (brand settings editor).
// Keeps release logic trivially testable without a browser; the revoke function
// is injectable so node tests don't depend on URL.revokeObjectURL behavior.

/**
 * Returns `next` after revoking exactly the URLs in `old` that are NOT present
 * in `next` (by id). Every replaced/removed preview is therefore released
 * exactly once, while currently displayed previews stay valid.
 */
export function revokeStalePreviews(
  old: Record<string, string>,
  next: Record<string, string>,
  revoke: (url: string) => void = (u) => URL.revokeObjectURL(u),
): Record<string, string> {
  const keep = new Set(Object.keys(next));
  for (const [id, url] of Object.entries(old)) {
    if (!keep.has(id) && typeof url === "string" && url) {
      try { revoke(url); } catch { /* ignore revocation errors */ }
    }
  }
  return next;
}

/**
 * Builds the preview map for a list of assets: allocates object URLs for new
 * ids, keeps already-tracked URLs (so reloading a kit doesn't churn), and drops
 * ids whose asset disappeared. Call with revokeStalePreviews to release dropped
 * URLs.
 */
export function previewsForAssets<T extends { id: string; blob: Blob }>(
  assets: T[],
  current: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = { ...current };
  for (const a of assets) {
    if (!next[a.id]) next[a.id] = URL.createObjectURL(a.blob);
  }
  const ids = new Set(assets.map((a) => a.id));
  for (const id of Object.keys(next)) {
    if (!ids.has(id)) delete next[id];
  }
  return next;
}
