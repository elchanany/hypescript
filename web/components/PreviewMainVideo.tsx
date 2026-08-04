"use client";

// Direct-manipulation handles for the main video element on the project canvas.
// Changes write VideoTransform (Element Scale) — never Viewer Zoom.

import { useEffect, useRef, useState } from "react";
import { CanvasSize, rotatePoint } from "@/lib/editor/canvasCoords";
import { VideoTransform, resolveVideoRect } from "@/lib/editor/videoTransform";
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
  videoTransform: VideoTransform;
  sourceW: number;
  sourceH: number;
  selected: boolean;
  hovered?: boolean;
  locked?: boolean;
  onHover?: (v: boolean) => void;
  onSelect: () => void;
  onBegin: () => void;
  onLive: (vt: VideoTransform) => void;
  onCommit: () => void;
  onCancel?: () => void;
}

interface DragState {
  mode: "move" | Handle;
  startX: number; startY: number;
  box: DOMRect;
  scale: number;
  s: { x: number; y: number; w: number; h: number; rotation: number; opacity: number };
  uniform: boolean;
  moved: boolean;
}

export default function PreviewMainVideo({
  boxRef, canvas, videoTransform, sourceW, sourceH, selected, hovered, locked,
  onHover, onSelect, onBegin, onLive, onCommit, onCancel,
}: Props) {
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

  const pxScale = boxPx.w / Math.max(1, canvas.width);
  const rect = resolveVideoRect(videoTransform, canvas, sourceW || canvas.width, sourceH || canvas.height);

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dxCss = e.clientX - d.startX, dyCss = e.clientY - d.startY;
    if (Math.abs(dxCss) > 2 || Math.abs(dyCss) > 2) d.moved = true;
    if (d.mode === "move") {
      onLive({
        ...videoTransform,
        fitMode: "custom",
        x: d.s.x + dxCss / d.scale,
        y: d.s.y + dyCss / d.scale,
        w: d.s.w,
        h: d.s.h,
        rotation: d.s.rotation,
        opacity: d.s.opacity,
      });
      return;
    }
    const projX = (e.clientX - d.box.left) / d.scale;
    const projY = (e.clientY - d.box.top) / d.scale;
    if (d.mode === "rot") {
      let deg = (Math.atan2(projY - d.s.y, projX - d.s.x) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      onLive({ ...videoTransform, fitMode: "custom", x: d.s.x, y: d.s.y, w: d.s.w, h: d.s.h, rotation: deg, opacity: d.s.opacity });
      return;
    }
    const local = rotatePoint(projX, projY, d.s.x, d.s.y, -d.s.rotation);
    let w = Math.max(8, Math.abs(local.x - d.s.x) * 2);
    let h = Math.max(8, Math.abs(local.y - d.s.y) * 2);
    if (e.shiftKey || d.uniform) {
      const k = Math.max(w / d.s.w, h / d.s.h);
      w = d.s.w * k; h = d.s.h * k;
    }
    // Alt = resize around center (already center-anchored)
    onLive({ ...videoTransform, fitMode: "custom", x: d.s.x, y: d.s.y, w, h, rotation: d.s.rotation, opacity: d.s.opacity });
  };

  const onPointerUp = () => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("keydown", onKey);
    const d = drag.current;
    drag.current = null;
    if (d?.moved) onCommit();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
      onPointerUp();
    }
  };

  const startDrag = (e: React.PointerEvent, mode: DragState["mode"]) => {
    if (locked) { e.stopPropagation(); onSelect(); return; }
    e.stopPropagation();
    e.preventDefault();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    onSelect();
    onBegin();
    drag.current = {
      mode, startX: e.clientX, startY: e.clientY, box, scale: pxScale,
      s: { ...rect }, uniform: videoTransform.uniformScale, moved: false,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);
  };

  const left = ((rect.x - rect.w / 2) / canvas.width) * 100;
  const top = ((rect.y - rect.h / 2) / canvas.height) * 100;
  const width = (rect.w / canvas.width) * 100;
  const height = (rect.h / canvas.height) * 100;

  return (
    <div
      className={`pv-main-hit ${selected ? "selected" : ""} ${hovered && !selected ? "hovered" : ""} ${locked ? "locked" : ""}`}
      style={{
        left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
        transform: rect.rotation ? `rotate(${rect.rotation}deg)` : undefined,
      }}
      onPointerEnter={() => onHover?.(true)}
      onPointerLeave={() => onHover?.(false)}
      onPointerDown={(e) => startDrag(e, "move")}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      title={locked ? "נעול" : "גרור להזזה · פינות לשינוי גודל"}
    >
      {selected && !locked && (
        <>
          {CORNERS.map(({ h, cx, cy, cursor }) => (
            <span
              key={h}
              className={`ov-handle ${h}`}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, cursor }}
              onPointerDown={(e) => startDrag(e, h)}
            />
          ))}
          <span
            className="ov-handle rot"
            style={{ left: "50%", top: "-22px" }}
            onPointerDown={(e) => startDrag(e, "rot")}
          >
            <RotateCw size={10} strokeWidth={2.5} />
          </span>
        </>
      )}
      {locked && selected && <span className="pv-lock-badge">נעול</span>}
    </div>
  );
}
