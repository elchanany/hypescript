"use client";

// Direct-manipulation overlay layer, rendered inside the letterboxed project
// canvas box (".pv-canvas"). Overlays are positioned in PROJECT coordinates and
// laid out as % of the canvas, so they are independent of preview/browser size.
// The layer itself is pointer-transparent (empty clicks fall through to the
// video to toggle play / clear selection); each overlay box captures its own
// pointer events. Move/resize/rotate use a single transaction -> one Undo.

import { useEffect, useRef, useState } from "react";
import { MediaAsset, mediaById } from "@/lib/editor/model";
import { Overlay, overlayVisibleAt } from "@/lib/editor/overlay";
import { CanvasSize, rotatePoint } from "@/lib/editor/canvasCoords";
import { RotateCw } from "lucide-react";

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
  onEditText: (id: string, text: string) => void;
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
      onLive((prev) => prev.map((o) => (o.id === d.id ? { ...o, transform: { ...o.transform, x, y } } : o)));
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
    // corner resize — symmetric around center, in the element's local (un-rotated) frame
    const local = rotatePoint(projX, projY, d.s.x, d.s.y, -d.s.rotation);
    let w = Math.max(8, Math.abs(local.x - d.s.x) * 2);
    let h = Math.max(8, Math.abs(local.y - d.s.y) * 2);
    if (e.shiftKey) { const k = Math.max(w / d.s.w, h / d.s.h); w = d.s.w * k; h = d.s.h * k; }
    onLive((prev) => prev.map((o) => (o.id === d.id ? { ...o, transform: { ...o.transform, w, h } } : o)));
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

  const visible = overlays.filter((o) => overlayVisibleAt(o, currentTime)).sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="pv-overlays">
      {visible.map((o) => {
        const { x, y, w, h, rotation, opacity } = o.transform;
        const asset = o.assetId ? mediaById(media, o.assetId) : undefined;
        const sel = o.id === selectedId;
        const style: React.CSSProperties = {
          left: `${(x / canvas.width) * 100}%`,
          top: `${(y / canvas.height) * 100}%`,
          width: `${(w / canvas.width) * 100}%`,
          height: `${(h / canvas.height) * 100}%`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          opacity,
        };
        return (
          <div key={o.id} className={`ov-box ${sel ? "sel" : ""} ${o.locked ? "locked" : ""}`} style={style}
            onPointerDown={(e) => startDrag(e, o, "move")}
            onDoubleClick={(e) => { if (o.kind === "text") { e.stopPropagation(); const t = prompt("טקסט:", o.text || ""); if (t != null) onEditText(o.id, t); } }}>
            {o.kind === "image" && asset ? (
              // checkerboard behind semi-transparent / dark images so they're never "invisible"
              <div className="ov-img-wrap"><img src={asset.url} alt="" draggable={false} /></div>
            ) : o.kind === "text" ? (
              <div className="ov-text" style={{ color: o.color || "#fff", fontSize: `${(o.fontSize || 48) * scale}px`, fontWeight: o.bold ? 700 : 500, justifyContent: o.align === "start" ? "flex-start" : o.align === "end" ? "flex-end" : "center" }}>
                {o.text || ""}
              </div>
            ) : (
              <div className="ov-missing">מדיה חסרה</div>
            )}

            {sel && !o.locked && (
              <>
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
