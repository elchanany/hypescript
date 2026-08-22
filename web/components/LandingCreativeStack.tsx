"use client";

import { useEffect, useState, type CSSProperties } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

const COPY = {
  he:{ eyebrow:"יצירה בתוך אותה שיחה", title:"כל מנוע יצירתי מתחבר לאותה עריכה", body:"קול, מוזיקה, תמלול, תמונה ותכנון עובדים יחד — והכול חוזר לפרויקט אחד שאפשר לראות, לשנות ולייצא.", tools:["קול, מוזיקה ותמלול","GPT Image ותכנון חזותי","הבנת בריף וסצנות","תמלול מהיר כגיבוי","עריכה ושיחה","ניתוח ותכנון ב־BYOK"], social:"יוצר גרסאות מוכנות לכל רשת", output:"סרטון 9:16 נבנה עכשיו" },
  en:{ eyebrow:"Creation inside one conversation", title:"Every creative engine feeds the same edit", body:"Voice, music, transcription, images, and planning work together—then return to one project you can inspect, change, and export.", tools:["Voice, music & transcription","GPT Image & visual planning","Brief and scene understanding","Fast transcription fallback","Editing and conversation","BYOK analysis and planning"], social:"Creates a ready version for every channel", output:"Building a 9:16 video" },
  ar:{ eyebrow:"الإنشاء داخل محادثة واحدة", title:"كل محرك إبداعي يعمل داخل نفس المونتاج", body:"الصوت والموسيقى والتفريغ والصور والتخطيط تعمل معًا، ثم تعود إلى مشروع واحد يمكنك مراجعته وتعديله وتصديره.", tools:["الصوت والموسيقى والتفريغ","GPT Image والتخطيط البصري","فهم الفكرة والمشاهد","تفريغ سريع احتياطي","التحرير والمحادثة","التحليل والتخطيط عبر BYOK"], social:"ينشئ نسخة جاهزة لكل منصة", output:"يتم إنشاء فيديو 9:16" },
  ru:{ eyebrow:"Создание в одном диалоге", title:"Все творческие движки работают над одним монтажом", body:"Голос, музыка, транскрибация, изображения и планирование работают вместе и возвращаются в один проект для проверки, правок и экспорта.", tools:["Голос, музыка и текст","GPT Image и визуальный план","Понимание задачи и сцен","Быстрая резервная транскрибация","Монтаж и диалог","Анализ и планирование BYOK"], social:"Готовит версию для каждой площадки", output:"Собирается видео 9:16" },
  hi:{ eyebrow:"एक ही बातचीत में क्रिएशन", title:"हर क्रिएटिव इंजन उसी एडिट पर काम करता है", body:"आवाज़, संगीत, ट्रांसक्रिप्शन, तस्वीरें और योजना साथ काम करते हैं—फिर सब एक ऐसे प्रोजेक्ट में लौटता है जिसे आप देख, बदल और एक्सपोर्ट कर सकते हैं।", tools:["आवाज़, संगीत और ट्रांसक्रिप्शन","GPT Image और विज़ुअल प्लानिंग","ब्रीफ़ और सीन की समझ","तेज़ ट्रांसक्रिप्शन बैकअप","एडिटिंग और बातचीत","BYOK विश्लेषण और योजना"], social:"हर प्लेटफ़ॉर्म के लिए तैयार वर्ज़न", output:"9:16 वीडियो बन रहा है" },
} satisfies Record<AppLocale,{eyebrow:string;title:string;body:string;tools:readonly string[];social:string;output:string}>;

const PROVIDERS = [
  { src:"/brand/icons/elevenlabs.svg", name:"ElevenLabs", className:"provider-eleven" },
  { src:"/brand/icons/openai.svg", name:"OpenAI", className:"provider-openai" },
  { src:"/brand/icons/googlegemini.svg", name:"Gemini", className:"provider-gemini" },
  { mark:"G", name:"Groq", className:"provider-groq" },
  { src:"/brand/icons/deepseek.svg", name:"DeepSeek", className:"provider-deepseek" },
  { src:"/brand/icons/anthropic.svg", name:"Anthropic", className:"provider-anthropic" },
] as const;
const NETWORKS = [
  ["/brand/icons/tiktok.svg","TikTok"],
  ["/brand/icons/instagram.svg","Instagram"],
  ["/brand/icons/youtube.svg","YouTube"],
  ["/brand/icons/facebook.svg","Facebook"],
] as const;

export default function LandingCreativeStack(){
  const {locale}=useI18n();
  const copy=COPY[locale];
  const [activeProvider,setActiveProvider]=useState(0);

  useEffect(()=>{
    const timer=window.setTimeout(()=>setActiveProvider((value)=>(value+1)%PROVIDERS.length),2200);
    return()=>window.clearTimeout(timer);
  },[activeProvider]);

  return <section className="marketing-section landing-creative-stack hsx-reveal">
    <div className="landing-creative-copy"><span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.body}</p></div>
    <div className="landing-creative-map" aria-label={copy.title} data-active-provider={activeProvider}>
      <div className="creative-core"><BrandLogo variant="icon" size="md" decorative/><span>Hypescript</span><i/><i/></div>
      {PROVIDERS.map((provider,index)=><button type="button" className={`creative-provider ${provider.className}`} aria-pressed={activeProvider===index} onClick={()=>setActiveProvider(index)} key={provider.name}>
        {"src" in provider ? <img src={provider.src} alt=""/> : <i aria-hidden="true">{provider.mark}</i>}<b>{provider.name}</b><small>{copy.tools[index]}</small><span aria-hidden="true"/>
      </button>)}
      <div className="creative-output" aria-live="polite"><div><i/><i/><i/></div><span>9:16</span><b>{copy.output}</b></div>
      <div className="creative-social"><strong>{copy.social}</strong>{NETWORKS.map(([src,name],index)=><span style={{"--network-delay":`${index * .16}s`} as CSSProperties} key={name}><img src={src} alt=""/><small>{name}</small></span>)}</div>
      {PROVIDERS.map((provider,index)=><i className={`creative-path path-${index+1}`} aria-hidden="true" key={`${provider.name}-path`}/>) }
    </div>
  </section>;
}
