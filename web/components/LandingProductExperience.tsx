"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, MousePointer2, Play, Send, Sparkles, WandSparkles } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";

const scenarios = [
  {
    id: "tiktok",
    label: "TikTok",
    ask: "הפוך את הראיון לסרטון TikTok של 35 שניות.",
    done: "חתכתי את הרגעים החזקים והתאמתי ל־9:16.",
    steps: ["קצב מהיר", "כותרת וכתוביות", "גרסה אנכית"],
    caption: "הרעיון החשוב — בלי שנייה מיותרת.",
  },
  {
    id: "presentation",
    label: "מצגת וידאו",
    ask: "בנה מצגת וידאו מהתמונות והקריינות שהעליתי.",
    done: "סידרתי שקופיות, מעברים וקריינות באורך מדויק.",
    steps: ["תמונות לפי הסיפור", "מעברים עדינים", "קריינות מסונכרנת"],
    caption: "רעיון, תמונה וקול — בסיפור אחד.",
  },
  {
    id: "product",
    label: "סרטון מוצר",
    ask: "צור מודעה קצרה למוצר עם לוגו וקריאה לפעולה.",
    done: "הכנתי גרסת מודעה נקייה ומוכנה לפרסום.",
    steps: ["מיתוג עקבי", "מוזיקת רקע", "קריאה לפעולה"],
    caption: "המוצר שלך. ברור כבר מהשנייה הראשונה.",
  },
  {
    id: "podcast",
    label: "פודקאסט",
    ask: "מצא בפרק ארבעה רגעים ששווה לפרסם.",
    done: "בחרתי הוקים חזקים והכנתי ארבעה קליפים.",
    steps: ["זיהוי רגעי שיא", "חיתוך נקי", "4 גרסאות מוכנות"],
    caption: "הרגע שעוצר את הגלילה.",
  },
] as const;

type Scenario = (typeof scenarios)[number]["id"];

