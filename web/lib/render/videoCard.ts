/** פורמט שניות ל-mm:ss (ללא שעות). */
export function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/** שם קובץ בטוח להורדה — מסיר תווים מסוכנים ומבטיח סיומת .mp4. */
export function safeDownloadName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  const base = cleaned.replace(/\.mp4$/i, "") || "video";
  return `${base}.mp4`;
}