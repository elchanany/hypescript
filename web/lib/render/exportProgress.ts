export function exportPercent(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.max(0, Math.min(100, Math.round(progress * 100)));
}

/** Estimate remaining time from measured throughput. Hidden until the sample is useful. */
export function estimateRemainingSeconds(progress: number, elapsedSeconds: number): number | null {
  if (!Number.isFinite(progress) || !Number.isFinite(elapsedSeconds) || progress < 0.02 || progress >= 1 || elapsedSeconds < 1) return null;
  const remaining = elapsedSeconds * ((1 - progress) / progress);
  return Number.isFinite(remaining) ? Math.max(1, Math.round(remaining)) : null;
}

export function formatDurationHe(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds} שנ׳`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes < 60) return rest ? `${minutes} דק׳ ${rest} שנ׳` : `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours} שע׳ ${mins} דק׳` : `${hours} שע׳`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
