"use client";
import { useEffect, useState } from "react";
import { Download, Save, Trash2 } from "@/components/icons";
import { toast } from "@/lib/ui/toast";
type State = {
  profile: {
    display_name: string;
    locale: string;
    timezone: string;
    usage_type: string | null;
  };
  settings: {
    theme: string;
    reduced_motion: boolean;
    notify_email: boolean;
    notify_in_app: boolean;
    analytics_consent: boolean;
    high_contrast: boolean;
    font_scale: number;
    marketing_email: boolean;
    provider_mode: string;
  };
};
export default function AccountPreferences() {
  const [v, setV] = useState<State | null>(null),
    [busy, setBusy] = useState(false),
    [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    fetch("/api/account")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setV)
      .catch(() => setUnavailable(true));
  }, []);
  if (unavailable)
    return <section className="account-preferences"><strong>הגדרות החשבון יופעלו לאחר עדכון מסד הנתונים</strong><p>המנוי והפרויקטים ממשיכים לעבוד כרגיל.</p></section>;
  if (!v) return <div className="account-skeleton">טוען הגדרות חשבון…</div>;
  const save = async () => {
    setBusy(true);
    const r = await fetch("/api/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(v),
    });
    setBusy(false);
    r.ok ? toast.success("ההגדרות נשמרו") : toast.error("השמירה נכשלה");
  };
  const del = async () => {
    if (
      !confirm(
        "למחוק לצמיתות את החשבון, הפרויקטים והמדיה? אי אפשר לבטל פעולה זו.",
      )
    )
      return;
    const r = await fetch("/api/account", { method: "DELETE" });
    if (r.ok) location.href = "/welcome";
    else toast.error("לא ניתן למחוק את החשבון");
  };
  return (
    <section className="account-preferences">
      <div className="account-section-head">
        <div>
          <span className="account-eyebrow">פרופיל ופרטיות</span>
          <h2>החשבון בשליטתך</h2>
        </div>
        <button className="btn primary" onClick={save} disabled={busy}>
          <Save size={15} />
          {busy ? "שומר…" : "שמור"}
        </button>
      </div>
      <div className="account-settings-grid">
        <label>
          שם להצגה
          <input
            value={v.profile.display_name || ""}
            onChange={(e) =>
              setV({
                ...v,
                profile: { ...v.profile, display_name: e.target.value },
              })
            }
          />
        </label>
        <label>
          סוג שימוש
          <select
            value={v.profile.usage_type || "personal"}
            onChange={(e) =>
              setV({
                ...v,
                profile: { ...v.profile, usage_type: e.target.value },
              })
            }
          >
            <option value="personal">אישי</option>
            <option value="business">עסק</option>
            <option value="nonprofit">עמותה</option>
            <option value="team">צוות</option>
          </select>
        </label>
        <label>
          גודל טקסט
          <input
            type="range"
            min=".85"
            max="1.35"
            step=".05"
            value={v.settings.font_scale}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, font_scale: Number(e.target.value) },
              })
            }
          />
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.high_contrast}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, high_contrast: e.target.checked },
              })
            }
          />
          <span>ניגודיות גבוהה</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.reduced_motion}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, reduced_motion: e.target.checked },
              })
            }
          />
          <span>הפחתת תנועה</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.analytics_consent}
            onChange={(e) =>
              setV({
                ...v,
                settings: {
                  ...v.settings,
                  analytics_consent: e.target.checked,
                },
              })
            }
          />
          <span>ניתוח שימוש לשיפור המוצר</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.marketing_email}
            onChange={(e) =>
              setV({
                ...v,
                settings: { ...v.settings, marketing_email: e.target.checked },
              })
            }
          />
          <span>עדכונים והצעות באימייל</span>
        </label>
        <label className="settings-switch">
          <input
            type="checkbox"
            checked={v.settings.provider_mode === "byok"}
            onChange={(e) =>
              setV({
                ...v,
                settings: {
                  ...v.settings,
                  provider_mode: e.target.checked ? "byok" : "managed",
                },
              })
            }
          />
          <span>BYOK — שימוש במפתחות שלי</span>
        </label>
      </div>
      <div className="account-data-actions">
        <a className="btn secondary" href="/api/analytics">
          <Download size={15} />
          ייצוא נתוני שימוש
        </a>
        <button className="btn danger" onClick={del}>
          <Trash2 size={15} />
          מחיקת חשבון וכל הנתונים
        </button>
      </div>
    </section>
  );
}
