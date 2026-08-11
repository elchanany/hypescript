"use client";

import { Blend, Check, Sparkles, WandSparkles } from "lucide-react";
import type { Clip } from "@/lib/editor/model";

type ClipPatch = Partial<Pick<Clip, "contrast" | "saturation" | "visualFadeIn" | "visualFadeOut">>;

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
  return <>
    <div className="panel-header"><span className="title">{kind === "effects" ? <WandSparkles size={15} /> : <Blend size={15} />}{kind === "effects" ? "אפקטים" : "מעברים"}</span></div>
    <div className="panel-scroll creative-panel">
      {!clip ? <div className="panel-empty">בחר קטע וידאו בטיימליין כדי להחיל {kind === "effects" ? "מראה" : "מעבר"}.</div> : kind === "effects" ? <>
        <div className="creative-head"><Sparkles size={15} /><div><strong>מראות</strong><span>נשמרים בקטע ומופיעים גם בייצוא</span></div></div>
        <div className="creative-grid">{LOOKS.map((look) => {
          const active = Math.abs((clip.contrast ?? 1) - look.contrast) < .01 && Math.abs((clip.saturation ?? 1) - look.saturation) < .01;
          return <button key={look.id} className={`creative-card ${look.className} ${active ? "active" : ""}`} onClick={() => onApply({ contrast: look.contrast, saturation: look.saturation })}><i />{active && <Check size={14} />}<strong>{look.name}</strong><span>{look.note}</span></button>;
        })}</div>
      </> : <>
        <div className="creative-head"><Blend size={15} /><div><strong>Fade כניסה ויציאה</strong><span>מעבר אמיתי ב־Preview ובייצוא</span></div></div>
        <div className="transition-list">{FADES.map((fade) => {
          const active = Math.abs((clip.visualFadeIn ?? 0) - fade.seconds) < .01 && Math.abs((clip.visualFadeOut ?? 0) - fade.seconds) < .01;
          return <button key={fade.id} className={active ? "active" : ""} onClick={() => onApply({ visualFadeIn: fade.seconds, visualFadeOut: fade.seconds })}><span className={`transition-preview ${fade.id}`}><i /></span><span><strong>{fade.name}</strong><small>{fade.seconds ? `${fade.seconds}s` : "חיתוך ישיר"}</small></span>{active && <Check size={14} />}</button>;
        })}</div>
        <p className="creative-footnote">מעברי סצנה מורכבים יתווספו לקטלוג רק כשהם שקולים בנגן ובייצוא — לא תצוגה מדומה.</p>
      </>}
    </div>
  </>;
}
