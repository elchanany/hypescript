"use client";

import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "@/components/icons";

const STEPS = [
  { target: "chat", title: "זה עורך הווידאו שלך", text: "כאן פשוט כותבים בעברית מה רוצים. הסוכן מבצע את הפעולות על הפרויקט, מציג התקדמות ומחזיר את הסרטון המוכן בצ׳אט.", example: "הסר שתיקות ונשימות, צור כתוביות בעברית והכן לי סרטון מוכן לייצוא." },
  { target: "media", title: "הקבצים של הפרויקט", text: "כאן מעלים וידאו, תמונות, לוגואים ואודיו. אפשר גם לצרף אותם ישירות מתוך הצ׳אט." },
  { target: "preview", title: "רואים כל שינוי", text: "הנגן מציג את העריכה, הכתוביות והשכבות. אפשר לבחור ולגרור אלמנטים ישירות על התמונה." },
  { target: "timeline", title: "ציר הזמן", text: "כאן נמצאים הקטעים, האודיו, הכתוביות והשכבות. הסוכן עובד על אותו ציר שאתה רואה." },
  { target: "inspector", title: "שליטה מדויקת", text: "בחירת קטע או שכבה מאפשרת שינוי מיקום, גודל, שקיפות, עוצמת קול, fades ועוד." },
  { target: "tools", title: "ספריית היצירה", text: "מדיה, טקסט, כתוביות, מעברים ואפקטים נמצאים בסרגל הזה. תמיד אפשר לחזור להדרכה מהעזרה." },
] as const;

type TourLayout = {
  target: { left: number; top: number; width: number; height: number };
  card: { left: number; top: number };
  arrow: "left" | "right" | "top" | "bottom";
};

const CARD_W = 390;
const CARD_H = 300;
const GAP = 22;
const EDGE = 16;

function calculateLayout(element: HTMLElement): TourLayout {
  const rect = element.getBoundingClientRect();
  const width = Math.min(CARD_W, window.innerWidth - EDGE * 2);
  const height = Math.min(CARD_H, window.innerHeight - EDGE * 2);
  const roomLeft = rect.left;
  const roomRight = window.innerWidth - rect.right;
  const roomTop = rect.top;
  const roomBottom = window.innerHeight - rect.bottom;
  let left = EDGE;
  let top = EDGE;
  let arrow: TourLayout["arrow"] = "right";

  if (roomLeft >= width + GAP) {
    left = rect.left - width - GAP;
    top = rect.top + rect.height / 2 - height / 2;
    arrow = "right";
  } else if (roomRight >= width + GAP) {
    left = rect.right + GAP;
    top = rect.top + rect.height / 2 - height / 2;
    arrow = "left";
  } else if (roomBottom >= height + GAP) {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.bottom + GAP;
    arrow = "top";
  } else {
    left = rect.left + rect.width / 2 - width / 2;
    top = rect.top - height - GAP;
    arrow = "bottom";
  }

  return {
    target: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
    card: {
      left: Math.max(EDGE, Math.min(window.innerWidth - width - EDGE, left)),
      top: Math.max(EDGE, Math.min(window.innerHeight - height - EDGE, top)),
    },
    arrow,
  };
}

export default function EditorTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [layout, setLayout] = useState<TourLayout | null>(null);
  useEffect(() => { if (open) setIndex(0); }, [open]);
  useLayoutEffect(() => {
    if (!open) return;
    const selector = `[data-tour="${STEPS[index].target}"]`;
    const element = document.querySelector<HTMLElement>(selector);
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
    const update = () => setLayout(element ? calculateLayout(element) : null);
    const frame = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [open, index]);
  if (!open) return null;
  const step = STEPS[index];
  const tryExample = () => {
    if (!("example" in step)) return;
    window.dispatchEvent(new CustomEvent("hypescript:chat-example", { detail: step.example }));
    onClose();
  };
  const cardStyle = layout ? ({ left: layout.card.left, top: layout.card.top } satisfies CSSProperties) : undefined;
  return <div className="editor-tour" role="dialog" aria-modal="true" aria-labelledby="editor-tour-title">
    {layout && <div className="editor-tour-spotlight" aria-hidden="true" style={{ left: layout.target.left, top: layout.target.top, width: layout.target.width, height: layout.target.height }} />}
    <div className={`editor-tour-card arrow-${layout?.arrow || "right"}`} style={cardStyle}>
      <div className="editor-tour-icon"><Sparkles size={18} /></div>
      <button className="editor-tour-close" onClick={onClose} aria-label="דלג על ההדרכה"><X size={16} /></button>
      <span className="editor-tour-count">{index + 1} מתוך {STEPS.length}</span>
      <h2 id="editor-tour-title">{step.title}</h2><p>{step.text}</p>
      {"example" in step && <div className="editor-tour-example"><span>לדוגמה</span><q>{step.example}</q><button className="btn" onClick={tryExample}>פתיחת הדוגמה בצ׳אט</button></div>}
      <div className="editor-tour-progress">{STEPS.map((_, item) => <i key={item} className={item <= index ? "on" : ""} />)}</div>
      <div className="editor-tour-actions">
        <button className="btn ghost editor-tour-skip" onClick={onClose}>דלג על ההדרכה</button>
        {index > 0 && <button className="btn" onClick={() => setIndex((value) => value - 1)}><ArrowRight size={14} />הקודם</button>}
        <button className="btn primary" onClick={() => index === STEPS.length - 1 ? onClose() : setIndex((value) => value + 1)}>{index === STEPS.length - 1 ? <><Check size={14} />מתחילים</> : <>הבא<ArrowLeft size={14} /></>}</button>
      </div>
    </div>
  </div>;
}
