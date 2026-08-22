export interface CloudUploadResult {
  assetId: string;
  objectKey: string;
}

export interface CloudProject {
  id: string;
  name: string;
  state: "active" | "archived" | "deleting";
  editor_state: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `cloud_request_${response.status}`);
  return body as T;
}

export async function createCloudProject(name: string) {
  return json<{ id: string }>(await fetch("/api/cloud/projects", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }),
  }));
}

export async function listCloudProjects() {
  const result = await json<{ projects: CloudProject[] }>(await fetch("/api/cloud/projects"));
  return result.projects;
}

export async function getCloudProject(id: string) {
  return json<{ project: CloudProject }>(await fetch(`/api/cloud/projects/${encodeURIComponent(id)}`));
}

export async function saveCloudProjectState(id: string, editorState: Record<string, unknown>) {
  return json<{ ok: true }>(await fetch(`/api/cloud/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ editorState }),
  }));
}

export async function renameCloudProject(id: string, name: string) {
  return json<{ ok: true }>(await fetch(`/api/cloud/projects/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }));
}

export async function deleteCloudProject(id: string) {
  try {
    const resp = await fetch(`/api/cloud/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (resp.status === 404) return { ok: true as const };
    return json<{ ok: true }>(resp);
  } catch {
    return { ok: true as const };
  }
}

export async function deleteAllCloudProjects(): Promise<void> {
  const projects = await listCloudProjects().catch(() => []);
  await Promise.all(projects.map((p) => deleteCloudProject(p.id).catch(() => {})));
}

export async function getCloudAssetDownloadUrl(assetId: string): Promise<string> {
  const data = await json<{ url: string }>(await fetch(`/api/cloud/assets/${encodeURIComponent(assetId)}/download`));
  return data.url;
}

export async function uploadCloudAsset(projectId: string, file: File, onProgress?: (ratio: number) => void, signal?: AbortSignal): Promise<CloudUploadResult> {
  const prepared = await json<{ assetId: string; objectKey: string; uploadUrl: string; headers: Record<string, string> }>(await fetch("/api/cloud/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ projectId, name: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size }),
    signal,
  }));

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", prepared.uploadUrl);
    Object.entries(prepared.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress?.(event.loaded / event.total);
    xhr.onerror = () => reject(new Error("cloud_upload_network_error"));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`cloud_upload_${xhr.status}`));
    const abort = () => { xhr.abort(); reject(new DOMException("Aborted", "AbortError")); };
    signal?.addEventListener("abort", abort, { once: true });
    xhr.onloadend = () => signal?.removeEventListener("abort", abort);
    xhr.send(file);
  });

  await json(await fetch(`/api/cloud/uploads/${prepared.assetId}/complete`, { method: "POST", signal }));
  onProgress?.(1);
  return { assetId: prepared.assetId, objectKey: prepared.objectKey };
}

export async function renderCloudProject(input: {
  projectId: string;
  clips: Array<{ assetId?: string; start: number; end: number; gap?: boolean }>;
  audioClips?: Array<{ assetId: string; start: number; end: number; timelineStart: number; volume?: number; fadeIn?: number; fadeOut?: number }>;
  overlays?: Array<{ assetId: string; start: number; end: number; x: number; y: number; width: number; height: number; rotation?: number; opacity?: number; fadeIn?: number; fadeOut?: number }>;
  /** קובץ ASS מוכן לצריבת כתוביות (ראו lib/render/assSubtitles.ts). */
  subtitlesAss?: string;
  target?: { width: number; height: number; fps: number };
}, onProgress?: (ratio: number) => void, signal?: AbortSignal): Promise<Blob> {
  const submitted = await json<{ jobId: string }>(await fetch("/api/cloud/render", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal,
  }));
  const cancel = () => fetch(`/api/cloud/jobs/${submitted.jobId}`, { method: "DELETE" }).catch(() => {});
  signal?.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const job = await json<{ status: string; progress: number; result_asset_id?: string; error_message?: string }>(await fetch(`/api/cloud/jobs/${submitted.jobId}`, { signal }));
      onProgress?.(Math.max(0, Math.min(1, Number(job.progress) || 0)));
      if (job.status === "completed" && job.result_asset_id) {
        const download = await json<{ url: string }>(await fetch(`/api/cloud/assets/${job.result_asset_id}/download`, { signal }));
        const response = await fetch(download.url, { signal });
        if (!response.ok) throw new Error(`cloud_download_${response.status}`);
        return response.blob();
      }
      if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error_message || `cloud_render_${job.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } finally {
    signal?.removeEventListener("abort", cancel);
  }
}

/**
 * יכולות שרת הייצוא שפרוס כרגע. נכשל בשקט אל "אין יכולות" — הצד הבטוח, שמשאיר
 * את הייצוא בדפדפן במקום להסתמך על יכולת שאולי לא קיימת שם.
 */
export async function fetchRenderCapabilities(signal?: AbortSignal): Promise<{
  subtitles: boolean; imageOverlays: boolean; textOverlays: boolean; audioMix: boolean;
}> {
  const safe = { subtitles: false, imageOverlays: true, textOverlays: false, audioMix: true };
  try {
    const response = await fetch("/api/cloud/render/capabilities", { signal, cache: "no-store" });
    if (!response.ok) return safe;
    const data = await response.json();
    const caps = data?.capabilities;
    if (!caps || typeof caps !== "object") return safe;
    return {
      subtitles: caps.subtitles === true,
      imageOverlays: caps.imageOverlays !== false,
      textOverlays: caps.textOverlays === true,
      audioMix: caps.audioMix !== false,
    };
  } catch {
    return safe;
  }
}
