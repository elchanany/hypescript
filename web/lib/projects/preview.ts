"use client";

// Build a cover image (data URL / object URL) for a local project from its first
// video/image media blob in IndexedDB. Never uploads anything.

import { kvGet, pk } from "@/lib/storage";

interface StoredMedia {
  id: string;
  name: string;
  kind: "video" | "image" | "audio";
  duration: number;
  blob: Blob | File;
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
  const list = await kvGet<StoredMedia[]>(pk(projectId, "media"));
  if (!list?.length) return null;

  const video = list.find((m) => m.kind === "video");
  const image = list.find((m) => m.kind === "image");
  const pick = video || image;
  if (!pick) return null;

  const file = asFile(pick);
  if (!file) return null;

  if (pick.kind === "image") {
    return URL.createObjectURL(file);
  }

  try {
    const { getThumbnail } = await import("@/lib/media/thumbnails");
    const t = Math.min(1, Math.max(0.05, (pick.duration || 1) * 0.08));
    return await getThumbnail(file, t, 160);
  } catch {
    return null;
  }
}
