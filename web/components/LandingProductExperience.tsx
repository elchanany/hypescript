"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Captions, Check, MessageSquareText, MousePointer2, Play, ScanText, Send, Sparkles, WandSparkles } from "lucide-react";

const modes = [
  { id: "transcript", label: "עריכה בטקסט", icon: ScanText, note: "הטקסט והווידאו מסונכרנים" },
  { id: "captions", label: "כתוביות", icon: Captions, note: "עברית, עיצוב ותזמון במקום אחד" },
  { id: "agent", label: "עוזר עריכה", icon: MessageSquareText, note: "בקשה אחת הפכה לתוכנית עריכה" },
] as const;

type Mode = (typeof modes)[number]["id"];

export default function LandingProductExperience() {
  const [mode, setMode] = useState<Mode>("agent");
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(38);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setProgress((value) => (value >= 92 ? 12 : value + 0.35)), 70);
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

  const active = modes.find((item) => item.id === mode) ?? modes[0];
  const ActiveIcon = active.icon;

  return (
    <section className="hsx-product-stage" aria-label="הדגמה אינטראקטיבית של Hypescript">
      <div className="hsx-orbit hsx-orbit-one"><Sparkles size={14} />כתוביות RTL</div>
      <div className="hsx-orbit hsx-orbit-two"><MousePointer2 size={14} />עריכה ישירה</div>
      <div className="hsx-orbit hsx-orbit-three"><Check size={14} />ללא חפיפות</div>

      <div
        className="hsx-laptop"
        ref={shellRef}
        onPointerMove={tilt}
        onPointerLeave={resetTilt}
      >
        <div className="hsx-laptop-lid">
          <div className="hsx-camera" />
          <div className="hsx-app">
            <header className="hsx-appbar">
              <div className="hsx-app-brand"><i>H</i><b>Hypescript</b></div>
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
                  <div className={`hsx-caption ${mode === "captions" ? "is-active" : ""}`}>סיפור טוב מתחיל במשפט אחד מדויק.</div>
                  <button type="button" className="hsx-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "עצירת ההדגמה" : "הפעלת ההדגמה"}>
                    {playing ? <span className="hsx-pause" /> : <Play size={18} fill="currentColor" />}
                  </button>
                </div>
                <div className="hsx-transport"><span>00:18.4 / 01:06.2</span><div><i style={{ width: `${progress}%` }} /></div><b>{playing ? "מתנגן" : "מושהה"}</b></div>
              </div>

              <aside className="hsx-inspector">
                <div className="hsx-ai-title"><span><Sparkles size={13} /></span><div><b>Hype AI</b><small>עורך יחד איתך</small></div><i>פעיל</i></div>
                <div className="hsx-chat-thread">
                  <p className="from-user">הפוך את הראיון לקליפ קצר לרשתות. הוסף כתוביות, כותרת ולוגו.</p>
                  <p className="from-agent"><b>הכנתי גרסה מלאה לבדיקה.</b><span>החיתוכים, העיצוב והפורמט כבר מסומנים על הטיימליין.</span></p>
                </div>
                <div className="hsx-mode-tabs" role="tablist" aria-label="מצבי הדגמה">
                  {modes.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)}><Icon size={14} /><span>{label}</span></button>
                  ))}
                </div>
                {mode === "transcript" && <div className="hsx-transcript"><small>תמלול חי</small><p>כשמתחילים עם <mark>אה...</mark> רעיון ברור, העריכה כבר מרגישה אחרת.</p><em>לחיצה על מילה עורכת את הווידאו</em></div>}
                {mode === "captions" && <div className="hsx-style-panel"><small>סגנון כתוביות</small><div className="hsx-style-preview">עברית. בדיוק במקום.</div><label>גודל <i><b /></i></label><label>רקע <span /><span /><span /></label></div>}
                {mode === "agent" && <div className="hsx-agent-panel"><small>תוכנית עריכה</small><div><WandSparkles size={14} /> התצוגה המקדימה מוכנה</div><ul><li><Check size={12} /> גרסה קצרה + כתוביות</li><li><Check size={12} /> כותרת, לוגו ו־9:16</li></ul></div>}
                <div className="hsx-chat-input"><span>בקש שינוי נוסף…</span><button type="button" aria-label="שליחת בקשה"><Send size={12} /></button></div>
              </aside>
            </div>

            <div className="hsx-timeline">
              <div className="hsx-timecodes"><span>00:00</span><span>00:15</span><span>00:30</span><span>00:45</span><span>01:00</span></div>
              <div className="hsx-track hsx-video-track"><b>וידאו</b>{[1,2,3,4,5,6].map((item) => <img key={item} src="/brand/landing-creator-frame.webp" alt="" />)}</div>
              <div className="hsx-track hsx-audio-track"><b>קול</b><div>{Array.from({ length: 46 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 17) % 74)}%` }} />)}</div></div>
              <div className="hsx-track hsx-caption-track"><b>כתוביות</b><span>סיפור טוב</span><span>מתחיל במשפט</span><span>אחד מדויק</span></div>
              <i className="hsx-playhead" style={{ right: `${progress}%` }} />
            </div>
          </div>
        </div>
        <div className="hsx-laptop-base"><i /></div>
      </div>

      <div className="hsx-live-note" aria-live="polite"><span><ActiveIcon size={15} /></span><div><b>{active.label}</b><small>{active.note}</small></div></div>
    </section>
  );
}
