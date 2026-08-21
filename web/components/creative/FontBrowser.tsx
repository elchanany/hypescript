"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Search } from "@/components/icons";
import { FontCategory, FontMetadata, loadGoogleFont, searchCuratedFonts } from "@/lib/creative/fonts";

type FontSubset = "all" | "hebrew" | "latin";

const SUBSET_OPTIONS: Array<{ id: FontSubset; labelHe: string; title: string }> = [
  { id: "hebrew", labelHe: "עברית", title: "רק גופנים שתומכים באות העברית" },
  { id: "all", labelHe: "הכל", title: "כל הקטלוג, בכל שפה" },
  { id: "latin", labelHe: "לטינית", title: "רק גופנים לטיניים" },
];

const CATEGORY_OPTIONS: Array<{ id: FontCategory | "all"; labelHe: string }> = [
  { id: "all", labelHe: "הכל" },
  { id: "sans-serif", labelHe: "סאנס-סריף" },
  { id: "serif", labelHe: "סריף / תורני" },
  { id: "display", labelHe: "כותרות" },
  { id: "handwriting", labelHe: "כתב יד" },
  { id: "monospace", labelHe: "רוחב קבוע" },
];

interface Props {
  selectedFont?: string;
  onSelectFont: (fontFamily: string) => void;
}

export default function FontBrowser({ selectedFont, onSelectFont }: Props) {
  const [query, setQuery] = useState("");
  // עברית בעדיפות עליונה כברירת מחדל — זה עורך וידאו בעברית.
  const [subset, setSubset] = useState<FontSubset>("hebrew");
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [fonts, setFonts] = useState<FontMetadata[]>(() => searchCuratedFonts("", "all", true));
  const [loading, setLoading] = useState(false);
  const [totalCatalog, setTotalCatalog] = useState<number | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // הקטלוג המלא של Google Fonts זמין ללא מפתח וללא עלות. המפתח, אם קיים,
  // רק משפר את המיון. לכן אין כאן אף פעם מצב "חסר מפתח" — רק "הרשת נפלה".
  useEffect(() => {
    let cancelled = false;
    const fetchFonts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        params.set("subset", subset);
        if (category !== "all") params.set("category", category);

        const res = await fetch(`/api/creative/fonts?${params.toString()}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          if (Array.isArray(data.items) && data.items.length > 0) {
            setFonts(data.items);
            setTotalCatalog(typeof data.totalCatalog === "number" ? data.totalCatalog : null);
            // curated_fallback מגיע רק כשגם הקטלוג הציבורי נפל — זו נפילת רשת אמיתית.
            setStatusNote(data.source === "curated_fallback"
              ? "לא הצלחנו לטעון את קטלוג הגופנים המלא כרגע (בעיית רשת) — מוצגת רשימה מובנית מצומצמת."
              : null);
            data.items.slice(0, 10).forEach((f: FontMetadata) => loadGoogleFont(f.family));
            return;
          }
          // תשובה תקינה בלי תוצאות: זה חיפוש ריק, לא תקלה.
          setFonts([]);
          setTotalCatalog(typeof data.totalCatalog === "number" ? data.totalCatalog : null);
          setStatusNote(null);
          return;
        }
        throw new Error(`fonts_http_${res.status}`);
      } catch {
        if (cancelled) return;
        const local = searchCuratedFonts(query, category, subset === "hebrew");
        setFonts(local);
        setTotalCatalog(null);
        setStatusNote("לא הצלחנו להתחבר לקטלוג הגופנים כרגע — מוצגת רשימה מובנית מצומצמת.");
        local.slice(0, 10).forEach((f) => loadGoogleFont(f.family));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timer = setTimeout(fetchFonts, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, subset, category]);

  const handleSelect = (family: string) => {
    loadGoogleFont(family);
    onSelectFont(family);
  };

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <div className="creative-filter-row">
          <label className="creative-search" style={{ flex: 1 }}>
            <Search size={14} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חיפוש גופן (Heebo, Assistant, Frank Ruhl, Rubik...)"
            />
          </label>
        </div>

        <div className="creative-category-pills">
          {SUBSET_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`pill ${subset === opt.id ? "active" : ""}`}
              onClick={() => setSubset(opt.id)}
              title={opt.title}
            >
              {opt.labelHe}
            </button>
          ))}
        </div>

        <div className="creative-category-pills">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              className={`pill ${category === opt.id ? "active" : ""}`}
              onClick={() => setCategory(opt.id)}
            >
              {opt.labelHe}
            </button>
          ))}
        </div>
      </div>

      {statusNote && (
        <div className="creative-status-note warn">
          <AlertTriangle size={13} />
          <span>{statusNote}</span>
        </div>
      )}

      {!statusNote && totalCatalog != null && (
        <div className="creative-status-note">
          <span>
            {loading ? "טוען…" : `${fonts.length.toLocaleString("he-IL")} גופנים מוצגים`}
            {" · "}
            {`קטלוג מלא: ${totalCatalog.toLocaleString("he-IL")} משפחות`}
          </span>
        </div>
      )}

      <div className="creative-scroll-content">
        <div className="fonts-catalog-list">
          {fonts.map((f) => {
            const isSelected = selectedFont === f.family;
            return (
              <button
                key={f.family}
                className={`font-item-card ${isSelected ? "selected" : ""}`}
                onClick={() => handleSelect(f.family)}
                onMouseEnter={() => loadGoogleFont(f.family)}
              >
                <div className="font-card-header">
                  <span className="font-family-name">{f.family}</span>
                  {f.hebrew && (
                    <span className="hebrew-badge">
                      <Check size={11} />
                      עברית
                    </span>
                  )}
                </div>
                <div
                  className="font-preview-text"
                  style={{ fontFamily: `"${f.family}", system-ui, sans-serif` }}
                >
                  {f.previewSampleHe || (f.hebrew ? "אבגדהוזחטיכלמנסעפצקרשת 123" : f.previewSampleEn || "The quick brown fox 123")}
                </div>
                {isSelected && <span className="active-badge"><Check size={14} /></span>}
              </button>
            );
          })}
          {!loading && fonts.length === 0 && (
            <div className="panel-empty">לא נמצאו גופנים שתואמים לחיפוש.</div>
          )}
        </div>
      </div>
    </div>
  );
}
