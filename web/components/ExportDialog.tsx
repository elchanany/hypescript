"use client";

import { useEffect } from "react";
import { CheckCircle2, Download, Film, Loader2, RotateCcw, Square, X } from "@/components/icons";
import { estimateRemainingSeconds, exportPercent, formatBytes, formatDurationHe } from "@/lib/render/exportProgress";

export interface ExportResult {
  url: string;
  name: string;
  size: number;
}

interface Props {
  open: boolean;
  rendering: boolean;
  progress: number;
  elapsedSeconds: number;
  phase: string;
  error: string;
  result: ExportResult | null;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
}

export default function ExportDialog({ open, rendering, progress, elapsedSeconds, phase, error, result, onClose, onCancel, onRetry }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  const percent = exportPercent(progress);
  const remaining = estimateRemainingSeconds(progress, elapsedSeconds);

  return (
    <div className="export-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="export-card" role="dialog" aria-modal="true" aria-labelledby="export-title" dir="rtl">
        <header className="export-head">
          <div className={`export-mark ${result ? "done" : error ? "failed" : ""}`}>
            {rendering ? <Loader2 className="spin" size={21} /> : result ? <CheckCircle2 size={21} /> : <Film size={21} />}
          </div>
          <div>
            <h2 id="export-title">{result ? "הסרטון מוכן" : error ? "הייצוא נעצר" : "מייצאים את הסרטון"}</h2>
            <p>{result ? "אפשר לצפות בתוצאה ולהוריד אותה למחשב." : error || phase || "מכינים את הפרויקט לרינדור…"}</p>
          </div>
          <button type="button" className="iconbtn export-close" onClick={onClose} aria-label={rendering ? "הסתר מצב ייצוא" : "סגור"}><X size={17} /></button>
        </header>

        {rendering && (
          <div className="export-running" aria-live="polite">
            <div className="export-progress-row"><strong>{percent}%</strong><span>{phase || "מרנדר…"}</span></div>
            <div className="export-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }} /></div>
            <div className="export-stats">
              <span>עברו {formatDurationHe(elapsedSeconds)}</span>
              <span>{remaining == null ? "מחשב זמן שנותר…" : `נותרו בערך ${formatDurationHe(remaining)}`}</span>
            </div>
            <div className="export-note">אפשר להסתיר את החלון ולהמשיך לעבוד. השאר את Hypescript פתוח עד לסיום.</div>
            <button type="button" className="btn ghost export-cancel" onClick={onCancel}><Square size={13} />בטל ייצוא</button>
          </div>
        )}

        {result && !rendering && (
          <div className="export-result">
            <video src={result.url} controls playsInline preload="metadata" />
            <div className="export-file">
              <div><strong>{result.name}</strong><span>{formatBytes(result.size)}</span></div>
              <a className="btn primary tall" href={result.url} download={result.name}><Download size={16} />הורד סרטון</a>
            </div>
          </div>
        )}

        {error && !rendering && (
          <div className="export-error-actions">
            <button type="button" className="btn primary tall" onClick={onRetry}><RotateCcw size={15} />נסה שוב</button>
            <button type="button" className="btn ghost tall" onClick={onClose}>סגור</button>
          </div>
        )}
      </section>
    </div>
  );
}
