"use client";

import { Check, MessageSquareText, Play, Send, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

export default function LandingDeviceShowcase() {
  const [prompt, setPrompt] = useState(0);
  const prompts = [
    { ask: "תכין מזה גרסת Reels של 35 שניות", done: "יצרתי גרסה אנכית עם כתוביות וקצב מהודק." },
    { ask: "שים את הכותרת רק בחמש השניות הראשונות", done: "הכותרת מוקמה, תוזמנה ונשמרה בתוך אזור בטוח." },
    { ask: "תן לי להוריד גם SRT", done: "קובץ הכתוביות מוכן לצד הסרטון המרונדר." },
  ];

  return (
    <section className="hsx-device-story hsx-reveal" aria-label="Hypescript בכל מסך">
      <div className="hsx-device-copy">
        <span>אותו פרויקט. כל מסך.</span>
        <h2>מדברים עם העורך.<br />ורואים אותו עובד.</h2>
        <p>במחשב מקבלים שליטה מלאה; בטאבלט עורכים במגע; ובטלפון ממשיכים שיחה, מאשרים שינויים וצופים בתוצאה.</p>
        <div className="hsx-prompt-switcher" role="tablist" aria-label="דוגמאות לבקשות עריכה">
          {prompts.map((item, index) => <button key={item.ask} type="button" role="tab" aria-selected={prompt === index} onClick={() => setPrompt(index)}>{index + 1}</button>)}
        </div>
      </div>

      <div className="hsx-device-scene">
        <div className="hsx-tablet">
          <i className="hsx-tablet-camera" />
          <div className="hsx-tablet-ui">
            <header><b>Hypescript</b><span>גרסת Reels</span><button type="button">ייצוא</button></header>
            <div className="hsx-tablet-work">
              <div className="hsx-tablet-video"><img src="/brand/landing-creator-frame.webp" alt="תצוגת עריכת וידאו בטאבלט" /><button type="button" aria-label="הפעלת תצוגה"><Play size={18} fill="currentColor" /></button><strong>רעיון מדויק. סרטון מהודק.</strong></div>
              <aside><span><Sparkles size={12} />Hype AI</span><p>{prompts[prompt].ask}</p><div><Check size={12} />{prompts[prompt].done}</div></aside>
            </div>
            <div className="hsx-tablet-timeline"><i /><i /><i /><i /><i /><b /></div>
          </div>
        </div>

        <div className="hsx-phone">
          <div className="hsx-phone-notch" />
          <header><span><MessageSquareText size={13} /></span><div><b>Hype AI</b><small>מחובר לפרויקט</small></div><i /></header>
          <div className="hsx-phone-preview"><img src="/brand/landing-creator-frame.webp" alt="תצוגה מקדימה של הסרטון בטלפון" /><span>00:35</span></div>
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
