"use client";

import { Check, Play, Send, Sparkles, WandSparkles } from "@/components/icons";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";

export default function LandingDeviceShowcase() {
  const [prompt, setPrompt] = useState(0);
  const prompts = [
    { ask: "ערוך מזה TikTok של 35 שניות", done: "בחרתי את הרגעים החזקים והכנתי גרסה אנכית." },
    { ask: "בנה מצגת וידאו מהתמונות והקריינות", done: "סידרתי שקופיות, מעברים וקול באורך מדויק." },
    { ask: "צור סרטון מוצר קצר עם לוגו", done: "הוספתי מיתוג, מוזיקה וקריאה לפעולה." },
    { ask: "מצא ארבעה קליפים בפרק הזה", done: "מצאתי ארבעה הוקים והכנתי גרסאות לפרסום." },
  ];

  return (
    <section className="hsx-device-story hsx-reveal" aria-label="Hypescript בכל מסך">
      <div className="hsx-device-copy">
        <span>אותו פרויקט. כל מסך.</span>
        <h2>מדברים עם העורך.<br />ורואים אותו עובד.</h2>
        <p>סרטון לרשת, מצגת וידאו, מודעת מוצר או קליפים מפרק ארוך — מבקשים בשיחה ורואים את העריכה מתרחשת.</p>
        <div className="hsx-prompt-switcher" role="tablist" aria-label="דוגמאות לבקשות עריכה">
          {prompts.map((item, index) => <button key={item.ask} type="button" role="tab" aria-selected={prompt === index} onClick={() => setPrompt(index)}>{index + 1}</button>)}
        </div>
      </div>

      <div className="hsx-device-scene">
        <div className="hsx-tablet">
          <i className="hsx-tablet-camera" />
          <div className="hsx-tablet-ui">
            <header><div className="hsx-tablet-brand"><BrandLogo variant="icon" size="xs" decorative /><b>Hypescript</b></div><span>גרסת Reels</span><button type="button">ייצוא</button></header>
            <div className="hsx-tablet-work">
              <div className="hsx-tablet-video"><img src="/brand/landing-creator-male.webp" alt="יוצר תוכן עורך סרטון הסבר בטאבלט" /><span className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></span><button type="button" aria-label="הפעלת תצוגה"><Play size={18} fill="currentColor" /></button><strong>בקשה אחת. סרטון מוכן.</strong></div>
              <aside><span><Sparkles size={12} />Hype AI</span><p>{prompts[prompt].ask}</p><div><Check size={12} />{prompts[prompt].done}</div></aside>
            </div>
            <div className="hsx-tablet-timeline"><i /><i /><i /><i /><i /><b /></div>
          </div>
        </div>

        <div className="hsx-phone">
          <div className="hsx-phone-notch" />
          <header><span><BrandLogo variant="icon" size="xs" decorative /></span><div><b>Hype AI</b><small>מחובר לפרויקט</small></div><i /></header>
          <div className="hsx-phone-preview"><img src="/brand/landing-creator-male.webp" alt="תצוגה מקדימה של סרטון הסבר בטלפון" /><i className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></i><span>00:35</span></div>
          <div className="hsx-phone-chat">
            <p className="user">{prompts[prompt].ask}</p>
            <p className="agent"><WandSparkles size={12} />{prompts[prompt].done}</p>
            <div><Check size={12} />הסרטון שלך מוכן</div>
          </div>
          <footer><span>בקש שינוי…</span><button type="button" aria-label="שליחת בקשה"><Send size={12} /></button></footer>
        </div>
        <div className="hsx-device-halo" />
      </div>
    </section>
  );
}
