/** גרירת מדיה מהספרייה לטיימליין — MIME מותאם + בניית תצוגה מקדימה ל-drag image. */

export const MEDIA_DRAG_MIME = "application/x-hypescript-media";

export type DragPreviewKind = "video" | "image" | "audio" | "overlay" | "gap";

/** בונה אלמנט זמני ל-setDragImage (חייב להיות ב-DOM). */
export function buildDragPreviewEl(opts: {
  name: string;
  dur?: number;
  kind: DragPreviewKind;
  thumbUrl?: string | null;
}): HTMLElement {
  const el = document.createElement("div");
  el.className = "drag-preview-card";
  el.setAttribute("dir", "rtl");

  const preview = document.createElement("div");
  preview.className = "drag-preview-thumb";
  if (opts.thumbUrl) {
    const img = document.createElement("img");
    img.src = opts.thumbUrl;
    img.alt = "";
    preview.appendChild(img);
  } else if (opts.kind === "audio") {
    preview.classList.add("audio");
    for (let i = 0; i < 8; i++) {
      const bar = document.createElement("i");
      bar.style.height = `${35 + ((i * 17) % 50)}%`;
      preview.appendChild(bar);
    }
  } else {
    preview.classList.add("glyph");
    preview.textContent = opts.kind === "image" ? "🖼️" : opts.kind === "gap" ? "▭" : "🎬";
  }
  el.appendChild(preview);

  const meta = document.createElement("div");
  meta.className = "drag-preview-meta";
  const name = document.createElement("span");
  name.className = "drag-preview-name";
  name.textContent = opts.name;
  meta.appendChild(name);
  if (opts.dur != null && Number.isFinite(opts.dur)) {
    const dur = document.createElement("span");
    dur.className = "drag-preview-dur";
    dur.textContent = `${opts.dur.toFixed(1)}s`;
    meta.appendChild(dur);
  }
  el.appendChild(meta);

  // מחוץ למסך — setDragImage דורש אלמנט ב-DOM
  el.style.position = "fixed";
  el.style.top = "-1000px";
  el.style.left = "-1000px";
  document.body.appendChild(el);
  return el;
}

export function releaseDragPreviewEl(el: HTMLElement | null) {
  if (el && el.parentNode) el.parentNode.removeChild(el);
}
