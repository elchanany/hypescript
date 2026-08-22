"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cloud, HardDrive, Sparkles } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { quotaMessage } from "@/lib/billing/quotaMessaging";
import { SelectField } from "@/components/ui";
import {
  DEFAULT_POLICY,
  type AspectRatio,
  type ProjectExecutionPolicy,
  type ProjectFps,
  type ProjectResolution,
} from "@/lib/projects/types";

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
  const [name, setName] = useState(initialName);
  const [policy, setPolicy] = useState<ProjectExecutionPolicy>(() => DEFAULT_POLICY());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setPolicy(DEFAULT_POLICY());
    setBusy(false);
    setError(null);
  }, [open, initialName]);

  const patch = (next: Partial<ProjectExecutionPolicy>) => {
    setPolicy((current) => ({ ...current, ...next, updatedAt: Date.now() }));
  };

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), policy });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "יצירת הפרויקט נכשלה");
      setBusy(false);
    }
  };

  if (!open) return null;
  const isCloud = policy.dataMode === "cloud";
  const upgradeMessage = quotaMessage(error);

  return (
    <div className="wiz-backdrop" role="dialog" aria-modal="true" aria-labelledby="wiz-title">
      <div className="wiz-card wiz-card-simple">
        <div className="wiz-head">
          <BrandLogo variant="icon" size="sm" decorative />
          <div>
            <h2 id="wiz-title">{initialName === "הסרטון הראשון שלי" ? "בוא ניצור את הסרטון הראשון" : "פרויקט חדש"}</h2>
            <p className="wiz-sub">נותנים שם ובוחרים פורמט. מיד אחר כך הצ׳אט יוביל אותך בתוך העורך.</p>
          </div>
          <button type="button" className="wiz-close" onClick={onClose} aria-label="סגור">×</button>
        </div>

        <div className="wiz-body wiz-simple-body">
          <div className={`wiz-default-mode ${isCloud ? "cloud" : "local"}`}>
            {isCloud ? <Cloud size={19} /> : <HardDrive size={19} />}
            <span>
              <strong>{isCloud ? "נשמר בענן באופן אוטומטי" : "נשמר במכשיר הזה בלבד"}</strong>
              <small>{isCloud ? "מצב העריכה נשמר בחשבון וקובצי מדיה חדשים מועלים לאחסון הענן." : "ללא העלאת קבצים או מצב עריכה לענן."}</small>
            </span>
            <Link href="/settings#workspace-storage">שינוי בהגדרות</Link>
          </div>

          <label className="dlg-field wiz-name-field">
            שם הפרויקט
            <input value={name} onChange={(event) => setName(event.target.value)} autoFocus maxLength={120} />
          </label>

          <div className="wiz-quick-grid">
            <label className="dlg-field">
              יחס מסך
              <SelectField value={policy.aspectRatio} ariaLabel="יחס מסך" options={[
                { value: "16:9", label: "16:9 · YouTube" }, { value: "9:16", label: "9:16 · Reels / TikTok" },
                { value: "1:1", label: "1:1 · ריבוע" }, { value: "4:5", label: "4:5 · פיד" },
              ]} onValueChange={(value) => patch({ aspectRatio: value as AspectRatio })} />
            </label>
            <label className="dlg-field">
              איכות
              <SelectField value={policy.resolution} ariaLabel="איכות" options={[
                { value: "1080p", label: "1080p · מומלץ" }, { value: "720p", label: "720p · חסכוני" }, { value: "4k", label: "4K · איכות מרבית" },
              ]} onValueChange={(value) => patch({ resolution: value as ProjectResolution })} />
            </label>
            <label className="dlg-field">
              FPS
              <SelectField value={String(policy.fps)} ariaLabel="FPS" options={[
                { value: "30", label: "30" }, { value: "25", label: "25" }, { value: "24", label: "24" },
              ]} onValueChange={(value) => patch({ fps: Number(value) as ProjectFps })} />
            </label>
          </div>

          <div className="wiz-agent-note"><Sparkles size={16} />שירותי ה־AI, התמלול והשמירה כבר מוכנים. פשוט מעלים סרטון וכותבים מה לערוך.</div>
          {error && <div className="auth-error" role="alert">
            {upgradeMessage || error}
            {upgradeMessage && <> <Link href="/account#plans" className="quota-inline-link">לצפייה במסלולים</Link></>}
          </div>}
        </div>

        <div className="wiz-foot">
          <button type="button" className="btn" onClick={onClose} disabled={busy}>ביטול</button>
          <button type="button" className="btn primary" disabled={!name.trim() || busy} onClick={submit}>
            {busy ? "יוצר ומסנכרן…" : "צור פרויקט"}
          </button>
        </div>
      </div>
    </div>
  );
}
