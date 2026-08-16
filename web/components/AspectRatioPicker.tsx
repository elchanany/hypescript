"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Square, Film, Maximize2, LayoutGrid } from "@/components/icons";
import { CanvasSize, ASPECT_RATIO_PRESETS, AspectRatioPreset } from "@/lib/editor/canvasCoords";

interface AspectRatioPickerProps {
  currentCanvas: CanvasSize;
  onChangeCanvas: (canvas: CanvasSize) => void;
  className?: string;
}

export function AspectRatioPicker({ currentCanvas, onChangeCanvas, className = "" }: AspectRatioPickerProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Determine current active preset
  const activePreset = ASPECT_RATIO_PRESETS.find(
    (p) => p.width === currentCanvas.width && p.height === currentCanvas.height
  ) || {
    id: "custom",
    name: "מותאם אישית",
    nameHe: "מותאם אישית",
    ratio: `${currentCanvas.width}:${currentCanvas.height}`,
    width: currentCanvas.width,
    height: currentCanvas.height,
    platformHint: `${currentCanvas.width}×${currentCanvas.height}`,
  };

  const getPresetIcon = (presetId: string) => {
    switch (presetId) {
      case "9:16":
      case "4:5":
        return <Film size={14} className="flex-none text-emerald-400" />;
      case "16:9":
      case "21:9":
        return <Maximize2 size={14} className="flex-none text-sky-400" />;
      case "1:1":
        return <Square size={14} className="flex-none text-amber-400" />;
      default:
        return <LayoutGrid size={14} className="flex-none text-indigo-400" />;
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="aspect-ratio-btn flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--panel-2)] hover:bg-[var(--panel)] text-[var(--text-1)] transition-colors shadow-sm"
        onClick={() => setOpen(!open)}
        data-tip="יחס מסך / פורמט (טיקטוק, יוטיוב, ריבוע ועוד)"
        data-tippos="down"
        aria-label="בחר יחס תצוגה"
      >
        {getPresetIcon(activePreset.id)}
        <span className="font-semibold">{activePreset.ratio}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="aspect-ratio-menu absolute bottom-[calc(100%+6px)] inset-inline-start-0 min-w-[240px] p-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-2xl backdrop-blur-md text-xs animate-in fade-in zoom-in-95 duration-100"
          style={{ backgroundColor: "var(--panel-bg, #121826)", borderColor: "var(--border, #2a3447)", zIndex: 9999 }}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold tracking-wider text-[var(--text-3)] uppercase border-b border-[var(--border)] mb-1">
            פורמט ומידות וידאו
          </div>
          <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto">
            {ASPECT_RATIO_PRESETS.map((preset) => {
              const isSelected = preset.width === currentCanvas.width && preset.height === currentCanvas.height;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    onChangeCanvas({ width: preset.width, height: preset.height });
                    setOpen(false);
                  }}
                  className={`flex items-center justify-between gap-3 px-2.5 py-2 rounded-md transition-colors text-right ${
                    isSelected
                      ? "bg-indigo-600/20 text-indigo-300 font-semibold"
                      : "hover:bg-white/5 text-[var(--text-2)] hover:text-[var(--text-1)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getPresetIcon(preset.id)}
                    <div className="flex flex-col text-right">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[var(--text-1)]">{preset.ratio}</span>
                        <span className="text-[11px] text-[var(--text-2)]">({preset.nameHe})</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-3)] truncate">{preset.platformHint}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={14} className="text-indigo-400 flex-none ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
