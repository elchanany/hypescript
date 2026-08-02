"use client";

import { useRef } from "react";
import { Captions, FileDown, FileUp, Trash2, Wand2 } from "lucide-react";
import { Sub } from "@/lib/editor/subtitlesEdl";
import { Button, IconButton, Section } from "@/components/ui";

export default function CaptionsPanel({
  script, onScript, onAnalyze, analyzing, hasMain, hasWords,
  subs, onGenerate, onImportSrt, onExportSrt, onEditSub, onDelSub,
}: {
  script: string; onScript: (v: string) => void; onAnalyze: () => void; analyzing: boolean;
  hasMain: boolean; hasWords: boolean;
  subs: Sub[] | null; onGenerate: () => void; onImportSrt: (f: File | null) => void; onExportSrt: () => void;
  onEditSub: (id: string, text: string) => void; onDelSub: (id: string) => void;
}) {
  const srtRef = useRef<HTMLInputElement>(null);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

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
                  <div key={s.id} className="sub-item">
                    <span className="idx">{i + 1}</span>
                    <span className="tspan">{fmt(s.start)}</span>
                    <input value={s.text} onChange={(e) => onEditSub(s.id, e.target.value)} />
                    <IconButton icon={Trash2} tip="מחק" tipPos="left" danger onClick={() => onDelSub(s.id)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="cap-hint">אין כתוביות עדיין. תמלל ואז לחץ “צור”, או ייבא קובץ SRT.</div>
            )}
          </div>
        </Section>
      </div>
    </>
  );
}
