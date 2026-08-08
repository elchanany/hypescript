/** Effective gain shared by the preview UI and its Web Audio gain node. */
export function previewAudioGain(playerVolume: number, clipVolume: number, muted = false): number {
  if (muted) return 0;
  const player = Number.isFinite(playerVolume) ? Math.max(0, Math.min(1, playerVolume)) : 1;
  const clip = Number.isFinite(clipVolume) ? Math.max(0, Math.min(2, clipVolume)) : 1;
  return player * clip;
}
