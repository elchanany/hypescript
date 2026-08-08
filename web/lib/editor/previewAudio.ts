/** Effective gain shared by the preview UI and its Web Audio gain node. */
export function audioFadeFactor(offset: number, duration: number, fadeIn = 0, fadeOut = 0): number {
  const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
  const at = Number.isFinite(offset) ? Math.max(0, Math.min(safeDuration, offset)) : 0;
  const inFactor = fadeIn > 0 ? Math.min(1, at / fadeIn) : 1;
  const outFactor = fadeOut > 0 ? Math.min(1, (safeDuration - at) / fadeOut) : 1;
  return Math.max(0, Math.min(1, inFactor, outFactor));
}

export function previewAudioGain(playerVolume: number, clipVolume: number, muted = false, fadeFactor = 1): number {
  if (muted) return 0;
  const player = Number.isFinite(playerVolume) ? Math.max(0, Math.min(1, playerVolume)) : 1;
  const clip = Number.isFinite(clipVolume) ? Math.max(0, Math.min(2, clipVolume)) : 1;
  const fade = Number.isFinite(fadeFactor) ? Math.max(0, Math.min(1, fadeFactor)) : 1;
  return player * clip * fade;
}
