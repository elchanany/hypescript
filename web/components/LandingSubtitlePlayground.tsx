"use client";

import { useState, useEffect } from "react";
import { Sparkles, WandSparkles, Check, Play, Pause } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";

export type CaptionPreset = {
  id: string;
  name: string;
  badge: string;
  description: string;
  highlightColor: string;
  textColor: string;
  bgColor: string;
  borderStyle: string;
  boxShadow: string;
  sampleWords: { text: string; highlight?: boolean }[];
};

const PRESETS: CaptionPreset[] = [
  {
    id: "tiktok-karaoke",
    name: "טיקטוק קריוקי צהוב",
    badge: "ויראלי",
    description: "הדגשת מילה פעילה בצהוב ניאון זוהר עם הגדלה דינמית",
    highlightColor: "#fbbf24",
    textColor: "#ffffff",
    bgColor: "rgba(0, 0, 0, 0.78)",
    borderStyle: "2px solid rgba(251, 191, 36, 0.4)",
    boxShadow: "0 10px 30px rgba(251, 191, 36, 0.25)",
    sampleWords: [
      { text: "הרגע" },
      { text: "הזה" },
      { text: "שבו", highlight: true },
      { text: "הכול" },
      { text: "משתנה" },
    ],
  },
  {
    id: "cyber-mint",
    name: "סייבר מנטה מודרני",
    badge: "טכנולוגי",
    description: "צבעי טורקיז וליים של Hypescript עם הילת ניאון נקייה",
    highlightColor: "#b9f65d",
    textColor: "#ffffff",
    bgColor: "rgba(11, 23, 38, 0.88)",
    borderStyle: "2px solid rgba(185, 246, 93, 0.5)",
    boxShadow: "0 10px 32px rgba(53, 213, 154, 0.28)",
    sampleWords: [
      { text: "העריכה" },
      { text: "מתבצעת" },
      { text: "במהירות", highlight: true },
      { text: "שיא" },
    ],
  },
  {
    id: "torani-gold",
    name: "תורני זהב יוקרתי",
    badge: "שיעורים והרצאות",
    description: "מסגור מהודר בגווני זהב ועברית קריאה המותאמת לשיעורי רבנים",
    highlightColor: "#f59e0b",
    textColor: "#fffbeb",
    bgColor: "rgba(18, 14, 8, 0.88)",
    borderStyle: "2px solid rgba(245, 158, 11, 0.6)",
    boxShadow: "0 10px 32px rgba(245, 158, 11, 0.22)",
    sampleWords: [
      { text: "ודע" },
      { text: "שהעיקר" },
      { text: "הוא", highlight: true },
      { text: "השמחה" },
      { text: "תמיד" },
    ],
  },
  {
    id: "minimal-box",
    name: "מינימליזם נקי",
    badge: "פודקאסט וראיונות",
    description: "כרטיס שקוף עדין עם ניגודיות מקסימלית וקריאות מושלמת",
    highlightColor: "#38bdf8",
    textColor: "#ffffff",
    bgColor: "rgba(15, 23, 42, 0.75)",
    borderStyle: "1px solid rgba(255, 255, 255, 0.18)",
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4)",
    sampleWords: [
      { text: "שיחה" },
      { text: "עמוקה" },
      { text: "על", highlight: true },
      { text: "יצירה" },
      { text: "ובינה" },
    ],
  },
];

export default function LandingSubtitlePlayground() {
  const [activePreset, setActivePreset] = useState<CaptionPreset>(PRESETS[0]);
  const [activeWordIdx, setActiveWordIdx] = useState(2);
  const [isPlaying, setIsPlaying] = useState(true);

  // Animate word by word karaoke progression
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveWordIdx((prev) => (prev + 1) % activePreset.sampleWords.length);
    }, 700);
    return () => clearInterval(interval);
  }, [isPlaying, activePreset]);

  return (
    <section className="marketing-section hsx-caption-playground hsx-reveal">
      <div className="marketing-section-head">
        <span className="section-kicker">
          <Sparkles size={14} /> עיצוב כתוביות אוטומטי
        </span>
        <h2>כתוביות בעברית שנראות מדהים בכל מסך</h2>
        <p>
          תזמון מילה במילה, RTL מושלם ללא אותיות הפוכות, ואפקט קריוקי שמחזיק את הצופים צמודים לסרטון.
        </p>
      </div>

      <div className="caption-playground-container">
        {/* Style Selector Tabs */}
        <div className="caption-style-picker" role="tablist" aria-label="בחירת סגנון כתוביות">
          {PRESETS.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                role="tab"
                aria-selected={isSelected}
                className={`caption-style-btn ${isSelected ? "is-active" : ""}`}
                onClick={() => {
                  setActivePreset(preset);
                  setActiveWordIdx(0);
                }}
              >
                <div className="style-btn-header">
                  <strong>{preset.name}</strong>
                  <span className="style-badge">{preset.badge}</span>
                </div>
                <small>{preset.description}</small>
                {isSelected && (
                  <span className="selected-indicator">
                    <Check size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Video Frame Preview */}
        <div className="caption-preview-stage">
          <div className="preview-video-viewport">
            {/* Background Studio Visual Frame */}
            <img
              src="/brand/landing-creator-frame.webp"
              alt="תצוגה מקדימה של סרטון"
              className="preview-bg-image"
            />
            <div className="preview-overlay-gradient" />

            {/* Top Brand Watermark */}
            <div className="preview-top-bar">
              <span className="preview-brand-tag">
                <BrandLogo variant="icon" size="xs" decorative />
                <b>Hypescript Live Captions</b>
              </span>
              <button
                type="button"
                className="preview-playback-toggle"
                onClick={() => setIsPlaying((p) => !p)}
                aria-label={isPlaying ? "השהה אנימציה" : "הפעל אנימציה"}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
                <span>{isPlaying ? "מונפש" : "מושהה"}</span>
              </button>
            </div>

            {/* Dynamic Styled Caption Card */}
            <div
              className="preview-caption-box"
              style={{
                backgroundColor: activePreset.bgColor,
                border: activePreset.borderStyle,
                boxShadow: activePreset.boxShadow,
              }}
            >
              <div className="caption-words-row" dir="rtl">
                {activePreset.sampleWords.map((word, idx) => {
                  const isCurrent = isPlaying ? idx === activeWordIdx : word.highlight;
                  return (
                    <span
                      key={idx}
                      className={`caption-word ${isCurrent ? "word-active" : ""}`}
                      style={{
                        color: isCurrent ? activePreset.highlightColor : activePreset.textColor,
                        transform: isCurrent ? "scale(1.16) translateY(-2px)" : "scale(1)",
                        textShadow: isCurrent
                          ? `0 0 16px ${activePreset.highlightColor}, 0 2px 4px rgba(0,0,0,0.8)`
                          : "0 2px 4px rgba(0,0,0,0.6)",
                      }}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls / Badge */}
            <div className="preview-bottom-bar">
              <span className="preview-tag-pill">
                <WandSparkles size={13} />
                <span>100% RTL Native · חותמת זמן מדויקת</span>
              </span>
              <span className="preview-format-pill">1080×1920 · 60fps</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
