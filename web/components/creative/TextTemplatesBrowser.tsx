"use client";

import { useMemo, useState } from "react";
import { Search, Sparkles, Type, WandSparkles } from "@/components/icons";
import { searchTextPresets, TEXT_CATEGORIES, TextCategory, TextPreset } from "@/lib/creative/textPresets";
import { searchTextAnimations, TEXT_ANIM_KINDS, TextAnimKind, TextAnimation } from "@/lib/creative/textAnimations";

interface Props {
  onAddTextTemplate: (preset: TextPreset) => void;
  onApplyTextAnimation?: (anim: TextAnimation) => void;
}

type Tab = "templates" | "animations";

export default function TextTemplatesBrowser({ onAddTextTemplate, onApplyTextAnimation }: Props) {
  const [tab, setTab] = useState<Tab>("templates");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [animKind, setAnimKind] = useState<TextAnimKind>("in");

  const presets = useMemo(() => searchTextPresets(query), [query]);
  const animations = useMemo(() => searchTextAnimations(query), [query]);

  const filteredPresets = useMemo(() => {
    if (category === "all") return presets;
    return presets.filter((p) => p.category === category);
  }, [presets, category]);

  const filteredAnimations = useMemo(() => {
    return animations.filter((a) => a.kind === animKind);
  }, [animations, animKind]);

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <div className="creative-mode-toggle">
          <button
            className={`mode-btn ${tab === "templates" ? "active" : ""}`}
            onClick={() => setTab("templates")}
          >
            <Type size={14} />
            <span>תבניות טקסט ({presets.length})</span>
          </button>
          <button
            className={`mode-btn ${tab === "animations" ? "active" : ""}`}
            onClick={() => setTab("animations")}
          >
            <WandSparkles size={14} />
            <span>אנימציות טקסט ({animations.length})</span>
          </button>
        </div>

        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "templates" ? "חיפוש תבנית (כותרת, כתובית תחתונה, הקדשה, CTA...)" : "חיפוש אנימציה (מכונת כתיבה, גל, זוהר, קפיצה...)"}
          />
        </label>

        {tab === "templates" ? (
          <div className="creative-category-pills">
            <button
              className={`pill ${category === "all" ? "active" : ""}`}
              onClick={() => setCategory("all")}
            >
              הכל
            </button>
            {TEXT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`pill ${category === cat.id ? "active" : ""}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.labelHe}
              </button>
            ))}
          </div>
        ) : (
          <div className="creative-category-pills">
            {TEXT_ANIM_KINDS.map((k) => (
              <button
                key={k.id}
                className={`pill ${animKind === k.id ? "active" : ""}`}
                onClick={() => setAnimKind(k.id)}
              >
                {k.labelHe}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="creative-scroll-content">
        {tab === "templates" ? (
          <div className="text-templates-grid-wide">
            {filteredPresets.map((preset) => (
              <button
                key={preset.id}
                className="text-preset-card-rich"
                onClick={() => onAddTextTemplate(preset)}
                title="לחץ להוספה מעל הווידאו"
              >
                <div
                  className="preset-preview-stage"
                  style={{
                    background: preset.style.background || "rgba(0,0,0,0.5)",
                    borderColor: preset.style.borderColor || "rgba(255,255,255,0.15)",
                    borderWidth: preset.style.borderWidth ? `${preset.style.borderWidth}px` : "1px",
                    borderRadius: `${preset.style.borderRadius || 6}px`,
                  }}
                >
                  <span
                    style={{
                      color: preset.style.color || "#fff",
                      fontWeight: preset.style.bold ? 700 : 500,
                      textAlign: preset.style.align,
                    }}
                  >
                    {preset.sampleHe}
                  </span>
                </div>
                <div className="card-footer">
                  <strong>{preset.labelHe}</strong>
                  <span className="add-pill">+ הוסף</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="creative-grid-dense">
            {filteredAnimations.map((anim) => (
              <button
                key={anim.id}
                className="creative-anim-card text-anim"
                onClick={() => onApplyTextAnimation?.(anim)}
                title={`${anim.labelHe} — ${anim.descriptionHe}`}
              >
                <div className="anim-preview-box">
                  <span
                    className="anim-text-sample"
                    style={{
                      animation: `${anim.cssKeyframe} ${anim.defaultDuration}s ${anim.cssTiming} infinite`,
                    }}
                  >
                    טקסט
                  </span>
                </div>
                <strong>{anim.labelHe}</strong>
                <small>{anim.descriptionHe}</small>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
