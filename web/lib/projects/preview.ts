"use client";

// Build a cover image + light stats for a local project card from IndexedDB.
// Never uploads anything.

import { kvGet, pk } from "@/lib/storage";

interface StoredMedia {
  id: string;
  name: string;
  kind: "video" | "image" | "audio";
  duration: number;
  blob: Blob | File;
}

interface StoredState {
  clips?: Array<{ start?: number; end?: number }>;
  subs?: unknown[];
}

export interface ProjectCardInfo {
  coverUrl: string | null;
  mediaCount: number;
  videoCount: number;
  clipCount: number;
  subtitleCount: number;
  /** משך משוער של ה-EDL בשניות (0 אם אין קליפים) */
  editedDurationSec: number;
}

function asFile(m: StoredMedia): File | null {
  if (m.blob instanceof File) return m.blob;
  if (m.blob instanceof Blob) {
    return new File([m.blob], m.name || "media", { type: m.blob.type || "" });
  }
  return null;
}

/** Returns a displayable image URL for the project card, or null if none. */
export async function getProjectCoverUrl(projectId: string): Promise<string | null> {
  const info = await getProjectCardInfo(projectId);
  return info.coverUrl;
}

/** Cover + counts for a rich project card. */
export async function getProjectCardInfo(projectId: string): Promise<ProjectCardInfo> {
  const empty: ProjectCardInfo = {
    coverUrl: null,
    mediaCount: 0,
    videoCount: 0,
    clipCount: 0,
    subtitleCount: 0,
    editedDurationSec: 0,
  };

  const [list, state] = await Promise.all([
    kvGet<StoredMedia[]>(pk(projectId, "media")),
    kvGet<StoredState>(pk(projectId, "state")),
  ]);

  const media = list || [];
  const clips = state?.clips || [];
  const subs = state?.subs || [];
  const editedDurationSec = clips.reduce((s, c) => {
    const a = Number(c.start) || 0;
    const b = Number(c.end) || 0;
    return s + Math.max(0, b - a);
  }, 0);

  const result: ProjectCardInfo = {
    coverUrl: null,
    mediaCount: media.length,
    videoCount: media.filter((m) => m.kind === "video").length,
    clipCount: clips.length,
    subtitleCount: Array.isArray(subs) ? subs.length : 0,
    editedDurationSec,
  };

  const video = media.find((m) => m.kind === "video");
  const image = media.find((m) => m.kind === "image");
  const pick = video || image;
  if (!pick) return result;

  const file = asFile(pick);
  if (!file) return result;

  if (pick.kind === "image") {
    result.coverUrl = URL.createObjectURL(file);
    return result;
  }

  try {
    const { getThumbnail } = await import("@/lib/media/thumbnails");
    const t = Math.min(1, Math.max(0.05, (pick.duration || 1) * 0.08));
    result.coverUrl = await getThumbnail(file, t, 320);
  } catch {
    result.coverUrl = null;
  }
  return result;
}

export function formatDurationHe(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "";
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h}:${String(mm).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }
  return `${m}:${String(r).padStart(2, "0")}`;
}
