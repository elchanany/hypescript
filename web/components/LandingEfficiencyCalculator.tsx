"use client";

import { useState } from "react";
import { Clock, Coins, Sparkles, BarChart3, Zap, ArrowLeft } from "@/components/icons";
import Link from "next/link";

export default function LandingEfficiencyCalculator() {
  const [videosPerWeek, setVideosPerWeek] = useState(4);
  const [rawMinutes, setRawMinutes] = useState(15);

  const videosPerMonth = videosPerWeek * 4.33;
  // Traditional editing time: ~3.5x raw footage duration in minutes
  const manualHoursPerMonth = Math.round((videosPerMonth * (rawMinutes * 3.5)) / 60);
  // Hypescript time: ~3 minutes per video (upload + prompt + preview + export)
  const hypescriptHoursPerMonth = Math.round((videosPerMonth * 3.5) / 60 * 10) / 10;
  const hoursSaved = Math.max(1, Math.round(manualHoursPerMonth - hypescriptHoursPerMonth));
  // Value saved at standard editor rate of 110 ILS/hour
  const valueSavedIls = hoursSaved * 110;

  return (
    <section className="marketing-section hsx-efficiency-calculator hsx-reveal">
      <div className="marketing-section-head">
        <span className="section-kicker">
          <Clock size={14} /> מחשבון החזר השקעה וחיסכון
        </span>
        <h2>כמה שעות יקרות וכסף Hypescript יחסוך לך החודש?</h2>
        <p>
          גרור את הסרגלים וגלה כיצד אוטומציה חכמה של חיתוכים, כתוביות ועיצוב מחזירה לך את הזמן להתמקד ביצירה וצמיחה.
        </p>
      </div>

      <div className="efficiency-card">
        {/* Sliders Input Column */}
        <div className="efficiency-inputs">
          {/* Slider 1: Videos per week */}
          <div className="calculator-slider-group">
            <div className="slider-header">
              <label htmlFor="videos-slider">כמות סרטונים בשבוע</label>
              <span className="slider-val-badge">{videosPerWeek} סרטונים</span>
            </div>
            <input
              id="videos-slider"
              type="range"
              min="1"
              max="25"
              step="1"
              value={videosPerWeek}
              onChange={(e) => setVideosPerWeek(Number(e.target.value))}
              className="calc-range-input"
            />
            <div className="slider-limits">
              <span>1 סרטון</span>
              <span>25 סרטונים/שבוע</span>
            </div>
          </div>

          {/* Slider 2: Raw duration */}
          <div className="calculator-slider-group">
            <div className="slider-header">
              <label htmlFor="duration-slider">אורך חומר גלם ממוצע</label>
              <span className="slider-val-badge">{rawMinutes} דקות</span>
            </div>
            <input
              id="duration-slider"
              type="range"
              min="3"
              max="45"
              step="1"
              value={rawMinutes}
              onChange={(e) => setRawMinutes(Number(e.target.value))}
              className="calc-range-input"
            />
            <div className="slider-limits">
              <span>3 דקות</span>
              <span>45 דקות לסרטון</span>
            </div>
          </div>

          <div className="calc-note">
            <Sparkles size={14} />
            <span>החישוב מבוסס על נתוני עריכה אמיתיים של מאות יוצרים ועמותות</span>
          </div>
        </div>

        {/* Results Output Showcase */}
        <div className="efficiency-results">
          <div className="results-grid">
            <div className="result-tile highlight">
              <span className="res-icon">
                <Clock size={20} />
              </span>
              <div className="res-data">
                <small>חיסכון בזמן עריכה</small>
                <strong>{hoursSaved} שעות</strong>
                <span>שחוזרות אליך בכל חודש</span>
              </div>
            </div>

            <div className="result-tile">
              <span className="res-icon green">
                <Coins size={20} />
              </span>
              <div className="res-data">
                <small>חיסכון כספי חודשי משוער</small>
                <strong className="txt-green">₪{valueSavedIls.toLocaleString("he-IL")}</strong>
                <span>עלויות שעות עורך מסורתי</span>
              </div>
            </div>

            <div className="result-tile">
              <span className="res-icon blue">
                <Zap size={20} />
              </span>
              <div className="res-data">
                <small>מהירות הפקה פר סרטון</small>
                <strong>פחות מ-2 דקות</strong>
                <span>במקום {Math.round(rawMinutes * 3.5)} דקות עבודה ידנית</span>
              </div>
            </div>
          </div>

          <Link href="/login?next=/dashboard" className="btn primary calc-cta-btn">
            <span>התחל לחסוך זמן עכשיו בחינם</span>
            <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
