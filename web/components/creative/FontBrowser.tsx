"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, Type } from "@/components/icons";
import { CURATED_FONTS, FontCategory, FontMetadata, loadGoogleFont, searchCuratedFonts } from "@/lib/creative/fonts";

interface Props {
  selectedFont?: string;
  onSelectFont: (fontFamily: string) => void;
}

export default function FontBrowser({ selectedFont, onSelectFont }: Props) {
  const [query, setQuery] = useState("");
  const [hebrewOnly, setHebrewOnly] = useState(true);
  const [category, setCategory] = useState<FontCategory | "all">("all");
  const [fonts, setFonts] = useState<FontMetadata[]>(() => searchCuratedFonts("", "all", true));
  const [loading, setLoading] = useState(false);

  // Fetch from API or use curated
  useEffect(() => {
    let cancelled = false;
    const fetchFonts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.set("q", query);
        if (hebrewOnly) params.set("subset", "hebrew");
        else params.set("subset", "all");
        if (category !== "all") params.set("category", category);

        const res = await fetch(`/api/creative/fonts?${params.toString()}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.items) && data.items.length > 0) {
            setFonts(data.items);
            // Preload the first few fonts
            data.items.slice(0, 10).forEach((f: FontMetadata) => loadGoogleFont(f.family));
            return;
          }
        }
      } catch {
        /* Fallback */
      }
      if (!cancelled) {
        const local = searchCuratedFonts(query, category, hebrewOnly);
        setFonts(local);
        local.slice(0, 10).forEach((f) => loadGoogleFont(f.family));
      }
      setLoading(false);
    };

    const timer = setTimeout(fetchFonts, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, hebrewOnly, category]);

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
          <button
            className={`toggle-hebrew-btn ${hebrewOnly ? "active" : ""}`}
            onClick={() => setHebrewOnly(!hebrewOnly)}
            title="הצג רק גופנים התומכים בעברית"
          >
            🇮🇱 עברית בלבד
          </button>
        </div>

        <div className="creative-category-pills">
          <button
            className={`pill ${category === "all" ? "active" : ""}`}
            onClick={() => setCategory("all")}
          >
            הכל
          </button>
          <button
            className={`pill ${category === "sans-serif" ? "active" : ""}`}
            onClick={() => setCategory("sans-serif")}
          >
            סאנס-סריף
          </button>
          <button
            className={`pill ${category === "serif" ? "active" : ""}`}
            onClick={() => setCategory("serif")}
          >
            סריף / תורני
          </button>
          <button
            className={`pill ${category === "display" ? "active" : ""}`}
            onClick={() => setCategory("display")}
          >
            כותרות
          </button>
          <button
            className={`pill ${category === "handwriting" ? "active" : ""}`}
            onClick={() => setCategory("handwriting")}
          >
            כתב יד
          </button>
        </div>
      </div>

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
                  {f.hebrew && <span className="hebrew-badge">עברית ✓</span>}
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
        </div>
      </div>
    </div>
  );
}
