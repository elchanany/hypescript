"use client";

import { useMemo, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import {
  DEFAULT_POLICY,
  presetApplies,
  storageOptionsForMode,
  type AspectRatio,
  type DataMode,
  type ProcessingPreset,
  type ProjectExecutionPolicy,
  type ProjectFps,
  type ProjectResolution,
  type StorageBackend,
} from "@/lib/projects/types";

const STEPS = ["פרטים", "מצב נתונים", "אחסון", "עיבוד", "ספקים", "סיכום"] as const;

export interface WizardResult {
  name: string;
  policy: ProjectExecutionPolicy;
}

interface Props {
  open: boolean;
  initialName?: string;
  onClose: () => void;
  onCreate: (result: WizardResult) => Promise<void>;
}

export default function NewProjectWizard({ open, initialName = "פרויקט חדש", onClose, onCreate }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [policy, setPolicy] = useState<ProjectExecutionPolicy>(() => DEFAULT_POLICY());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageOpts = useMemo(() => storageOptionsForMode(policy.dataMode), [policy.dataMode]);
  const selectedStorage = storageOpts.find((s) => s.id === policy.storageBackend);

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 2) {
      // Cannot proceed with unavailable cloud storage selected as sole backend for cloud-only
      if (policy.dataMode === "cloud" && selectedStorage && !selectedStorage.available) {
        // Allow continuing only if they understand fallback — we require an available option
        return storageOpts.some((s) => s.available && s.id === policy.storageBackend);
      }
      return !!policy.storageBackend;
    }
    return true;
  };

  const canCreate = () => {
    if (!name.trim()) return false;
    if (policy.dataMode === "cloud") {
      const avail = storageOpts.find((s) => s.id === policy.storageBackend);
      // Honest: cloud project may be created with browser fallback until storage health exists
      return !!avail;
    }
    return true;
  };

  const patch = (partial: Partial<ProjectExecutionPolicy>) => {
    setPolicy((p) => ({ ...p, ...partial, updatedAt: Date.now() }));
  };

  const setMode = (dataMode: DataMode) => {
    const opts = storageOptionsForMode(dataMode);
    const firstAvail = opts.find((o) => o.available)?.id || "browser_storage";
    patch({
      dataMode,
      storageBackend: firstAvail,
      allowCloudMetadata: dataMode !== "local" ? true : false,
    });
  };

  const applyPreset = (processingPreset: ProcessingPreset) => {
    const applied = presetApplies(processingPreset);
    const next = { ...policy, ...applied, processingPreset, updatedAt: Date.now() };
    if (applied.dataMode) {
      const opts = storageOptionsForMode(applied.dataMode);
      if (!opts.some((o) => o.id === next.storageBackend && o.available)) {
        next.storageBackend = (opts.find((o) => o.available)?.id || "browser_storage") as StorageBackend;
      }
    }
    setPolicy(next);
  };

  const submit = async () => {
    if (!canCreate()) return;
    setBusy(true); setError(null);
    try {
      await onCreate({ name: name.trim(), policy });
    } catch (e: any) {
      setError(e?.message || "יצירה נכשלה");
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="wiz-backdrop" role="dialog" aria-modal="true" aria-labelledby="wiz-title">
      <div className="wiz-card">
        <div className="wiz-head">
          <BrandLogo variant="icon" size="sm" decorative />
          <div>
            <h2 id="wiz-title">פרויקט חדש</h2>
            <p className="wiz-sub">שלב {step + 1} מתוך {STEPS.length}: {STEPS[step]}</p>
          </div>
          <button type="button" className="wiz-close" onClick={onClose} aria-label="סגור">×</button>
        </div>

        <ol className="wiz-steps" aria-hidden>
          {STEPS.map((label, i) => (
            <li key={label} className={i === step ? "on" : i < step ? "done" : ""}>{label}</li>
          ))}
        </ol>

        <div className="wiz-body">
          {step === 0 && (
            <div className="wiz-fields">
              <label className="dlg-field">
                שם הפרויקט
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </label>
              <label className="dlg-field">
                יחס מסך
                <select value={policy.aspectRatio} onChange={(e) => patch({ aspectRatio: e.target.value as AspectRatio })}>
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:5">4:5</option>
                </select>
              </label>
              <label className="dlg-field">
                רזולוציה
                <select value={policy.resolution} onChange={(e) => patch({ resolution: e.target.value as ProjectResolution })}>
                  <option value="720p">720p</option>
                  <option value="1080p">1080p</option>
                  <option value="4k">4K</option>
                </select>
              </label>
              <label className="dlg-field">
                קצב פריימים
                <select value={policy.fps} onChange={(e) => patch({ fps: Number(e.target.value) as ProjectFps })}>
                  <option value={24}>24</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                </select>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="wiz-modes">
              {([
                ["local", "Local", "הקבצים נשארים במכשיר. אין העלאה אוטומטית. לא זמין ממכשיר אחר."],
                ["cloud", "Cloud", "מניפסט בענן; נכסים באחסון מחובר. זמין ממכשירים אחרים אחרי חיבור Storage."],
                ["hybrid", "Hybrid", "מניפסט בענן; מקורות יכולים להישאר מקומיים. כל פעולה בוחרת Local/Cloud."],
              ] as const).map(([id, title, desc]) => (
                <button
                  key={id}
                  type="button"
                  className={`wiz-mode ${policy.dataMode === id ? "on" : ""}`}
                  onClick={() => setMode(id)}
                >
                  <strong>{title}</strong>
                  <span>{desc}</span>
                </button>
              ))}
              {policy.dataMode === "local" && (
                <label className="check wiz-check">
                  <input
                    type="checkbox"
                    checked={policy.allowCloudMetadata}
                    onChange={(e) => patch({ allowCloudMetadata: e.target.checked })}
                  />
                  <span>שמור רק מטא־דאטה בסיסי בענן (שם/תאריך) — בלי קבצי מקור</span>
                </label>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="wiz-fields">
              <p className="wiz-hint">מוצגים רק ספקים רלוונטיים. ספק לא מחובר לא מסומן כפעיל.</p>
              {storageOpts.map((opt) => (
                <label key={opt.id} className={`wiz-option ${!opt.available ? "disabled" : ""} ${policy.storageBackend === opt.id ? "on" : ""}`}>
                  <input
                    type="radio"
                    name="storage"
                    disabled={!opt.available && policy.dataMode === "local"}
                    checked={policy.storageBackend === opt.id}
                    onChange={() => patch({ storageBackend: opt.id })}
                  />
                  <span>
                    <strong>{opt.label}</strong>
                    {!opt.available && <em> — {opt.reason || "לא זמין (אין health-check)"}</em>}
                    {opt.available && <em className="ok"> — זמין</em>}
                  </span>
                </label>
              ))}
              {policy.dataMode !== "local" && !storageOpts.some((o) => o.available && !["browser_storage", "local_filesystem"].includes(o.id)) && (
                <div className="wiz-warn">
                  אין Storage ענן מחובר כרגע. אפשר ליצור פרויקט Cloud/Hybrid עם אחסון דפדפן בינתיים —
                  בלי סימון ספק ענן כ«מחובר».
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="wiz-modes">
              {([
                ["max_privacy", "פרטיות מרבית"],
                ["free_only", "חינם בלבד"],
                ["local_only", "מקומי בלבד"],
                ["recommended_hybrid", "Hybrid מומלץ"],
                ["cloud_fast", "Cloud מהיר"],
                ["max_quality", "איכות מקסימלית"],
                ["custom", "מותאם אישית"],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`wiz-mode compact ${policy.processingPreset === id ? "on" : ""}`}
                  onClick={() => applyPreset(id)}
                >
                  <strong>{label}</strong>
                </button>
              ))}
              <label className="check wiz-check">
                <input
                  type="checkbox"
                  checked={policy.zeroCostPreferred}
                  onChange={(e) => patch({ zeroCostPreferred: e.target.checked })}
                />
                <span>העדף מצב ללא עלות מערכת (Zero-cost) כשאפשר</span>
              </label>
            </div>
          )}

          {step === 4 && (
            <div className="wiz-fields">
              <p className="wiz-hint">ברירות מחדל לפי יכולת. סטטוס «מחובר» רק אחרי health-check אמיתי (חבילה E).</p>
              {([
                ["llm", "AI / LLM", policy.capabilities.llm?.providerId || "deepseek"],
                ["transcription", "תמלול", policy.capabilities.transcription?.providerId || "groq-transcribe"],
                ["render", "רינדור", "ffmpeg-wasm (מקומי)"],
                ["storage", "אחסון", policy.storageBackend],
              ] as const).map(([key, label, value]) => (
                <div key={key} className="wiz-cap-row">
                  <strong>{label}</strong>
                  <span>{value}</span>
                  <em>סטטוס: לא נבדק כמחובר אוטומטית</em>
                </div>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="wiz-review">
              <h3>{name.trim() || "פרויקט"}</h3>
              <ul>
                <li>מצב: <strong>{policy.dataMode}</strong></li>
                <li>יחס / רזולוציה / FPS: {policy.aspectRatio} · {policy.resolution} · {policy.fps}</li>
                <li>אחסון: {policy.storageBackend}</li>
                <li>Preset: {policy.processingPreset}</li>
                <li>מטא־דאטה בענן: {policy.allowCloudMetadata ? "כן" : "לא"}</li>
                <li>Zero-cost מועדף: {policy.zeroCostPreferred ? "כן" : "לא"}</li>
                <li>
                  {policy.dataMode === "local"
                    ? "קבצי מקור לא יועלו אוטומטית."
                    : "העלאת מקורות תתבצע רק לפי מדיניות/אישור — אין Upload אוטומטי שקט."}
                </li>
              </ul>
              {error && <div className="auth-error" role="alert">{error}</div>}
            </div>
          )}
        </div>

        <div className="wiz-foot">
          <button type="button" className="btn" onClick={step === 0 ? onClose : () => setStep((s) => s - 1)} disabled={busy}>
            {step === 0 ? "ביטול" : "חזרה"}
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" className="btn primary" disabled={!canNext()} onClick={() => setStep((s) => s + 1)}>
              המשך
            </button>
          ) : (
            <button type="button" className="btn primary" disabled={!canCreate() || busy} onClick={submit}>
              {busy ? "יוצר…" : "צור פרויקט"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
