"use client";

import { Scissors, Trash2, Magnet, ZoomIn, ZoomOut, Maximize2, SquareDashed, ArrowLeftRight, BetweenHorizontalStart } from "lucide-react";
import { IconButton } from "@/components/ui";
import { clampZoom, ZOOM_MAX, ZOOM_MIN } from "@/lib/editor/time";

export default function TimelineToolbar({
  selInfo, canSplit, canDelete, onSplit, onDelete, onDeleteLeaveGap, canLeaveGap,
  canRoll, canSlip, onRoll, onSlip,
  snap, onSnap, zoom, onZoom, onFit,
}: {
  selInfo: string; canSplit: boolean; canDelete: boolean;
  onSplit: () => void; onDelete: () => void; onDeleteLeaveGap?: () => void; canLeaveGap?: boolean;
  canRoll?: boolean; canSlip?: boolean; onRoll?: (delta: number) => void; onSlip?: (delta: number) => void;
  snap: boolean; onSnap: (v: boolean) => void;
  zoom: number; onZoom: (v: number) => void; onFit: () => void;
}) {
  // סליידר לוגריתמי — נוח מ-0.15 עד 128
  const toSlider = (z: number) => Math.log(Math.max(ZOOM_MIN, z) / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
  const fromSlider = (t: number) => clampZoom(ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, t));

  return (
    <div className="tl-toolbar" dir="ltr">
      <IconButton icon={Scissors} tip="פצל בראש-הנגן (S)" tipPos="up" disabled={!canSplit} onClick={onSplit} />
      <IconButton icon={Trash2} tip="מחק קטע (Delete)" tipPos="up" danger disabled={!canDelete} onClick={() => onDelete()} />
      <IconButton icon={SquareDashed} tip="מחק והשאר רווח (Shift+Delete)" tipPos="up" disabled={!canLeaveGap} onClick={() => onDeleteLeaveGap?.()} />
      <div className="vdivider" />
      <IconButton icon={ArrowLeftRight} tip="Roll — הזז חיתוך בין שני קטעים (Alt+←/→)" tipPos="up"
        disabled={!canRoll} onClick={() => onRoll?.(0.1)} />
      <IconButton icon={BetweenHorizontalStart} tip="Slip — החלק את המקור בלי לשנות אורך ([ / ])" tipPos="up"
        disabled={!canSlip} onClick={() => onSlip?.(0.1)} />
      <div className="vdivider" />
      <IconButton icon={Magnet} tip="הצמדה לקצוות" tipPos="up" active={snap} onClick={() => onSnap(!snap)} />
      {selInfo && <span className="tl-selinfo">{selInfo}</span>}
      <div className="grow" />
      <div className="tl-zoom">
        <IconButton icon={ZoomOut} tip="הקטן תצוגה" tipPos="up" disabled={zoom <= ZOOM_MIN + 1e-6}
          onClick={() => onZoom(clampZoom(zoom / 1.25))} />
        <input type="range" min={0} max={1} step={0.001} value={toSlider(zoom)}
          onChange={(e) => onZoom(fromSlider(+e.target.value))}
          aria-label="זום ציר זמן" />
        <IconButton icon={ZoomIn} tip="הגדל תצוגה" tipPos="up" disabled={zoom >= ZOOM_MAX - 1e-6}
          onClick={() => onZoom(clampZoom(zoom * 1.25))} />
        <span className="tl-zoom-pct" title="Pinch / Ctrl+גלגלת = זום · שתי אצבעות לצד = גלילה">{Math.round(zoom * 100)}%</span>
        <IconButton icon={Maximize2} tip="התאם לרוחב" tipPos="up" onClick={onFit} />
      </div>
    </div>
  );
}
