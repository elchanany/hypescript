export type TransferProgress = {
  count: number;
  fileName: string;
  loadedBytes: number;
  totalBytes: number;
  ratio: number;
  startedAt: number;
};

export function clampRatio(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

export function formatBytes(bytes: number) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${Math.round(value)} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(value < 10240 ? 1 : 0)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(value < 10 * 1024 ** 2 ? 1 : 0)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
}

export function remainingSeconds(progress: TransferProgress, now = Date.now()) {
  const elapsed = Math.max(0, (now - progress.startedAt) / 1000);
  if (elapsed < 1 || progress.loadedBytes <= 0 || progress.loadedBytes >= progress.totalBytes) return null;
  const seconds = elapsed * ((progress.totalBytes - progress.loadedBytes) / progress.loadedBytes);
  return Number.isFinite(seconds) ? Math.max(1, Math.round(seconds)) : null;
}

export function formatRemaining(seconds: number | null) {
  if (seconds == null) return "מחשב זמן שנותר…";
  if (seconds < 60) return `כ־${seconds} שנ׳ נותרו`;
  if (seconds < 3600) return `כ־${Math.ceil(seconds / 60)} דק׳ נותרו`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);
  return `כ־${hours} שע׳${minutes ? ` ו־${minutes} דק׳` : ""} נותרו`;
}
