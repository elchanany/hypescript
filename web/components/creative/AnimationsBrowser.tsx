"use client";

import { useMemo, useState } from "react";
import { Sparkles, Search, Check, Play } from "@/components/icons";
import { CLIP_ANIMATIONS, AnimationKind, searchAnimations, VisualAnimation } from "@/lib/creative/animations";

interface Props {
  onApplyAnimation?: (anim: VisualAnimation) => void;
}

export default function AnimationsBrowser({ onApplyAnimation }: Props) {
  const [kind, setKind] = useState<AnimationKind>("in");
  const [query, setQuery] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const animations = useMemo(() => searchAnimations(query), [query]);

  const filtered = useMemo(() => {
    return animations.filter((a) => a.kind === kind);
  }, [animations, kind]);

  return (
    <div className="creative-browser-view">
      <div className="creative-top-controls">
        <div className="creative-mode-toggle triple">
          <button
            className={`mode-btn ${kind === "in" ? "active" : ""}`}
            onClick={() => setKind("in")}
          >
            <span>כניסה (In)</span>
          </button>
          <button
            className={`mode-btn ${kind === "out" ? "active" : ""}`}
            onClick={() => setKind("out")}
          >
            <span>יציאה (Out)</span>
          </button>
          <button
            className={`mode-btn ${kind === "combo" ? "active" : ""}`}
            onClick={() => setKind("combo")}
          >
            <span>משולב (Combo)</span>
          </button>
        </div>

        <label className="creative-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש באנימציות (זום, החלקה, סיבוב, רעד, פעימה...)"
          />
        </label>
      </div>

      <div className="creative-scroll-content">
        <div className="creative-grid-dense">
          {filtered.map((anim) => {
            const isHovered = hoveredId === anim.id;
            return (
              <button
                key={anim.id}
                className="creative-anim-card"
                onMouseEnter={() => setHoveredId(anim.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onApplyAnimation?.(anim)}
                title={`${anim.labelHe} — ${anim.descriptionHe}`}
              >
                <div className="anim-preview-box">
                  <div
                    className="anim-sample-element"
                    style={{
                      animation: isHovered
                        ? `${anim.cssKeyframe} ${anim.defaultDuration}s ${anim.cssTiming} infinite`
                        : "none",
                    }}
                  >
                    <span>קליפ</span>
                  </div>
                </div>
                <strong>{anim.labelHe}</strong>
                <small>{anim.defaultDuration}s · {anim.descriptionHe}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
