"use client";

import { useMemo, useState } from "react";
import { Captions, Check, Search, Sparkles } from "@/components/icons";
import { CAPTION_PRESET_CATEGORIES, CAPTION_PRESETS, CaptionPreset, searchCaptionPresets } from "@/lib/creative/captionStyles";
import type { CaptionStyle } from "@/lib/editor/captionStyle";

interface Props {
  currentStyle?: CaptionStyle;
  onApplyStyle: (patch: Partial<CaptionStyle>) => void;
}

export default function CaptionsBrowser({ currentStyle, onApplyStyle }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  const presets = useMemo(() => searchCaptionPresets(query), [query]);

  const filtered = useMemo(() => {
    if (category === "all") return presets;
    return presets.filter((p) => p.category === category);
  }, [presets, category]);

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש סגנון כתוביות (צהוב טיקטוק, ניאון, קופסה, קולנוע...)"
          />
        </label>

        <div className="creative-category-pills">
          <button
            className={`pill ${category === "all" ? "active" : ""}`}
            onClick={() => setCategory("all")}
          >
            הכל ({presets.length})
          </button>
          {CAPTION_PRESET_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`pill ${category === cat.id ? "active" : ""}`}
              onClick={() => setCategory(cat.id)}
            >
              {cat.labelHe}
            </button>
          ))}
        </div>
      </div>

      <div className="creative-scroll-content">
        <div className="captions-presets-grid">
          {filtered.map((preset) => {
            const st = preset.style;
            const isMatch = currentStyle?.color === st.color && currentStyle?.bg === st.bg && currentStyle?.position === st.position;
            return (
              <button
                key={preset.id}
                className={`caption-preset-card ${isMatch ? "active" : ""}`}
                onClick={() => {
                  onApplyStyle({
                    color: st.color,
                    fontSize: st.fontSize,
                    bold: st.bold,
                    position: st.position,
                    bg: st.bg,
                    fontFamily: st.fontFamily,
                  });
                }}
                title={preset.descriptionHe}
              >
                <div
                  className="caption-preview-box"
                  style={{
                    background: st.bg === "box" ? "rgba(0,0,0,0.85)" : st.bg === "soft" ? "rgba(0,0,0,0.4)" : "transparent",
                    borderRadius: `${st.borderRadius || (st.bg === "none" ? 0 : 8)}px`,
                  }}
                >
                  <span
                    style={{
                      color: st.color,
                      fontWeight: st.bold ? 800 : 500,
                      fontFamily: st.fontFamily ? `"${st.fontFamily}", system-ui` : undefined,
                      textShadow: st.textShadow || (st.bg === "none" ? "0 2px 4px #000" : "none"),
                    }}
                  >
                    כתוביות לדוגמה
                  </span>
                </div>
                <div className="caption-card-meta">
                  <strong>{preset.labelHe}</strong>
                  <small>{preset.descriptionHe}</small>
                  {isMatch && <span className="active-badge"><Check size={12} /></span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
