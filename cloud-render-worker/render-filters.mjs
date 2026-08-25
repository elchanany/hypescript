function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max, fallback) {
  return Math.max(min, Math.min(max, finite(value, fallback)));
}

function fades(duration, rawIn, rawOut) {
  let fadeIn = clamp(rawIn, 0, duration, 0);
  let fadeOut = clamp(rawOut, 0, duration, 0);
  const total = fadeIn + fadeOut;
  if (total > duration && total > 0) {
    const scale = duration / total;
    fadeIn *= scale;
    fadeOut *= scale;
  }
  return { fadeIn, fadeOut };
}

export function validWorkerLook(value) {
  return value == null || (typeof value === "string" && value.length <= 4096 && !/[;\[\]\r\n\\]/.test(value));
}

/** Filters appended after fit/pad/setsar and before the final yuv conversion. */
export function cloudVideoFilters(clip, duration) {
  const visual = fades(duration, clip.visualFadeIn, clip.visualFadeOut);
  const flip = `${clip.flipX === true ? "hflip," : ""}${clip.flipY === true ? "vflip," : ""}`;
  const look = validWorkerLook(clip.look) && clip.look ? `${clip.look},` : "";
  const fade = `${visual.fadeIn > 0 ? `fade=t=in:st=0:d=${visual.fadeIn.toFixed(3)},` : ""}`
    + `${visual.fadeOut > 0 ? `fade=t=out:st=${Math.max(0, duration - visual.fadeOut).toFixed(3)}:d=${visual.fadeOut.toFixed(3)},` : ""}`;
  const opacity = clamp(clip.opacity, 0, 1, 1);
  const opacityFilter = opacity < 0.9995
    ? `format=rgb24,colorchannelmixer=rr=${opacity.toFixed(3)}:gg=${opacity.toFixed(3)}:bb=${opacity.toFixed(3)},`
    : "";
  return `${flip}${look}${fade}${opacityFilter}format=yuv420p`;
}

/** Main video-clip audio state: gain plus the same normalized fades as WASM. */
export function cloudAudioFilters(clip, duration) {
  const audio = fades(duration, clip.fadeIn, clip.fadeOut);
  const volume = clamp(clip.volume, 0, 2, 1);
  const parts = [`volume=${volume.toFixed(3)}`];
  if (audio.fadeIn > 0) parts.push(`afade=t=in:st=0:d=${audio.fadeIn.toFixed(3)}`);
  if (audio.fadeOut > 0) parts.push(`afade=t=out:st=${Math.max(0, duration - audio.fadeOut).toFixed(3)}:d=${audio.fadeOut.toFixed(3)}`);
  return parts.join(",");
}
