"use client";

import { useMemo, useState } from "react";
import { Check, Search, Sparkles, SlidersHorizontal, WandSparkles } from "@/components/icons";
import type { Clip } from "@/lib/editor/model";
import { EFFECT_CATEGORIES, searchEffects, VisualEffect } from "@/lib/creative/effects";
import { FILTER_CATEGORIES, searchFilters, VideoFilter } from "@/lib/creative/filters";

interface Props {
  clip: Clip | null;
  onApplyEffect: (effectId: string, amount?: number) => void;
  onClearEffect: () => void;
}

type TabMode = "effects" | "filters";

export default function EffectsBrowser({ clip, onApplyEffect, onClearEffect }: Props) {
  const [mode, setMode] = useState<TabMode>("effects");
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const effects = useMemo(() => searchEffects(query), [query]);
  const filters = useMemo(() => searchFilters(query), [query]);

  const currentEffectId = clip?.effectId || "none";
  const currentAmount = clip?.effectAmount ?? 1;

  const categories = mode === "effects" ? EFFECT_CATEGORIES : FILTER_CATEGORIES;

  const filteredEffects = useMemo(() => {
    if (selectedCategory === "all") return effects;
    return effects.filter((e) => e.category === selectedCategory);
  }, [effects, selectedCategory]);

  const filteredFilters = useMemo(() => {
    if (selectedCategory === "all") return filters;
    return filters.filter((f) => f.category === selectedCategory);
  }, [filters, selectedCategory]);

  return (
    <div className="creative-browser-view">
      {/* Search & Sub-tabs */}
      <div className="creative-top-controls">
        <div className="creative-mode-toggle">
          <button
            className={`mode-btn ${mode === "effects" ? "active" : ""}`}
            onClick={() => { setMode("effects"); setSelectedCategory("all"); }}
          >
            <WandSparkles size={14} />
            <span>אפקטים חזותיים ({effects.length})</span>
          </button>
          <button
            className={`mode-btn ${mode === "filters" ? "active" : ""}`}
            onClick={() => { setMode("filters"); setSelectedCategory("all"); }}
          >
            <Sparkles size={14} />
            <span>לוקים ופילטרים ({filters.length})</span>
          </button>
        </div>

        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === "effects" ? "חיפוש ב־80+ אפקטים (טיל-כתום, VHS, זוהר, פילם...)" : "חיפוש ב־60+ לוקים ופילטרים (פורטרט, קולנוע, שלכת...)"}
          />
        </label>

        {/* Filter Pills */}
        <div className="creative-category-pills">
          <button
            className={`pill ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            הכל
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`pill ${selectedCategory === cat.id ? "active" : ""}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.labelHe}
            </button>
          ))}
        </div>
      </div>

      {!clip ? (
        <div className="panel-empty">
          <Sparkles size={28} />
          <p>יש לבחור קטע וידאו בטיימליין כדי להחיל עליו אפקט או פילטר.</p>
        </div>
      ) : (
        <div className="creative-scroll-content">
          {/* Active Effect Control (if applied) */}
          {currentEffectId !== "none" && (
            <div className="active-effect-banner">
              <div className="banner-info">
                <span className="badge">פעיל על הקטע</span>
                <strong>{currentEffectId}</strong>
              </div>
              <div className="banner-slider">
                <span>עוצמה: {Math.round(currentAmount * 100)}%</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={currentAmount}
                  onChange={(e) => onApplyEffect(currentEffectId, parseFloat(e.target.value))}
                />
              </div>
              <button className="btn sm" onClick={onClearEffect}>
                איפוס אפקט
              </button>
            </div>
          )}

          {/* Grid of Items */}
          <div className="creative-grid-dense">
            {mode === "effects" ? (
              filteredEffects.map((eff) => {
                const isActive = currentEffectId === eff.id;
                return (
                  <button
                    key={eff.id}
                    className={`creative-card ${isActive ? "active" : ""}`}
                    onClick={() => onApplyEffect(eff.id, 1)}
                    title={eff.labelHe}
                  >
                    <div className="card-thumb-wrap">
                      <i style={{ filter: eff.css }} className="effect-preview-swatch" />
                      {isActive && <span className="active-check"><Check size={14} /></span>}
                    </div>
                    <strong>{eff.labelHe}</strong>
                    <span className="sub-tag">{eff.adjustable ? "עוצמה מתכווננת" : "לוק קבוע"}</span>
                  </button>
                );
              })
            ) : (
              filteredFilters.map((flt) => {
                const isActive = currentEffectId === flt.id;
                const css = `contrast(${flt.contrast}) saturate(${flt.saturation}) ${flt.brightness ? `brightness(${1 + flt.brightness})` : ""} ${flt.cssHint || ""}`;
                return (
                  <button
                    key={flt.id}
                    className={`creative-card ${isActive ? "active" : ""}`}
                    onClick={() => onApplyEffect(flt.id, 1)}
                    title={`${flt.labelHe} — ${flt.descriptionHe}`}
                  >
                    <div className="card-thumb-wrap">
                      <i style={{ filter: css }} className="effect-preview-swatch" />
                      {isActive && <span className="active-check"><Check size={14} /></span>}
                    </div>
                    <strong>{flt.labelHe}</strong>
                    <span className="sub-tag">{flt.descriptionHe}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
