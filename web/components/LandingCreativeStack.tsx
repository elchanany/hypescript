"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

const COPY = {
  he:{ eyebrow:"יצירה בתוך אותה שיחה", title:"קול, מוזיקה, תמונה ועריכה — מחוברים לפרויקט", body:"Hypescript משתמש בשירותים שמחוברים בפועל כדי לתמלל, ליצור קריינות ומוזיקה מקורית, לייצר תמונות ולנתח את הבקשה. אחר כך הוא מסדר את הכול לגרסאות שמתאימות לרשתות.", tools:["קול, מוזיקה ותמלול","יצירת תמונות","הבנת הבריף והתכנון"], social:"אותו סיפור. כל מסך." },
  en:{ eyebrow:"Creation inside one conversation", title:"Voice, music, images, and editing stay in one project", body:"Hypescript uses connected services to transcribe, create narration and original music, generate images, and understand the brief—then shapes it for every channel.", tools:["Voice, music & transcription","Image generation","Brief and scene understanding"], social:"One story. Every screen." },
  ar:{ eyebrow:"الإنشاء داخل محادثة واحدة", title:"الصوت والموسيقى والصورة والتحرير في مشروع واحد", body:"يستخدم Hypescript خدمات متصلة للتفريغ وإنشاء التعليق والموسيقى الأصلية والصور وفهم الطلب، ثم يجهز النسخ لكل منصة.", tools:["الصوت والموسيقى والتفريغ","إنشاء الصور","فهم الفكرة والمشاهد"], social:"قصة واحدة. لكل شاشة." },
  ru:{ eyebrow:"Создание в одном диалоге", title:"Голос, музыка, изображения и монтаж — в одном проекте", body:"Hypescript использует подключённые сервисы для транскрибации, озвучки, оригинальной музыки, изображений и понимания задачи, а затем готовит версии для площадок.", tools:["Голос, музыка и текст","Создание изображений","Понимание задачи и сцен"], social:"Одна история. Любой экран." },
  hi:{ eyebrow:"एक ही बातचीत में क्रिएशन", title:"आवाज़, संगीत, तस्वीर और एडिटिंग—एक प्रोजेक्ट में", body:"Hypescript जुड़े हुए टूल से ट्रांसक्रिप्शन, नैरेशन, ओरिजिनल संगीत, तस्वीरें और ब्रीफ़ की समझ तैयार करता है, फिर हर प्लेटफ़ॉर्म के लिए संस्करण बनाता है।", tools:["आवाज़, संगीत और ट्रांसक्रिप्शन","तस्वीर बनाना","ब्रीफ़ और सीन समझना"], social:"एक कहानी। हर स्क्रीन।" },
} satisfies Record<AppLocale,{eyebrow:string;title:string;body:string;tools:readonly string[];social:string}>;

const PROVIDERS = [
  ["/brand/icons/elevenlabs.svg","ElevenLabs"],
  ["/brand/icons/googlegemini.svg","Gemini"],
] as const;
const NETWORKS = [
  ["/brand/icons/tiktok.svg","TikTok"],
  ["/brand/icons/instagram.svg","Instagram"],
  ["/brand/icons/youtube.svg","YouTube"],
  ["/brand/icons/facebook.svg","Facebook"],
] as const;

export default function LandingCreativeStack(){
  const {locale}=useI18n(); const copy=COPY[locale];
  return <section className="marketing-section landing-creative-stack">
    <div className="landing-creative-copy"><span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.body}</p></div>
    <div className="landing-creative-map" aria-label={copy.title}>
      <div className="creative-core"><b>H</b><span>Hypescript</span></div>
      <div className="creative-provider provider-eleven"><img src={PROVIDERS[0][0]} alt=""/><b>{PROVIDERS[0][1]}</b><small>{copy.tools[0]}</small></div>
      <div className="creative-provider provider-image"><i>GPT</i><b>GPT Image</b><small>{copy.tools[1]}</small></div>
      <div className="creative-provider provider-gemini"><img src={PROVIDERS[1][0]} alt=""/><b>{PROVIDERS[1][1]}</b><small>{copy.tools[2]}</small></div>
      <div className="creative-social"><strong>{copy.social}</strong>{NETWORKS.map(([src,name])=><span key={name}><img src={src} alt=""/><small>{name}</small></span>)}</div>
      <i className="creative-path path-one"/><i className="creative-path path-two"/><i className="creative-path path-three"/>
    </div>
  </section>;
}
