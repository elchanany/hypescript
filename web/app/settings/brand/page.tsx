"use client";

// עורך ערכת מותג מקומי בלבד (IndexedDB) — פרטי פרופיל ארגון, פלטת צבעים,
// הנחיות ניסוח, לוגו ותמונות ייחוס. כל הנתונים נשארים במכשיר; לא נשלח כלום לענן.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";
import {
  BrandAssetMeta,
  BrandKit,
  BrandKitIndexEntry,
  createBrandKit,
  deleteBrandKit,
  getActiveBrandKitId,
  getBrandKit,
  listBrandKits,
  setActiveBrandKit,
  updateBrandKit,
} from "@/lib/brand/kit";
import { toast } from "@/lib/ui/toast";
import { previewsForAssets, revokeStalePreviews } from "@/lib/brand/previews";

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--card-2)",
  color: "inherit",
} as const;

const uid = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;

function probeImage(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ width: img.naturalWidth, height: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({}); };
    img.src = url;
  });
}

export default function BrandSettingsPage() {
  const [kits, setKits] = useState<BrandKitIndexEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [draft, setDraft] = useState({ organization: "", tagline: "", writingGuidelines: "" });
  const [previews, setPreviews] = useState<Record<string, string>>({});
  // הרף תמיד מחזיק את ה-URLs הנוכחיים — כדי שניקיון (unmount/remove/switch)
  // ישחרר את ה-URLs העדכניים בדיוק פעם אחת ולא ייתפס על closure מיושן.
  const previewsRef = useRef<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const refInput = useRef<HTMLInputElement>(null);

  const refreshIndex = async () => {
    const [list, active] = await Promise.all([listBrandKits(), getActiveBrandKitId()]);
    setKits(list);
    setActiveId(active);
  };

  useEffect(() => { void refreshIndex(); }, []);

  // מעדכן את מפת התצוגות: משחרר בדיוק את ה-URLs שלא נשארו במפה החדשה,
  // מעדכן את הרף ואת ה-state.
  const replacePreviews = (next: Record<string, string>) => {
    revokeStalePreviews(previewsRef.current, next);
    previewsRef.current = next;
    setPreviews(next);
  };

  // שחרור כל ה-URLs הנוכחיים בדיוק פעם אחת ב-unmount (קורא מהרף, לא מ-closure)
  useEffect(() => () => {
    const old = previewsRef.current;
    previewsRef.current = {};
    revokeStalePreviews(old, {});
  }, []);

  const loadKit = async (id: string) => {
    const k = await getBrandKit(id);
    setSelId(id);
    setKit(k);
    if (!k) return;
    setDraft({ organization: k.organization, tagline: k.tagline || "", writingGuidelines: k.writingGuidelines });
    // switch/refresh: משחרר בדיוק את מה שהוחלף/נמחק, ושומר על תצוגות קיימות תקפות
    replacePreviews(previewsForAssets(k.assets, previewsRef.current));
  };

  const persist = async (patch: Parameters<typeof updateBrandKit>[1]) => {
    if (!selId) return;
    setSaving(true);
    try {
      const next = await updateBrandKit(selId, patch);
      if (next) { setKit(next); await refreshIndex(); }
    } finally { setSaving(false); }
  };

  const create = async () => {
    const k = await createBrandKit({ organization: "ערכת מותג חדשה" });
    await refreshIndex();
    if (!activeId) await setActiveBrandKit(k.id); // ערכה ראשונה הופכת לפעילה
    await refreshIndex();
    await loadKit(k.id);
    toast.success("נוצרה ערכת מותג", "נשמרה מקומית במכשיר");
  };

  const activate = async (id: string) => {
    const ok = await setActiveBrandKit(id);
    if (ok) { setActiveId(id); toast.success("הערכה פעילה", "הסוכן ישתמש בה"); }
  };

  const remove = async (id: string) => {
    if (!window.confirm("למחוק את הערכה? הנכסים שלה יימחקו מהמכשיר.")) return;
    await deleteBrandKit(id);
    if (selId === id) {
      setSelId(null); setKit(null); setDraft({ organization: "", tagline: "", writingGuidelines: "" });
      replacePreviews({}); // משחרר את כל תצוגות הערכה שנמחקה
    }
    await refreshIndex();
  };

  const saveTextFields = async () => {
    await persist({ organization: draft.organization, tagline: draft.tagline, writingGuidelines: draft.writingGuidelines });
    toast.success("נשמר", "השינויים נשמרו מקומית במכשיר");
  };

  const addColor = async (raw: string) => {
    if (!kit || !raw.trim()) return;
    const c = raw.trim().toLowerCase();
    if (kit.colors.includes(c)) return;
    await persist({ colors: [...kit.colors, c] });
  };

  const removeColor = async (color: string) => {
    if (!kit) return;
    await persist({ colors: kit.colors.filter((c) => c !== color) });
  };

  const addAsset = async (file: File | null, role: "logo" | "reference") => {
    if (!file || !kit) return;
    const dims = await probeImage(file);
    const meta: BrandAssetMeta = {
      id: uid("ba"),
      name: file.name,
      role,
      mime: file.type || "image/png",
      ...(dims.width ? { width: dims.width } : {}),
      ...(dims.height ? { height: dims.height } : {}),
      blob: file,
    };
    await persist({ assets: [...kit.assets, meta] });
    replacePreviews({ ...previewsRef.current, [meta.id]: URL.createObjectURL(file) });
    toast.success(role === "logo" ? "לוגו נוסף" : "תמונת ייחוס נוספה", "נשמר מקומית");
  };

  const removeAsset = async (id: string) => {
    if (!kit) return;
    await persist({ assets: kit.assets.filter((a) => a.id !== id) });
    // replacePreviews משחרר את ה-URL של הנכס שהוסר (לא במפה החדשה)
    const { [id]: _gone, ...rest } = previewsRef.current;
    replacePreviews(rest);
  };

  const swatch = (color: string) => (
    <span key={color} style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid var(--border)", borderRadius: 8, padding: "4px 8px", background: "var(--card-2)" }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: color, border: "1px solid rgba(0,0,0,.25)", display: "inline-block" }} />
      <span className="mono" style={{ fontSize: 12 }}>{color}</span>
      <button className="iconbtn" aria-label={`הסרת ${color}`} onClick={() => removeColor(color)}>✕</button>
    </span>
  );

  const assetRow = (a: BrandAssetMeta) => (
    <div key={a.id} className="row" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--card-2)" }}>
      <div className="row">
        {previews[a.id] && <img src={previews[a.id]} alt={a.name} style={{ width: 64, height: 44, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)", background: "#fff" }} />}
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{a.name}</div>
          <div className="hint" style={{ fontSize: 12 }}>
            {a.role === "logo" ? "לוגו" : "ייחוס"} · {a.mime}
            {a.width && a.height ? ` · ${a.width}×${a.height}` : ""} · id=<code>{a.id}</code>
          </div>
        </div>
      </div>
      <button className="btn sm danger" onClick={() => removeAsset(a.id)}>הסרה</button>
    </div>
  );

  return (
    <div>
      <header className="site-header">
        <Link href="/dashboard" className="brand" aria-label="Hypescript">
          <BrandLogo variant="horizontal" size="sm" theme="auto" decorative />
        </Link>
        <nav>
          <Link href="/settings">הגדרות</Link>
          <Link href="/dashboard">לוח פרויקטים</Link>
          <Link href="/">חזרה לעורך</Link>
        </nav>
      </header>
      <div className="container">
        <div className="hero">
          <h1>ערכת מותג</h1>
          <p>
            פרופיל ארגון לשיתוף בין הפרויקטים: שם, סלוגן, פלטת צבעים, הנחיות ניסוח, לוגו ותמונות ייחוס.
            הסוכן קורא את הערכה הפעילה ומשתמש בנכסים שלה.
          </p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            <span className="ok">✓ נשמר מקומית במכשיר בלבד (IndexedDB) — לא נשלח לענן, לא למערכת ההזדהות, ואין סנכרון ענן.</span>
          </p>
        </div>

        <div className="card">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>ערכות מותג</h2>
            <button className="btn primary" onClick={create} disabled={saving}>+ ערכת מותג חדשה</button>
          </div>
          {kits.length === 0 && <div className="hint">אין עדיין ערכות. צור אחת כדי להגדיר צבעים ולוגו לסוכן.</div>}
          {kits.map((entry) => (
            <div key={entry.id} className="row" style={{ justifyContent: "space-between", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", marginBottom: 8, background: selId === entry.id ? "var(--card-2)" : "transparent" }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {entry.organization}
                  {activeId === entry.id && <span className="ok" style={{ marginInlineStart: 8, fontSize: 12 }}>● פעילה</span>}
                </div>
                {activeId !== entry.id && (
                  <button className="btn sm" onClick={() => activate(entry.id)} disabled={saving}>הפעל</button>
                )}
              </div>
              <div className="row">
                <button className="btn sm" onClick={() => loadKit(entry.id)} disabled={saving}>עריכה</button>
                <button className="btn sm danger" onClick={() => remove(entry.id)} disabled={saving}>מחיקה</button>
              </div>
            </div>
          ))}
        </div>

        {kit && (
          <div className="card">
            <h2>עריכת הערכה</h2>
            <label style={{ display: "block", marginBottom: 10, color: "var(--muted)" }}>
              שם הארגון / שם הערכה
              <input type="text" value={draft.organization} onChange={(e) => setDraft((d) => ({ ...d, organization: e.target.value }))} style={inputStyle} />
            </label>
            <label style={{ display: "block", marginBottom: 10, color: "var(--muted)" }}>
              סלוגן (אופציונלי)
              <input type="text" value={draft.tagline} onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))} style={inputStyle} placeholder="למשל: שיעורי תורה לחיזוק הקהילה" />
            </label>
            <label style={{ display: "block", marginBottom: 10, color: "var(--muted)" }}>
              הנחיות ניסוח / כתיבה (הסוכן עוקב אחריהן)
              <textarea rows={5} value={draft.writingGuidelines} onChange={(e) => setDraft((d) => ({ ...d, writingGuidelines: e.target.value }))} style={inputStyle} placeholder="למשל: פנייה בגוף שני, שפה פשוטה, פתיחה עם ברכה, קריאה לפעולה בסוף…" />
            </label>
            <button className="btn primary" onClick={saveTextFields} disabled={saving || !draft.organization.trim()}>שמירת פרטים</button>

            <h3 style={{ margin: "18px 0 8px" }}>פלטת צבעים</h3>
            <div className="row" style={{ marginBottom: 8 }}>
              {kit.colors.length === 0 && <span className="hint">אין צבעים עדיין.</span>}
              {kit.colors.map(swatch)}
            </div>
            <label className="row" style={{ gap: 8 }}>
              <span className="hint">צבע חדש:</span>
              <input
                type="color"
                defaultValue="#0077cc"
                onChange={(e) => addColor(e.target.value)}
                aria-label="הוספת צבע לפלטה"
                style={{ width: 44, height: 34, border: "1px solid var(--border)", borderRadius: 8, background: "var(--card-2)", cursor: "pointer" }}
              />
              <span className="hint">בחירת צבע מוסיפה אותו מיד לפלטה (נשמר מקומית).</span>
            </label>

            <h3 style={{ margin: "18px 0 8px" }}>לוגו</h3>
            <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              {kit.assets.filter((a) => a.role === "logo").map(assetRow)}
              {kit.assets.filter((a) => a.role === "logo").length === 0 && <span className="hint">אין לוגו — העלה קובץ (PNG/SVG/JPEG).</span>}
              <div>
                <button className="btn" onClick={() => logoInput.current?.click()} disabled={saving}>↑ העלאת לוגו</button>
                <input ref={logoInput} type="file" accept="image/*" hidden onChange={(e) => { addAsset(e.target.files?.[0] || null, "logo"); e.target.value = ""; }} />
              </div>
            </div>

            <h3 style={{ margin: "18px 0 8px" }}>תמונות ייחוס / עזר (לוגו לבן, כריכות, דוגמאות)</h3>
            <div className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              {kit.assets.filter((a) => a.role === "reference").map(assetRow)}
              {kit.assets.filter((a) => a.role === "reference").length === 0 && <span className="hint">אין תמונות ייחוס. הסוכן ייבא אותן כמדיה לפי דרישה.</span>}
              <div>
                <button className="btn" onClick={() => refInput.current?.click()} disabled={saving}>↑ הוספת תמונת ייחוס</button>
                <input ref={refInput} type="file" accept="image/*" multiple hidden onChange={(e) => { for (const f of Array.from(e.target.files || [])) void addAsset(f, "reference"); e.target.value = ""; }} />
              </div>
            </div>

            <p className="hint" style={{ marginTop: 14 }}>
              כל הנכסים נשמרים כ-Blob ב-IndexedDB בלבד. הסוכן קורא את הסיכום (ללא קבצים) ב-get_brand_kit ומייבא נכס למדיה ב-use_brand_asset.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
