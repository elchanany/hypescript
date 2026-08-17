"use client";

import { useState } from "react";
import { Plus, Sparkles, Type, WandSparkles } from "@/components/icons";
import { Button, Section } from "@/components/ui";
import { TEXT_CATEGORIES, TEXT_PRESETS, TextCategory, TextPreset } from "@/lib/creative/textPresets";
import FontBrowser from "./creative/FontBrowser";

interface Props {
  onAddText: () => void;
  onAddPopup: (preset: "source_popup" | "speaker_card" | "dedication_card") => void;
  onAddPreset?: (preset: TextPreset) => void;
  onSelectFont?: (family: string) => void;
}

type TextSubTab = "templates" | "fonts";

export default function TextPanel({ onAddText, onAddPopup, onAddPreset, onSelectFont }: Props) {
  const [subTab, setSubTab] = useState<TextSubTab>("templates");
  const [activeCategory, setActiveCategory] = useState<TextCategory | "all">("all");

  const filteredPresets = activeCategory === "all"
    ? TEXT_PRESETS
    : TEXT_PRESETS.filter((p) => p.category === activeCategory);

  return (
    <>
      <div className="panel-header">
        <span className="title"><Type size={15} strokeWidth={1.75} />טקסט וגופנים</span>
      </div>
      <div className="panel-scroll">
        <div style={{ padding: "12px 14px 4px" }}>
          <div className="creative-mode-toggle" style={{ marginBottom: 12 }}>
            <button
              className={`mode-btn ${subTab === "templates" ? "active" : ""}`}
              onClick={() => setSubTab("templates")}
            >
              <WandSparkles size={14} />
              <span>תבניות טקסט</span>
            </button>
            <button
              className={`mode-btn ${subTab === "fonts" ? "active" : ""}`}
              onClick={() => setSubTab("fonts")}
            >
              <Type size={14} />
              <span>גופני עברית (Google)</span>
            </button>
          </div>
          <div style={{ marginBottom: 12 }}>
            <Button variant="secondary" icon={Plus} onClick={onAddText}>
              הוסף שכבת טקסט פשוטה
            </Button>
          </div>
        </div>

        {subTab === "templates" ? (
          <>
            <div className="creative-category-pills" style={{ padding: "0 14px 10px" }}>
              <button
                className={`pill ${activeCategory === "all" ? "active" : ""}`}
                onClick={() => setActiveCategory("all")}
              >
                הכל ({TEXT_PRESETS.length})
              </button>
              {TEXT_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className={`pill ${activeCategory === cat.id ? "active" : ""}`}
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.labelHe}
                </button>
              ))}
            </div>

            <div className="text-template-grid" style={{ padding: "0 14px 16px" }} aria-label="תבניות טקסט מעוצבות">
              {filteredPresets.map((preset) => (
                <button
                  key={preset.id}
                  className="text-template-card-compact"
                  onClick={() => onAddPreset?.(preset) || onAddPopup(preset.id as any)}
                  title={`${preset.labelHe} — לחץ להוספה מעל הווידאו`}
                >
                  <div
                    className="compact-preview-box"
                    style={{
                      background: preset.style.background || "rgba(0,0,0,0.5)",
                      borderColor: preset.style.borderColor || "rgba(255,255,255,0.15)",
                      borderRadius: `${preset.style.borderRadius || 6}px`,
                      color: preset.style.color || "#fff",
                    }}
                  >
                    <span>{preset.sampleHe}</span>
                  </div>
                  <strong>{preset.labelHe}</strong>
                </button>
              ))}
            </div>
          </>
        ) : (
          <FontBrowser onSelectFont={(family) => onSelectFont?.(family)} />
        )}
      </div>
    </>
  );
}
