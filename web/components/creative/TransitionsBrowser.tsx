"use client";

import { useMemo, useState } from "react";
import { Blend, Check, Search, Sparkles } from "@/components/icons";
import type { Clip } from "@/lib/editor/model";
import { searchTransitions, TRANSITION_CATEGORIES, Transition } from "@/lib/creative/transitions";

interface Props {
  clip: Clip | null;
  onApplyFade: (fadeIn: number, fadeOut: number) => void;
  onApplyTransition?: (transitionId: string) => void;
}

const FADE_PRESETS = [
  { id: "none", name: "ללא עמעום", note: "חיתוך ישיר", seconds: 0 },
  { id: "snap", name: "מהיר ועצבני", note: "0.15s", seconds: 0.15 },
  { id: "smooth", name: "חלק וטבעי", note: "0.35s", seconds: 0.35 },
  { id: "cinematic", name: "קולנועי", note: "0.8s", seconds: 0.8 },
  { id: "dramatic", name: "דרמטי איטי", note: "1.5s", seconds: 1.5 },
  { id: "epic", name: "אפוס ממושך", note: "2.5s", seconds: 2.5 },
] as const;

export default function TransitionsBrowser({ clip, onApplyFade, onApplyTransition }: Props) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const transitions = useMemo(() => searchTransitions(query), [query]);

  const filteredTransitions = useMemo(() => {
    if (selectedCategory === "all") return transitions;
    return transitions.filter((t) => t.category === selectedCategory);
  }, [transitions, selectedCategory]);

  const curIn = clip?.visualFadeIn ?? 0;
  const curOut = clip?.visualFadeOut ?? 0;

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש ב־57 מעברי Remotion ו-FFmpeg (המסה, מחיקה, החלקה...)"
          />
        </label>

        {/* Category Pills */}
        <div className="creative-category-pills">
          <button
            className={`pill ${selectedCategory === "all" ? "active" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            הכל ({transitions.length})
          </button>
          {TRANSITION_CATEGORIES.map((cat) => (
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

      <div className="creative-scroll-content">
        {/* Section 1: Fade In / Out Presets */}
        <section className="creative-section-block">
          <div className="creative-section-title">
            <Blend size={15} />
            <span>Fade In / Fade Out (כניסה ויציאה חזותיים)</span>
          </div>
          <div className="fade-presets-grid">
            {FADE_PRESETS.map((fade) => {
              const active = Math.abs(curIn - fade.seconds) < 0.02 && Math.abs(curOut - fade.seconds) < 0.02;
              return (
                <button
                  key={fade.id}
                  className={`fade-card ${active ? "active" : ""}`}
                  onClick={() => onApplyFade(fade.seconds, fade.seconds)}
                  disabled={!clip}
                  title={fade.note}
                >
                  <span className={`fade-thumb-indicator ${fade.id}`} />
                  <strong>{fade.name}</strong>
                  <small>{fade.seconds ? `${fade.seconds}s` : "0s"}</small>
                  {active && <span className="active-badge"><Check size={12} /></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Full Transition Catalog */}
        <section className="creative-section-block">
          <div className="creative-section-title">
            <Sparkles size={15} />
            <span>מעברי סצנות (Scene Transitions)</span>
          </div>
          <div className="transitions-grid-dense">
            {filteredTransitions.map((item) => (
              <button
                key={item.id}
                className="transition-card-interactive"
                onMouseEnter={() => setPreviewingId(item.id)}
                onMouseLeave={() => setPreviewingId(null)}
                onClick={() => onApplyTransition?.(item.id)}
                title={`${item.labelHe} (${item.defaultDuration.toFixed(2)}s)`}
              >
                <div className={`transition-motion-preview ${item.category} ${previewingId === item.id ? "is-hovering" : ""}`}>
                  <span className="sample-slide-a" />
                  <span className="sample-slide-b" />
                </div>
                <strong>{item.labelHe}</strong>
                <small>{item.defaultDuration.toFixed(2)}s</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
