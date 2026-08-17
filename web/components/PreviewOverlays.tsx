"use client";

// Direct-manipulation overlay layer, rendered inside the letterboxed project
// canvas box (".pv-canvas"). Overlays are positioned in PROJECT coordinates and
// laid out as % of the canvas, so they are independent of preview/browser size.
// The layer itself is pointer-transparent (empty clicks fall through to the
// video to toggle play / clear selection); each overlay box captures its own
// pointer events. Move/resize/rotate use a single transaction -> one Undo.

import { useEffect, useRef, useState } from "react";
import { MediaAsset, mediaById } from "@/lib/editor/model";
import { clampOverlayTransform, Overlay, overlayVisibleAt } from "@/lib/editor/overlay";
import { CanvasSize, rotatePoint } from "@/lib/editor/canvasCoords";
import { RotateCw } from "@/components/icons";

type Handle = "nw" | "ne" | "se" | "sw" | "rot";
const CORNERS: { h: Handle; cx: number; cy: number; cursor: string }[] = [
  { h: "nw", cx: 0, cy: 0, cursor: "nwse-resize" },
  { h: "ne", cx: 1, cy: 0, cursor: "nesw-resize" },
  { h: "se", cx: 1, cy: 1, cursor: "nwse-resize" },
  { h: "sw", cx: 0, cy: 1, cursor: "nesw-resize" },
];

interface Props {
  boxRef: React.RefObject<HTMLDivElement>;
  canvas: CanvasSize;
  overlays: Overlay[];
  media: MediaAsset[];
  currentTime: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onBegin: () => void;
  onLive: (updater: (prev: Overlay[]) => Overlay[]) => void;
  onCommit: () => void;
  onCancel?: () => void;
  onEditText: (id: string, currentText: string) => void; // request edit (parent opens modal)
}

interface DragState {
  mode: "move" | Handle;
  id: string;
  startX: number; startY: number;
  box: DOMRect;
  scale: number;
  s: Overlay["transform"];
  moved: boolean;
}

