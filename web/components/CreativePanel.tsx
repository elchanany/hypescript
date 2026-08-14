"use client";

import { useMemo, useState } from "react";
import { Blend, Check, Search, Sparkles, WandSparkles } from "@/components/icons";
import type { Clip } from "@/lib/editor/model";
import { EFFECT_CATEGORIES, searchEffects } from "@/lib/creative/effects";
import { searchTransitions, TRANSITION_CATEGORIES } from "@/lib/creative/transitions";

type ClipPatch = Partial<Pick<Clip, "contrast" | "saturation" | "effectId" | "effectAmount" | "visualFadeIn" | "visualFadeOut">>;

const LOOKS = [
  { id: "clean", name: "נקי", note: "מאוזן וטבעי", contrast: 1, saturation: 1, className: "clean" },
  { id: "crisp", name: "חד", note: "קונטרסט ברור", contrast: 1.14, saturation: 1.08, className: "crisp" },
  { id: "warm", name: "חם", note: "צבע עשיר", contrast: 1.06, saturation: 1.24, className: "warm" },
  { id: "soft", name: "רך", note: "מראה רגוע", contrast: .92, saturation: .9, className: "soft" },
  { id: "mono", name: "שחור לבן", note: "מונוכרום", contrast: 1.08, saturation: 0, className: "mono" },
] as const;

const FADES = [
  { id: "none", name: "ללא", seconds: 0 },
  { id: "quick", name: "מהיר", seconds: .18 },
  { id: "smooth", name: "חלק", seconds: .4 },
  { id: "cinematic", name: "קולנועי", seconds: .8 },
] as const;

export default function CreativePanel({ kind, clip, onApply }: { kind: "effects" | "transitions"; clip: Clip | null; onApply: (patch: ClipPatch) => void }) {
  const [query, setQuery] = useState("");
  const effects = useMemo(() => searchEffects(query), [query]);
  const transitions = useMemo(() => searchTransitions(query), [query]);
  return <>
    <div className="panel-header"><span className="title">{kind === "effects" ? <WandSparkles size={15} /> : <Blend size={15} />}{kind === "effects" ? "אפקטים" : "מעברים"}</span></div>
    <div className="panel-scroll creative-panel">
      <label className="creative-search"><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`חיפוש ב־${kind === "effects" ? "52 אפקטים" : "57 מעברים"}`} /></label>
      {!clip ? <div className="panel-empty">יש לבחור קטע וידאו בטיימליין כדי להחיל {kind === "effects" ? "מראה" : "מעבר"}.</div> : kind === "effects" ? <>
        <div className="creative-head"><Sparkles size={15} /><div><strong>מראות</strong><span>נשמרים בקטע ומופיעים גם בייצוא</span></div></div>
        {EFFECT_CATEGORIES.map((category) => { const group = effects.filter((effect) => effect.category === category.id); return group.length ? <section className="creative-catalog-group" key={category.id}><h3>{category.labelHe}</h3><div className="creative-grid">{group.map((effect) => <button key={effect.id} className={`creative-card ${clip.effectId === effect.id ? "active" : ""}`} onClick={() => onApply({ effectId: effect.id, effectAmount: 1 })}><i style={{ filter: effect.css }} /><strong>{effect.labelHe}</strong><span>{effect.adjustable ? "עוצמה ניתנת לכוונון" : "מראה קבוע"}</span>{clip.effectId === effect.id && <Check size={13} />}</button>)}</div></section> : null; })}
      </> : <>
        <div className="creative-head"><Blend size={15} /><div><strong>Fade כניסה ויציאה</strong><span>מעבר אמיתי ב־Preview ובייצוא</span></div></div>
        <div className="transition-list">{FADES.map((fade) => {
          const active = Math.abs((clip.visualFadeIn ?? 0) - fade.seconds) < .01 && Math.abs((clip.visualFadeOut ?? 0) - fade.seconds) < .01;
          return <button key={fade.id} className={active ? "active" : ""} onClick={() => onApply({ visualFadeIn: fade.seconds, visualFadeOut: fade.seconds })}><span className={`transition-preview ${fade.id}`}><i /></span><span><strong>{fade.name}</strong><small>{fade.seconds ? `${fade.seconds}s` : "חיתוך ישיר"}</small></span>{active && <Check size={14} />}</button>;
        })}</div>
        {TRANSITION_CATEGORIES.map((category) => { const group = transitions.filter((item) => item.category === category.id); return group.length ? <section className="creative-catalog-group" key={category.id}><h3>{category.labelHe}</h3><div className="transition-catalog">{group.map((item) => <button key={item.id} title="קטלוג מאומת; חיבור מלא לצומת החיתוך בחבילת הרינדור הבאה" disabled><span className={`transition-preview ${item.category}`}><i /></span><strong>{item.labelHe}</strong><small>{item.defaultDuration.toFixed(2)}s</small></button>)}</div></section> : null; })}
        <p className="creative-footnote">57 המעברים עברו ולידציית FFmpeg. עד חיבור xfade לצומת החיתוך הם מוצגים כקטלוג נעול ולא ככפתור מדומה.</p>
      </>}
    </div>
  </>;
}
