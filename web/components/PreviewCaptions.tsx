"use client";

// Interactive caption layer on the project canvas — selection, hover preselection,
// drag / resize / rotate. Layout is stored on Sub (project coords) and committed
// through onUpdate → History. Double-click requests text edit from parent.

import { useEffect, useRef, useState } from "react";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CanvasSize, rotatePoint } from "@/lib/editor/canvasCoords";
import { CaptionStyle, DEFAULT_CAPTION_STYLE } from "@/lib/editor/captionStyle";
import { captionLayoutToCss, resolveCaptionLayout } from "@/lib/editor/captionLayout";
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
  subs: Sub[];
  currentTime: number;
  captionStyle?: CaptionStyle;
  selectedId: string | null;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  onSelect: (id: string | null) => void;
  onBegin: () => void;
  onLive: (updater: (prev: Sub[] | null) => Sub[] | null) => void;
  onCommit: () => void;
  onCancel?: () => void;
  onEditText: (id: string, currentText: string) => void;
}

interface DragState {
  mode: "move" | Handle;
  id: string;
  startX: number; startY: number;
  box: DOMRect;
  scale: number;
  layout: { x: number; y: number; w: number; h: number; rotation: number; scale: number };
  moved: boolean;
}

export default function PreviewCaptions({
  boxRef, canvas, subs, currentTime, captionStyle, selectedId, hoveredId,
  onHover, onSelect, onBegin, onLive, onCommit, onCancel, onEditText,
}: Props) {
  const drag = useRef<DragState | null>(null);
  const [boxPx, setBoxPx] = useState({ w: 1, h: 1 });
  const style = captionStyle || DEFAULT_CAPTION_STYLE;

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

  const active = (() => {
    let cue: Sub | null = null;
    for (let i = subs.length - 1; i >= 0; i--) {
      const s = subs[i];
      if (currentTime >= s.start - 0.01 && currentTime < s.end - 0.001) { cue = s; break; }
    }
    return cue;
  })();

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dxCss = e.clientX - d.startX, dyCss = e.clientY - d.startY;
    if (Math.abs(dxCss) > 2 || Math.abs(dyCss) > 2) d.moved = true;
    if (d.mode === "move") {
      const x = d.layout.x + dxCss / d.scale;
      const y = d.layout.y + dyCss / d.scale;
      onLive((prev) => (prev || []).map((s) => (s.id === d.id ? { ...s, x, y } : s)));
      return;
    }
    const projX = (e.clientX - d.box.left) / d.scale;
    const projY = (e.clientY - d.box.top) / d.scale;
    if (d.mode === "rot") {
      let deg = (Math.atan2(projY - d.layout.y, projX - d.layout.x) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      onLive((prev) => (prev || []).map((s) => (s.id === d.id ? { ...s, rotation: deg } : s)));
      return;
    }
    const local = rotatePoint(projX, projY, d.layout.x, d.layout.y, -d.layout.rotation);
    let w = Math.max(40, Math.abs(local.x - d.layout.x) * 2);
    if (e.shiftKey) {
      const k = w / d.layout.w;
      onLive((prev) => (prev || []).map((s) => (s.id === d.id ? { ...s, w, scale: d.layout.scale * k } : s)));
    } else {
      onLive((prev) => (prev || []).map((s) => (s.id === d.id ? { ...s, w } : s)));
    }
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

  const startDrag = (e: React.PointerEvent, id: string, mode: DragState["mode"], layout: DragState["layout"]) => {
    e.stopPropagation();
    e.preventDefault();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    onSelect(id);
    onBegin();
    drag.current = {
      mode, id, startX: e.clientX, startY: e.clientY, box, scale: pxScale, layout, moved: false,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKey);
  };

  if (!active) return null;
  const layout = resolveCaptionLayout(active, canvas, style);
  const selected = selectedId === active.id;
  const hovered = hoveredId === active.id && !selected;

  return (
    <div
      className={`pv-caption-box ${selected ? "selected" : ""} ${hovered ? "hovered" : ""}`}
      style={captionLayoutToCss(layout, canvas, style)}
      onPointerEnter={() => onHover?.(active.id)}
      onPointerLeave={() => onHover?.(null)}
      onPointerDown={(e) => startDrag(e, active.id, "move", layout)}
      onDoubleClick={(e) => { e.stopPropagation(); onEditText(active.id, active.text); }}
      onClick={(e) => { e.stopPropagation(); onSelect(active.id); }}
    >
      <span className="pv-caption-txt">{active.text}</span>
      {selected && (
        <>
          {CORNERS.map(({ h, cx, cy, cursor }) => (
            <span
              key={h}
              className={`ov-handle ${h}`}
              style={{ left: `${cx * 100}%`, top: `${cy * 100}%`, cursor }}
              onPointerDown={(e) => startDrag(e, active.id, h, layout)}
            />
          ))}
          <span
            className="ov-handle rot"
            style={{ left: "50%", top: "-22px" }}
            onPointerDown={(e) => startDrag(e, active.id, "rot", layout)}
          >
            <RotateCw size={10} strokeWidth={2.5} />
          </span>
        </>
      )}
    </div>
  );
}
