"use client";

import { useRef, useState } from "react";
import { Captions, FileDown, FileUp, Sparkles, Trash2, Wand2 } from "@/components/icons";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CaptionBg, CaptionPosition, CaptionStyle } from "@/lib/editor/captionStyle";
import { HEBREW_FONTS } from "@/lib/captions/styles";
import { CAPTION_PRESETS, CaptionPreset } from "@/lib/creative/captionStyles";
import { Button, IconButton, Section, Toggle } from "@/components/ui";
import { loadGoogleFont } from "@/lib/creative/fonts";

export default function CaptionsPanel({
  script, onScript, onAnalyze, analyzing, hasMain, hasWords,
  subs, onGenerate, onImportSrt, onExportSrt, onEditSub, onDelSub,
  onSubMenu,
  captionStyle, onCaptionStyle,
  burnCaptions, onBurnCaptions,
}: {
  script: string; onScript: (v: string) => void; onAnalyze: () => void; analyzing: boolean;
  hasMain: boolean; hasWords: boolean;
  subs: Sub[] | null; onGenerate: () => void; onImportSrt: (f: File | null) => void; onExportSrt: () => void;
  onEditSub: (id: string, text: string) => void; onDelSub: (id: string) => void;
  onSubMenu?: (id: string, x: number, y: number) => void;
  captionStyle: CaptionStyle;
  onCaptionStyle: (patch: Partial<CaptionStyle>) => void;
  burnCaptions: boolean;
  onBurnCaptions: (v: boolean) => void;
}) {
  const srtRef = useRef<HTMLInputElement>(null);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const applyPreset = (preset: CaptionPreset) => {
    if (preset.style.fontFamily) loadGoogleFont(preset.style.fontFamily);
    onCaptionStyle({
      fontSize: preset.style.fontSize,
      color: preset.style.color,
      bold: preset.style.bold,
      position: preset.style.position,
      bg: preset.style.bg,
      fontFamily: preset.style.fontFamily,
    });
  };

  return (
    <>
      <div className="panel-header">
        <span className="title"><Captions size={15} strokeWidth={1.75} />כתוביות וסקריפט</span>
      </div>
      <div className="panel-scroll">
        <Section title="סקריפט לחיתוך">
          <div className="cap-body" style={{ padding: 0 }}>
            <textarea value={script} onChange={(e) => onScript(e.target.value)}
              placeholder="הטקסט שאמור להישאר, בסדר הרצוי (אפשר לחזור על קטע)…" />
            <Button variant="secondary" icon={Wand2} onClick={onAnalyze} disabled={analyzing || !hasMain}>
              {analyzing ? "מנתח…" : hasWords ? "בנה ציר מחדש מהסקריפט" : "תמלל ובנה ציר"}
            </Button>
            <div className="cap-hint">מתמלל את הסרטון (פעם אחת) ובונה את הציר לפי הטקסט שסימנת.</div>
          </div>
        </Section>

        <Section title="סגנונות ויראליים מוכנים (1-Click)">
          <div className="cap-body" style={{ padding: 0 }}>
            <div className="caption-presets-mini-grid">
              {CAPTION_PRESETS.slice(0, 8).map((preset) => {
                const isCurrent = captionStyle.color === preset.style.color && captionStyle.bg === preset.style.bg;
                return (
                  <button
                    key={preset.id}
                    className={`mini-caption-pill ${isCurrent ? "active" : ""}`}
                    onClick={() => applyPreset(preset)}
                    title={preset.descriptionHe}
                  >
                    <span
                      className="swatch"
                      style={{
                        background: preset.style.bg === "box" ? "#000" : preset.style.bg === "soft" ? "#333" : "transparent",
                        color: preset.style.color,
                        borderColor: preset.style.color,
                      }}
                    >
                      Aa
                    </span>
                    <span className="name">{preset.labelHe}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="התאמה אישית">
          <div className="cap-body cap-style" style={{ padding: 0 }}>
            <label className="cap-field">
              <span>גופן</span>
              <select
                value={captionStyle.fontFamily || "Heebo"}
                onChange={(e) => {
                  loadGoogleFont(e.target.value);
                  onCaptionStyle({ fontFamily: e.target.value });
                }}
              >
                {HEBREW_FONTS.map((font) => (
                  <option key={font.id} value={font.id}>{font.labelHe}</option>
                ))}
              </select>
            </label>
            <label className="cap-field">
              <span>גודל</span>
              <input
                type="range" min={2.5} max={9} step={0.25}
                value={captionStyle.fontSize}
                onChange={(e) => onCaptionStyle({ fontSize: +e.target.value })}
              />
              <span className="mono">{captionStyle.fontSize.toFixed(1)}</span>
            </label>
            <label className="cap-field">
              <span>צבע</span>
              <input
                type="color"
                value={captionStyle.color}
                onChange={(e) => onCaptionStyle({ color: e.target.value })}
              />
            </label>
            <label className="cap-field">
              <span>מיקום</span>
              <select
                value={captionStyle.position}
                onChange={(e) => onCaptionStyle({ position: e.target.value as CaptionPosition })}
              >
                <option value="bottom">למטה</option>
                <option value="center">מרכז</option>
                <option value="top">למעלה</option>
              </select>
            </label>
            <label className="cap-field">
              <span>רקע</span>
              <select
                value={captionStyle.bg}
                onChange={(e) => onCaptionStyle({ bg: e.target.value as CaptionBg })}
              >
                <option value="soft">רך</option>
                <option value="box">קופסה</option>
                <option value="none">ללא</option>
              </select>
            </label>
            <div className="cap-field">
              <span>מודגש</span>
              <Toggle checked={captionStyle.bold} onChange={(v) => onCaptionStyle({ bold: v })} />
            </div>
            <div className="cap-field">
              <span>צריבה</span>
              <Toggle checked={burnCaptions} onChange={onBurnCaptions} tip="צרוב כתוביות בתוך הייצוא" />
            </div>
            <div className="cap-hint">הסגנון מופיע בתצוגה המקדימה. עם «צריבה» — נכלל גם בקובץ הייצוא.</div>
          </div>
        </Section>

        <Section title="כתוביות">
          <div className="cap-body" style={{ padding: 0 }}>
            <div className="row" style={{ gap: 6 }}>
              <Button variant="secondary" size="sm" icon={Captions} onClick={onGenerate} disabled={!hasWords}>צור</Button>
              <Button variant="secondary" size="sm" icon={FileUp} onClick={() => srtRef.current?.click()}>ייבא</Button>
              <Button variant="secondary" size="sm" icon={FileDown} onClick={onExportSrt} disabled={!hasWords && !subs}>ייצא</Button>
              <input ref={srtRef} type="file" accept=".srt,text/plain" hidden
                onChange={(e) => { onImportSrt(e.target.files?.[0] || null); e.currentTarget.value = ""; }} />
            </div>
            {subs && subs.length > 0 ? (
              <div className="sub-list">
                {subs.map((s, i) => (
                  <div key={s.id} className="sub-item" onContextMenu={(event) => {
                    if (event.target instanceof HTMLInputElement) return;
                    event.preventDefault();
                    onSubMenu?.(s.id, event.clientX, event.clientY);
                  }}>
                    <span className="idx">{i + 1}</span>
                    <span className="tspan">{fmt(s.start)}</span>
                    <input value={s.text} onChange={(e) => onEditSub(s.id, e.target.value)} />
                    <IconButton icon={Trash2} tip="מחק" tipPos="left" danger onClick={() => onDelSub(s.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="cap-hint">אין כתוביות עדיין. לאחר תמלול אפשר לבחור “יצירה”, או לייבא קובץ SRT.</div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
