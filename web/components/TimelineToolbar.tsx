"use client";

import {
  Scissors, Trash2, ZoomIn, ZoomOut, Maximize2, SquareDashed, ArrowLeftRight,
  BetweenHorizontalStart, Link2, Unlink2, RotateCcw, RotateCw, Cursor, Mic,
  Bookmark, Flag, Magnet, Sparkles, Plus, Split,
} from "@/components/icons";
import { IconButton } from "@/components/ui";
import { clampZoom, ZOOM_MAX, ZOOM_MIN } from "@/lib/editor/time";

export default function TimelineToolbar({
  selInfo,
  canSplit,
  canDelete,
  onSplit,
  onTrimStart,
  canTrimStart,
  onTrimEnd,
  canTrimEnd,
  onDelete,
  onDeleteLeaveGap,
  canLeaveGap,
  canRoll,
  canSlip,
  onRoll,
  onSlip,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  activeTool = "select",
  onSelectTool,
  snap = true,
  onToggleSnap,
  onAddMarker,
  onRecordVoiceover,
  zoom,
  onZoom,
  onFit,
  avLinked,
  onAvLinked,
}: {
  selInfo: string;
  canSplit: boolean;
  canDelete: boolean;
  onSplit: () => void;
  onTrimStart?: () => void;
  canTrimStart?: boolean;
  onTrimEnd?: () => void;
  canTrimEnd?: boolean;
  onDelete: () => void;
  onDeleteLeaveGap?: () => void;
  canLeaveGap?: boolean;
  canRoll?: boolean;
  canSlip?: boolean;
  onRoll?: (delta: number) => void;
  onSlip?: (delta: number) => void;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  activeTool?: "select" | "blade";
  onSelectTool?: (tool: "select" | "blade") => void;
  snap?: boolean;
  onToggleSnap?: () => void;
  onAddMarker?: () => void;
  onRecordVoiceover?: () => void;
  zoom: number;
  onZoom: (v: number) => void;
  onFit: () => void;
  avLinked?: boolean;
  onAvLinked?: (v: boolean) => void;
}) {
  const toSlider = (z: number) => Math.log(Math.max(ZOOM_MIN, z) / ZOOM_MIN) / Math.log(ZOOM_MAX / ZOOM_MIN);
  const fromSlider = (t: number) => clampZoom(ZOOM_MIN * Math.pow(ZOOM_MAX / ZOOM_MIN, t));
  const zoomPercent = zoom < 0.01
    ? `${(zoom * 100).toFixed(2)}%`
    : zoom < 0.1
      ? `${(zoom * 100).toFixed(1)}%`
      : `${Math.round(zoom * 100)}%`;

  return (
    <div className="tl-toolbar" dir="ltr">
      {/* Selection & Cut Modes (CapCut Left Group) */}
      <div className="tl-btn-group">
        <IconButton
          icon={Cursor}
          tip="כלי בחירה (V)"
          tipPos="up"
          active={activeTool === "select"}
          onClick={() => onSelectTool?.("select")}
        />
        <IconButton
          icon={Scissors}
          tip="כלי סכין / חיתוך (B)"
          tipPos="up"
          active={activeTool === "blade"}
          onClick={() => onSelectTool?.("blade")}
        />
      </div>

      <div className="vdivider" />

      {/* History Controls */}
      <div className="tl-btn-group">
        <IconButton
          icon={RotateCcw}
          tip="בטל פעולה (Ctrl+Z)"
          tipPos="up"
          disabled={!canUndo}
          onClick={onUndo}
        />
        <IconButton
          icon={RotateCw}
          tip="בצע שוב (Ctrl+Shift+Z)"
          tipPos="up"
          disabled={!canRedo}
          onClick={onRedo}
        />
      </div>

      <div className="vdivider" />

      {/* Editing & Trimming Actions */}
      <div className="tl-btn-group">
        <IconButton
          icon={Split}
          tip="פצל בראש-הנגן (Ctrl+B / S)"
          tipPos="up"
          disabled={!canSplit}
          onClick={onSplit}
        />
        <IconButton
          icon={ArrowLeftRight}
          tip="מחק שמאלה מהסמן — Trim Left (Q)"
          tipPos="up"
          disabled={!canTrimStart}
          onClick={onTrimStart}
        />
        <IconButton
          icon={BetweenHorizontalStart}
          tip="מחק ימינה מהסמן — Trim Right (W)"
          tipPos="up"
          disabled={!canTrimEnd}
          onClick={onTrimEnd}
        />
        <IconButton
          icon={Trash2}
          tip="מחק קטע נבחר (Delete)"
          tipPos="up"
          danger
          disabled={!canDelete}
          onClick={() => onDelete()}
        />
        <IconButton
          icon={SquareDashed}
          tip="מחק והשאר רווח (Shift+Delete)"
          tipPos="up"
          disabled={!canLeaveGap}
          onClick={() => onDeleteLeaveGap?.()}
        />
      </div>

      <div className="vdivider" />

      {/* Markers & Extras */}
      <div className="tl-btn-group">
        <IconButton
          icon={Flag}
          tip="הוסף סימניה / מרקר (M)"
          tipPos="up"
          onClick={onAddMarker}
        />
        {onRecordVoiceover && (
          <IconButton
            icon={Mic}
            tip="הקלטת קריינות / Voiceover"
            tipPos="up"
            onClick={onRecordVoiceover}
          />
        )}
      </div>

      <div className="vdivider" />

      {/* Track & Snapping Linkages */}
      <div className="tl-btn-group">
        <IconButton
          icon={Magnet}
          tip={snap ? "הצמדה אוטומטית / Magnet פעיל (N)" : "הצמדה כבויה — לחץ להפעלה"}
          tipPos="up"
          active={snap}
          onClick={onToggleSnap}
        />
        <IconButton
          icon={avLinked !== false ? Link2 : Unlink2}
          tip={avLinked !== false
            ? "וידאו↔אודיו מקושרים (חיתוך משותף) — לחץ לשחרור בחירה נפרדת"
            : "בחירה נפרדת — לחץ לקישור וידאו↔אודיו"}
          tipPos="up"
          active={avLinked !== false}
          onClick={() => onAvLinked?.(!(avLinked !== false))}
        />
      </div>

      {selInfo && <span className="tl-selinfo">{selInfo}</span>}

      <div className="grow" />

      {/* Zoom Controls (CapCut Right Group) */}
      <div className="tl-zoom">
        <IconButton
          icon={ZoomOut}
          tip="הקטן תצוגה"
          tipPos="up"
          disabled={zoom <= ZOOM_MIN + 1e-6}
          onClick={() => onZoom(clampZoom(zoom / 1.25))}
        />
        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={toSlider(zoom)}
          onChange={(e) => onZoom(fromSlider(+e.target.value))}
          aria-label="זום ציר זמן"
        />
        <IconButton
          icon={ZoomIn}
          tip="הגדל תצוגה"
          tipPos="up"
          disabled={zoom >= ZOOM_MAX - 1e-6}
          onClick={() => onZoom(clampZoom(zoom * 1.25))}
        />
        <span className="tl-zoom-pct" title="Pinch / Ctrl+גלגלת = זום · שתי אצבעות לצד = גלילה">
          {zoomPercent}
        </span>
        <IconButton icon={Maximize2} tip="התאם לרוחב" tipPos="up" onClick={onFit} />
      </div>
    </div>
  );
}