export default function LandingProductExperience() {
  const [scenario, setScenario] = useState<Scenario>("tiktok");
  const [playing, setPlaying] = useState(true);
  const [demoStep, setDemoStep] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setDemoStep((value) => (value >= 6 ? 0 : value + 1)), 1150);
    return () => window.clearInterval(timer);
  }, [playing]);

  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".hsx-reveal"));
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible"));
    }, { threshold: 0.14 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    shellRef.current.style.setProperty("--tilt-x", `${-y * 2.4}deg`);
    shellRef.current.style.setProperty("--tilt-y", `${x * 3.5}deg`);
  }

  function resetTilt() {
    shellRef.current?.style.setProperty("--tilt-x", "0deg");
    shellRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  const active = scenarios.find((item) => item.id === scenario) ?? scenarios[0];
  const progress = [10, 22, 38, 57, 74, 90, 100][demoStep];
  const activeAction = demoStep >= 2 && demoStep <= 4 ? active.steps[demoStep - 2] : null;
  const ready = demoStep === 6;

  function selectScenario(id: Scenario) {
    setScenario(id);
    setDemoStep(0);
    setPlaying(true);
  }

  return (
    <section className="hsx-product-stage" aria-label="הדגמה אינטראקטיבית של Hypescript">
      <div className="hsx-orbit hsx-orbit-one"><Sparkles size={14} />בקשה אחת</div>
      <div className="hsx-orbit hsx-orbit-two"><MousePointer2 size={14} />עריכה אמיתית</div>
      <div className="hsx-orbit hsx-orbit-three"><Check size={14} />תוצאה מוכנה</div>

      <div
        className="hsx-laptop"
        ref={shellRef}
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
      >
        <div className="hsx-laptop-lid">
          <div className="hsx-camera" />
          <div className="hsx-app" data-demo-step={demoStep}>
            <header className="hsx-appbar">
              <div className="hsx-app-brand"><BrandLogo variant="icon" size="xs" decorative /><b>Hypescript</b></div>
              <span>פרק 24 · איך רעיון הופך לסיפור</span>
              <button type="button">ייצוא</button>
            </header>

            <div className="hsx-workspace">
              <aside className="hsx-media-panel">
                <strong>מדיה</strong>
                <div className="hsx-media-card active"><img src="/brand/landing-creator-frame.webp" alt="" /><span>ראיון ראשי</span></div>
                <div className="hsx-media-card audio"><i /><i /><i /><i /><i /></div>
                <button type="button">+ העלאת קובץ</button>
              </aside>

              <div className="hsx-canvas">
                <div className="hsx-video-frame">
                  <img src="/brand/landing-creator-frame.webp" alt="יוצרת תוכן באולפן, בתוך תצוגת עורך Hypescript" />
                  <span className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></span>
                  <div className={`hsx-caption${demoStep >= 4 ? " is-visible" : ""}`}>{active.caption}</div>
                  <button type="button" className="hsx-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "עצירת ההדגמה" : "הפעלת ההדגמה"}>
                    {playing ? <span className="hsx-pause" /> : <Play size={18} fill="currentColor" />}
                  </button>
                </div>
                <div className="hsx-transport"><span>00:18.4 / 01:06.2</span><div><i style={{ width: `${progress}%` }} /></div><b>{playing ? (ready ? "מוכן" : "עובד…") : "מושהה"}</b></div>
              </div>

              <aside className="hsx-inspector">
                <div className="hsx-ai-title"><span><Sparkles size={13} /></span><div><b>Hype AI</b><small>עורך יחד איתך</small></div><i>פעיל</i></div>
                <div className="hsx-chat-thread">
                  <p className="from-user">{active.ask}</p>
                  <p className={`from-agent${ready ? " is-ready" : " is-working"}`}>
                    {demoStep === 0 && <><b>קיבלתי, מתחיל לערוך</b><span className="hsx-thinking-dots"><i /><i /><i /></span></>}
                    {demoStep === 1 && <><b>עובר על החומר ומבין את הקצב</b><span className="hsx-thinking-dots"><i /><i /><i /></span></>}
                    {activeAction && <><b>מבצע עכשיו</b><span>{activeAction}</span></>}
                    {demoStep === 5 && <><b>מכין תצוגה מקדימה</b><span className="hsx-thinking-dots"><i /><i /><i /></span></>}
                    {ready && <><b>{active.done}</b><span>אפשר לצפות, לשנות או לייצא.</span></>}
                  </p>
                </div>
                <div className="hsx-mode-tabs" role="tablist" aria-label="דוגמאות למה שאפשר ליצור">
                  {scenarios.map(({ id, label }) => (
                    <button key={id} type="button" role="tab" aria-selected={scenario === id} onClick={() => selectScenario(id)}><span>{label}</span></button>
                  ))}
                </div>
                <div className={`hsx-agent-panel ${ready ? "ready" : "working"}`}><small>{ready ? "העריכה הושלמה" : "עובד על הפרויקט"}</small><div><WandSparkles size={14} /> {ready ? "התצוגה המקדימה מוכנה" : "רואים כל פעולה בזמן אמת"}</div><ul>{active.steps.map((step, index) => {
                  const state = demoStep > index + 2 ? "done" : demoStep === index + 2 ? "current" : "pending";
                  return <li key={step} className={state}><Check size={12} />{step}</li>;
                })}</ul></div>
                <div className="hsx-chat-input"><span>בקש שינוי נוסף…</span><button type="button" aria-label="שליחת בקשה"><Send size={12} /></button></div>
              </aside>
            </div>

            <div className="hsx-timeline">
              <div className="hsx-timecodes"><span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span><span>01:00</span></div>
              <div className="hsx-track hsx-video-track"><b>וידאו</b>{[1,2,3,4,5,6].map((item) => <img className={demoStep >= Math.ceil(item / 2) + 1 ? "edited" : ""} key={item} src="/brand/landing-creator-frame.webp" alt="" />)}</div>
              <div className="hsx-track hsx-audio-track"><b>קול</b><div>{Array.from({ length: 46 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 17) % 74)}%` }} />)}</div></div>
              <div className="hsx-track hsx-caption-track"><b>כתוביות</b><span>סיפור טוב</span><span>מתחיל במשפט</span><span>אחד מדויק</span></div>
              <i className="hsx-playhead" style={{ right: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="hsx-laptop-base"><i /></div>
      </div>

      <div className={`hsx-live-note ${ready ? "ready" : "working"}`} aria-live="polite"><span>{ready ? <Check size={15} /> : <WandSparkles size={15} />}</span><div><b>{active.label}</b><small>{ready ? "הסרטון מוכן לבדיקה" : "הבקשה הופכת לעריכה מול העיניים"}</small></div></div>
    </section>
  );
}
