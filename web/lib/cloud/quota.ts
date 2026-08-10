import "server-only";

export function cloudQuotaError(error: { message?: string } | null | undefined) {
  const message = error?.message || "";
  const known = [
    "project_quota_exceeded",
    "storage_quota_exceeded",
    "global_storage_quota_exceeded",
    "render_quota_exceeded",
    "global_render_quota_exceeded",
    "render_concurrency_exceeded",
    "cloud_render_paused",
    "project_not_found",
  ].find((code) => message.includes(code));
  if (!known) return null;
  const status = known === "project_not_found" ? 404
    : known === "render_concurrency_exceeded" ? 429
      : known === "cloud_render_paused" || known === "global_render_quota_exceeded" || known === "global_storage_quota_exceeded" ? 503
        : 402;
  return { code: known, status };
}
