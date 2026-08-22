"use client";

import { useRef, useState } from "react";
import { Captions, FileDown, FileUp, Sparkles, Trash2, Wand2 } from "@/components/icons";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { CaptionBg, CaptionPosition, CaptionStyle } from "@/lib/editor/captionStyle";
import { HEBREW_FONTS } from "@/lib/captions/styles";
import { CAPTION_PRESETS, CaptionPreset } from "@/lib/creative/captionStyles";
import { Button, IconButton, Section, SelectField, Toggle } from "@/components/ui";
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

        <Section title="סגנונות ותבניות כתוביות (1-Click)">
          <div className="cap-body" style={{ padding: 0 }}>
            <div className="caption-presets-mini-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 6 }}>
              {CAPTION_PRESETS.map((preset) => {
                const isCurrent = captionStyle.color === preset.style.color && captionStyle.bg === preset.style.bg && (preset.style.fontFamily ? captionStyle.fontFamily === preset.style.fontFamily : true);
                return (
                  <button
                    key={preset.id}
                    className={`mini-caption-pill ${isCurrent ? "active" : ""}`}
                    onClick={() => applyPreset(preset)}
                    title={preset.descriptionHe}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)",
                      background: isCurrent ? "rgba(108,146,255,0.12)" : "var(--card-bg, rgba(255,255,255,0.03))",
                      cursor: "pointer",
                      textAlign: "right",
                    }}
                  >
                    <span
                      className="swatch"
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 4,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        background: preset.style.bg === "box" ? "#000" : preset.style.bg === "soft" ? "#222" : "transparent",
                        color: preset.style.color,
                        border: `1px solid ${preset.style.color || "#fff"}`,
                      }}
                    >
                      Aa
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span className="name" style={{ fontSize: 11, fontWeight: 600, color: "var(--text-1)" }}>{preset.labelHe}</span>
                      <span style={{ fontSize: 9, color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{preset.style.fontFamily || "ברירת מחדל"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="התאמה אישית של עיצוב">
          <div className="cap-body cap-style" style={{ padding: 0 }}>
            <label className="cap-field">
              <span>גופן עברי</span>
              <SelectField
                value={captionStyle.fontFamily || "Heebo"}
                ariaLabel="גופן עברי"
                options={[
                  ...HEBREW_FONTS.map((font) => ({ value: font.id, label: font.labelHe, description: "גופן מוביל בעברית" })),
                  { value: "Secular One", label: "Secular One — כותרות עבות" }, { value: "Suez One", label: "Suez One — מודגש מלא" },
                  { value: "Varela Round", label: "Varela Round — עגול וחם" }, { value: "Karantina", label: "Karantina — קומפקטי וצר" },
                  { value: "Frank Ruhl Libre", label: "Frank Ruhl Libre — סריפי קלאסי" }, { value: "David Libre", label: "David Libre — תורני מסורתי" },
                  { value: "Amiri", label: "Amiri — אוריינטלי" },
                ]}
                onValueChange={(value) => {
                  loadGoogleFont(value);
                  onCaptionStyle({ fontFamily: value });
                }}
              />
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
              <span>צבע טקסט</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
                <input
                  type="color"
                  value={captionStyle.color}
                  onChange={(e) => onCaptionStyle({ color: e.target.value })}
                  style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: 4, cursor: "pointer" }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  {["#ffffff", "#ffd166", "#06d6a0", "#118ab2", "#ef476f", "#ff9f1c"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onCaptionStyle({ color: c })}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: c,
                        border: captionStyle.color.toLowerCase() === c ? "2px solid var(--accent)" : "1px solid rgba(255,255,255,0.2)",
                        cursor: "pointer",
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </label>
            <label className="cap-field">
              <span>מיקום</span>
              <SelectField value={captionStyle.position} ariaLabel="מיקום כתוביות" options={[
                { value: "bottom", label: "למטה" }, { value: "center", label: "מרכז" }, { value: "top", label: "למעלה" },
              ]} onValueChange={(value) => onCaptionStyle({ position: value as CaptionPosition })} />
            </label>
            <label className="cap-field">
              <span>רקע</span>
              <SelectField value={captionStyle.bg} ariaLabel="רקע כתוביות" options={[
                { value: "soft", label: "רך" }, { value: "box", label: "קופסה" }, { value: "none", label: "ללא (שקוף)" },
              ]} onValueChange={(value) => onCaptionStyle({ bg: value as CaptionBg })} />
            </label>
            <div className="cap-field">
              <span>מודגש (Bold)</span>
              <Toggle checked={captionStyle.bold} onChange={(v) => onCaptionStyle({ bold: v })} />
            </div>
            <div className="cap-field">
              <span>צריבה בייצוא</span>
              <Toggle checked={burnCaptions} onChange={onBurnCaptions} tip="צרוב כתוביות בתוך קובץ הווידאו הסופי" />
            </div>
            <div className="cap-hint">הסגנון מופיע מיד בתצוגה המקדימה. אם נבחר «צריבה בייצוא» — ייצרב גם בווידאו המיוצא.</div>
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
