"use client";

import { Scissors, Trash2, Magnet, ZoomIn, ZoomOut, Maximize2, SquareDashed } from "lucide-react";
import { IconButton } from "@/components/ui";

export default function TimelineToolbar({
  selInfo, canSplit, canDelete, onSplit, onDelete, onDeleteLeaveGap, canLeaveGap, snap, onSnap, zoom, onZoom, onFit,
}: {
  selInfo: string; canSplit: boolean; canDelete: boolean;
  onSplit: () => void; onDelete: () => void; onDeleteLeaveGap?: () => void; canLeaveGap?: boolean;
  snap: boolean; onSnap: (v: boolean) => void;
  zoom: number; onZoom: (v: number) => void; onFit: () => void;
}) {
  return (
    <div className="tl-toolbar" dir="ltr">
      <IconButton icon={Scissors} tip="פצל בראש-הנגן (S)" tipPos="up" disabled={!canSplit} onClick={onSplit} />
      <IconButton icon={Trash2} tip="מחק קטע (Delete)" tipPos="up" danger disabled={!canDelete} onClick={() => onDelete()} />
      <IconButton icon={SquareDashed} tip="מחק והשאר רווח (Shift+Delete)" tipPos="up" disabled={!canLeaveGap} onClick={() => onDeleteLeaveGap?.()} />
      <div className="vdivider" />
      <IconButton icon={Magnet} tip="הצמדה לקצוות" tipPos="up" active={snap} onClick={() => onSnap(!snap)} />
      {selInfo && <span className="tl-selinfo">{selInfo}</span>}
      <div className="grow" />
      <div className="tl-zoom">
        <IconButton icon={ZoomOut} tip="הקטן תצוגה" tipPos="up" disabled={zoom <= 1} onClick={() => onZoom(Math.max(1, zoom - 1))} />
        <input type="range" min={1} max={12} step={0.5} value={zoom} onChange={(e) => onZoom(+e.target.value)} />
        <IconButton icon={ZoomIn} tip="הגדל תצוגה" tipPos="up" disabled={zoom >= 12} onClick={() => onZoom(Math.min(12, zoom + 1))} />
        <IconButton icon={Maximize2} tip="התאם לרוחב" tipPos="up" onClick={onFit} />
      </div>
    </div>
  );
}
