"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from "@/components/icons";

const STEPS = [
  { target: "chat", title: "פשוט כותבים מה רוצים", text: "אפשר לדבר בעברית רגילה: להעלות סרטון, להסיר שתיקות, ליצור כתוביות, להוסיף לוגו או להכין ייצוא." },
  { target: "media", title: "הקבצים של הפרויקט", text: "כאן מעלים וידאו, תמונות, לוגואים ואודיו. אפשר גם לצרף אותם ישירות מתוך הצ׳אט." },
  { target: "preview", title: "רואים כל שינוי", text: "הנגן מציג את העריכה, הכתוביות והשכבות. אפשר לבחור ולגרור אלמנטים ישירות על התמונה." },
  { target: "timeline", title: "ציר הזמן", text: "כאן נמצאים הקטעים, האודיו, הכתוביות והשכבות. הסוכן עובד על אותו ציר שאתה רואה." },
  { target: "inspector", title: "שליטה מדויקת", text: "בחר קטע או שכבה כדי לשנות מיקום, גודל, שקיפות, עוצמת קול, fades ועוד." },
  { target: "tools", title: "ספריית היצירה", text: "מדיה, טקסט, כתוביות, מעברים ואפקטים נמצאים בסרגל הזה. תמיד אפשר לחזור להדרכה מהעזרה." },
] as const;

export default function EditorTour({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  useEffect(() => { if (open) setIndex(0); }, [open]);
  useEffect(() => {
    if (!open) return;
    const selector = `[data-tour="${STEPS[index].target}"]`;
    const element = document.querySelector<HTMLElement>(selector);
    document.querySelectorAll<HTMLElement>("[data-tour]").forEach((node) => node.classList.remove("tour-target"));
    element?.classList.add("tour-target");
    element?.scrollIntoView({ block: "nearest", inline: "nearest" });
    return () => element?.classList.remove("tour-target");
  }, [open, index]);
  if (!open) return null;
  const step = STEPS[index];
  return <div className="editor-tour" role="dialog" aria-modal="true" aria-labelledby="editor-tour-title">
    <div className="editor-tour-card">
      <div className="editor-tour-icon"><Sparkles size={18} /></div>
      <button className="editor-tour-close" onClick={onClose} aria-label="דלג על ההדרכה"><X size={16} /></button>
      <span className="editor-tour-count">{index + 1} מתוך {STEPS.length}</span>
      <h2 id="editor-tour-title">{step.title}</h2><p>{step.text}</p>
      <div className="editor-tour-progress">{STEPS.map((_, item) => <i key={item} className={item <= index ? "on" : ""} />)}</div>
      <div className="editor-tour-actions">
        {index > 0 && <button className="btn" onClick={() => setIndex((value) => value - 1)}><ArrowRight size={14} />הקודם</button>}
        <button className="btn primary" onClick={() => index === STEPS.length - 1 ? onClose() : setIndex((value) => value + 1)}>{index === STEPS.length - 1 ? <><Check size={14} />מתחילים</> : <>הבא<ArrowLeft size={14} /></>}</button>
      </div>
    </div>
  </div>;
}