export default function PreviewOverlays({ boxRef, canvas, overlays, media, currentTime, selectedId, onSelect, onBegin, onLive, onCommit, onCancel, onEditText }: Props) {
  const drag = useRef<DragState | null>(null);
  const [boxPx, setBoxPx] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const el = boxRef.current; if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setBoxPx({ w: r.width || 1, h: r.height || 1 }); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [boxRef, canvas.width, canvas.height]);

  const scale = boxPx.w / Math.max(1, canvas.width); // css px per project px

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dxCss = e.clientX - d.startX, dyCss = e.clientY - d.startY;
    if (Math.abs(dxCss) > 2 || Math.abs(dyCss) > 2) d.moved = true;
    if (d.mode === "move") {
      const dx = dxCss / d.scale, dy = dyCss / d.scale;
      let x = d.s.x + dx, y = d.s.y + dy;
      if (!e.altKey) {
        const snap = (v: number, targets: number[]) => {
          for (const t of targets) if (Math.abs(v - t) <= 12) return t;
          return v;
        };
        x = snap(x, [canvas.width / 2, canvas.width * 0.1, canvas.width * 0.9]);
        y = snap(y, [canvas.height / 2, canvas.height * 0.1, canvas.height * 0.9]);
      }
      onLive((prev) => prev.map((o) => (o.id === d.id ? { ...o, transform: clampOverlayTransform({ ...o.transform, x, y }, canvas.width, canvas.height) } : o)));
      return;
    }
    // pointer in project coords
    const projX = (e.clientX - d.box.left) / d.scale;
    const projY = (e.clientY - d.box.top) / d.scale;
    if (d.mode === "rot") {
      let deg = (Math.atan2(projY - d.s.y, projX - d.s.x) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      onLive((prev) => prev.map((o) => (o.id === d.id ? { ...o, transform: { ...o.transform, rotation: deg } } : o)));
      return;
    }
    // Corner resize anchored at the opposite corner. Images preserve aspect ratio
    // by default (Shift allows free distortion), matching familiar video editors.
    const local = rotatePoint(projX, projY, d.s.x, d.s.y, -d.s.rotation);
    const sx = d.mode === "ne" || d.mode === "se" ? 1 : -1;
    const sy = d.mode === "se" || d.mode === "sw" ? 1 : -1;
    const opposite = { x: -sx * d.s.w / 2, y: -sy * d.s.h / 2 };
    let w = Math.max(8, Math.abs((local.x - d.s.x) - opposite.x));
    let h = Math.max(8, Math.abs((local.y - d.s.y) - opposite.y));
    const current = overlays.find((o) => o.id === d.id);
    if (current?.kind === "image" && !e.shiftKey) {
      const ratio = d.s.w / Math.max(1, d.s.h);
      if (w / Math.max(1, h) > ratio) h = w / ratio; else w = h * ratio;
    }
    const dragged = { x: sx * w / 2, y: sy * h / 2 };
    const centerLocal = { x: (dragged.x + opposite.x) / 2, y: (dragged.y + opposite.y) / 2 };
    const centerWorld = rotatePoint(d.s.x + centerLocal.x, d.s.y + centerLocal.y, d.s.x, d.s.y, d.s.rotation);
    onLive((prev) => prev.map((o) => (o.id === d.id ? { ...o, transform: clampOverlayTransform({ ...o.transform, x: centerWorld.x, y: centerWorld.y, w, h }, canvas.width, canvas.height) } : o)));
  };
  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (drag.current) {
      if (drag.current.moved) onCommit();
      else onCancel?.();
      drag.current = null;
      document.body.style.userSelect = "";
    }
  };

  const startDrag = (e: React.PointerEvent, o: Overlay, mode: DragState["mode"]) => {
    if (o.locked) { onSelect(o.id); return; }
    e.stopPropagation(); e.preventDefault();
    const box = boxRef.current?.getBoundingClientRect() || new DOMRect(0, 0, 1, 1);
    onSelect(o.id);
    onBegin();
    drag.current = { mode, id: o.id, startX: e.clientX, startY: e.clientY, box, scale: box.width / Math.max(1, canvas.width), s: { ...o.transform }, moved: false };
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const onBoxPointerDown = (e: React.PointerEvent, o: Overlay) => {
    // Layer cycling with Alt+Click or repeated click when multiple visual layers overlap
    const elements = document.elementsFromPoint(e.clientX, e.clientY);
    const hitOverlayEls = elements.filter((el) => el.classList.contains("ov-box")) as HTMLElement[];
    if (hitOverlayEls.length > 1 && (e.altKey || o.id === selectedId)) {
      e.stopPropagation();
      e.preventDefault();
      const currentIdx = hitOverlayEls.findIndex((el) => el.dataset.overlayId === selectedId);
      const nextIdx = (currentIdx + 1) % hitOverlayEls.length;
      const nextId = hitOverlayEls[nextIdx].dataset.overlayId;
      if (nextId && nextId !== selectedId) {
        onSelect(nextId);
        return;
      }
    }
    startDrag(e, o, "move");
  };

  const visible = overlays.filter((o) => overlayVisibleAt(o, currentTime)).sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="pv-overlays">
      {visible.map((o) => {
        const { x, y, w, h, rotation, opacity } = o.transform;
        const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
        const sel = o.id === selectedId;
        const localTime = Math.max(0, currentTime - o.start);
        const duration = Math.max(0.001, o.end - o.start);
        const fadeInFactor = (o.fadeIn || 0) > 0 ? Math.min(1, localTime / (o.fadeIn || 1)) : 1;
        const fadeOutFactor = (o.fadeOut || 0) > 0 ? Math.min(1, Math.max(0, duration - localTime) / (o.fadeOut || 1)) : 1;
        const style: React.CSSProperties = {
          left: `${(x / canvas.width) * 100}%`,
          top: `${(y / canvas.height) * 100}%`,
          width: `${(w / canvas.width) * 100}%`,
          height: `${(h / canvas.height) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          opacity: opacity * Math.min(fadeInFactor, fadeOutFactor),
        };
        return (
          <div key={o.id} data-overlay-id={o.id} className={`ov-box ${sel ? "sel" : ""} ${o.locked ? "locked" : ""}`} style={style}
            onPointerDown={(e) => onBoxPointerDown(e, o)}
            onDoubleClick={(e) => { if (o.kind === "text") { e.stopPropagation(); onEditText(o.id, o.text || ""); } }}>
            {o.kind === "image" && asset ? (
              // Transparent pixels must reveal the actual video, never an editor checkerboard.
              <div className="ov-img-wrap" style={{ borderRadius: `${(o.borderRadius || 0) * scale}px`, overflow: "hidden" }}><img src={asset.url} alt="" draggable={false} /></div>
            ) : o.kind === "text" ? (
              <div className="ov-text" style={{ color: o.color || "#fff", background: o.background || "transparent", border: o.borderWidth ? `${o.borderWidth * scale}px solid ${o.borderColor || "transparent"}` : undefined, borderRadius: `${(o.borderRadius || 0) * scale}px`, padding: `${Math.max(4, (o.fontSize || 48) * 0.18) * scale}px`, whiteSpace: "pre-line", fontSize: `${(o.fontSize || 48) * scale}px`, fontWeight: o.bold ? 700 : 500, justifyContent: o.align === "start" ? "flex-start" : o.align === "end" ? "flex-end" : "center" }}>
                {o.text || ""}
              </div>
            ) : (
              <div className="ov-missing">מדיה חסרה</div>
            )}

            {sel && !o.locked && (
              <>
                <span className="ov-layer-badge">שכבה {visible.findIndex((item) => item.id === o.id) + 1}/{visible.length} · מעל הווידאו</span>
                {CORNERS.map((c) => (
                  <span key={c.h} className="ov-handle" style={{ left: `${c.cx * 100}%`, top: `${c.cy * 100}%`, cursor: c.cursor }}
                    onPointerDown={(e) => startDrag(e, o, c.h)} />
                ))}
                <span className="ov-rot" onPointerDown={(e) => startDrag(e, o, "rot")} title="סיבוב">
                  <RotateCw size={12} strokeWidth={2} />
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
