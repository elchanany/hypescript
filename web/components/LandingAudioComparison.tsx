"use client";

import { useState } from "react";
import { AudioWaveform, BadgeCheck, Check, Sparkles, Volume2, WandSparkles, Zap } from "@/components/icons";

export default function LandingAudioComparison() {
  const [activeMode, setActiveMode] = useState<"clean" | "raw">("clean");

  return (
    <section className="marketing-section hsx-audio-comparison hsx-reveal">
      <div className="marketing-section-head">
        <span className="section-kicker">
          <AudioWaveform size={14} /> אלגוריתם אקוסטיקה מתקדם
        </span>
        <h2>מנקים שתיקות, נשימות ורעשים בדיוק של אלפיות השנייה</h2>
        <p>
          אלגוריתם הכיול האוטומטי מזהה את חלונות השקט והנשימות בגל הקול של הסרטון, חותך בדיוק בעמקי השקט ומחבר את המילים ברצף טבעי וקולח.
        </p>
      </div>

      <div className="audio-comparison-card" data-mode={activeMode}>
        {/* Top Mode Switcher Toggle */}
        <div className="audio-mode-selector" role="tablist" aria-label="מצב השוואת סאונד">
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "raw"}
            className={`audio-mode-btn ${activeMode === "raw" ? "is-active raw" : ""}`}
            onClick={() => setActiveMode("raw")}
          >
            <span className="mode-dot raw" />
            <span className="mode-title">חומר גלם מקורי</span>
            <small>שתיקות, היסוסים ונשימות כבדות</small>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeMode === "clean"}
            className={`audio-mode-btn ${activeMode === "clean" ? "is-active clean" : ""}`}
            onClick={() => setActiveMode("clean")}
          >
            <span className="mode-dot clean" />
            <span className="mode-title">מעובד עם Hypescript AI</span>
            <small>קול צלול, קצבי ומהודק ללא שתיקות</small>
          </button>
        </div>

        {/* Live Audio Visualizer Stage */}
        <div className="audio-visualizer-stage">
          {/* Header Info Banner */}
          <div className="visualizer-header">
            <div className="vis-title">
              <Volume2 size={16} />
              <strong>{activeMode === "clean" ? "פלט אולפני מלוטש" : "אודיו גולמי לא ערוך"}</strong>
            </div>
            <div className="vis-status">
              {activeMode === "clean" ? (
                <span className="badge-clean">
                  <BadgeCheck size={13} /> 100% שתיקות נחתכו · שטף טבעי
                </span>
              ) : (
                <span className="badge-raw">
                  ⚠️ 14 שניות שקט מבוזבזות · 6 נשימות קטועות
                </span>
              )}
            </div>
          </div>

          {/* Interactive Dynamic Waveform Display */}
          <div className="vis-waveform-container" dir="ltr">
            {activeMode === "clean" ? (
              /* Clean Studio Waveform: Uniform, rhythmic, tight peaks */
              <div className="waveform-grid clean">
                {Array.from({ length: 44 }, (_, i) => {
                  const height = 30 + ((i * 37) % 65);
                  return (
                    <div key={i} className="wave-bar-col">
                      <i
                        className="wave-bar clean"
                        style={{
                          height: `${height}%`,
                          animationDelay: `${-(i * 0.08)}s`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Raw Waveform: Jagged, erratic with dead silent gaps */
              <div className="waveform-grid raw">
                {Array.from({ length: 44 }, (_, i) => {
                  // Create gaps for dead silence
                  const isSilence = (i >= 8 && i <= 14) || (i >= 24 && i <= 30) || (i >= 38 && i <= 42);
                  const isBreath = i === 7 || i === 23 || i === 37;
                  const height = isSilence ? 4 : isBreath ? 18 : 25 + ((i * 47) % 70);
                  return (
                    <div key={i} className={`wave-bar-col ${isSilence ? "is-silence" : ""}`}>
                      <i
                        className={`wave-bar raw ${isBreath ? "breath" : ""}`}
                        style={{
                          height: `${height}%`,
                        }}
                      />
                      {isSilence && i === 11 && (
                        <span className="silence-marker">שתיקה 2.4s</span>
                      )}
                      {isSilence && i === 27 && (
                        <span className="silence-marker">שתיקה 1.8s</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Metrics comparison cards */}
          <div className="audio-metrics-grid">
            <div className="metric-pill">
              <span className="metric-lbl">משך האודיו</span>
              <strong className={activeMode === "clean" ? "txt-green" : "txt-warn"}>
                {activeMode === "clean" ? "00:32 (מהודק)" : "01:14 (מלא מריחות)"}
              </strong>
            </div>

            <div className="metric-pill">
              <span className="metric-lbl">קצב דיבור</span>
              <strong className={activeMode === "clean" ? "txt-green" : "txt-warn"}>
                {activeMode === "clean" ? "142 מילים/דקה" : "64 מילים/דקה"}
              </strong>
            </div>

            <div className="metric-pill">
              <span className="metric-lbl">חיתוך שקט ונשימות</span>
              <strong className={activeMode === "clean" ? "txt-green" : "txt-warn"}>
                {activeMode === "clean" ? "מדויק ברמת הפריים" : "ללא עיבוד"}
              </strong>
            </div>

            <div className="metric-pill">
              <span className="metric-lbl">מוזיקת רקע (Auto-Ducking)</span>
              <strong className={activeMode === "clean" ? "txt-green" : "txt-warn"}>
                {activeMode === "clean" ? "מותאם אוטומטית" : "ללא"}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
