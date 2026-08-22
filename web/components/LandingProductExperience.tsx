"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Play, Send, Sparkles, WandSparkles } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

type DemoCopy = { [key: string]: string | readonly string[]; steps: readonly string[] };
export const LANDING_DEMO_IMAGES: Record<AppLocale, string> = {
  he: "/brand/landing-demo-he.png",
  en: "/brand/landing-demo-en.png",
  ar: "/brand/landing-demo-ar.png",
  ru: "/brand/landing-demo-ru.png",
  hi: "/brand/landing-demo-hi.png",
};
export const LANDING_DEMO_COPY = {
  he: { label:"הדגמה חיה של Hypescript", project:"קמפיין דירה · Reels", media:"חומרי גלם", source:"סיור בדירה", upload:"+ הוספת קובץ", export:"ייצוא", ai:"עורך AI", together:"עורך יחד איתך", active:"פעיל", ask:"הפוך את הסיור בדירה לסרטון Reels קצר שמדגיש את האור, החדרים והמחיר.", received:"קיבלתי את החומרים", analyze:"מאתר את החדרים והמשפטים שמוכרים את הדירה", assembling:"מרכיב תצוגה מקדימה", ready:"מודעת ה־Reels מוכנה: 35 שניות, אנכית ועם קריאה לפעולה.", readyHint:"אפשר לצפות, לשנות או לייצא.", working:"עובד על הפרויקט", complete:"העריכה הושלמה", live:"כל פעולה מופיעה כאן בזמן אמת", preview:"התצוגה המקדימה מוכנה", steps:["בוחר את זוויות הדירה הטובות", "מסדר סיור קצר וקצבי", "מוסיף מחיר וקריאה לפעולה"], caption:"דירה מוארת. מיקום מעולה. כניסה מיידית.", askMore:"בקש שינוי נוסף…", send:"שליחת בקשה", pause:"עצירת ההדגמה", play:"הפעלת ההדגמה", statusWork:"עובד…", statusReady:"מוכן", paused:"מושהה", video:"וידאו", audio:"קול", captions:"כתוביות" },
  en: { label:"Live Hypescript demo", project:"Product review · TikTok", media:"Raw media", source:"Skincare review", upload:"+ Add file", export:"Export", ai:"AI editor", together:"Editing with you", active:"Live", ask:"Turn this product review into a crisp TikTok with a strong opening and three benefits.", received:"I have the footage", analyze:"Finding the hook, proof, and clearest product moments", assembling:"Building a preview", ready:"Your product video is ready: 28 seconds with a hook, benefits, and CTA.", readyHint:"Review, revise, or export it.", working:"Working on your project", complete:"Edit complete", live:"Every action appears here in real time", preview:"Preview is ready", steps:["Opening on the strongest claim", "Cutting to three clear benefits", "Adding captions and a final CTA"], caption:"Three reasons this stays in my routine.", askMore:"Ask for another change…", send:"Send request", pause:"Pause demo", play:"Play demo", statusWork:"Working…", statusReady:"Ready", paused:"Paused", video:"Video", audio:"Audio", captions:"Captions" },
  ar: { label:"عرض حي لـ Hypescript", project:"رحلة قصيرة · Reels", media:"المواد الخام", source:"يوم في المدينة", upload:"+ إضافة ملف", export:"تصدير", ai:"محرر AI", together:"يحرر معك", active:"نشط", ask:"اصنع من يوم الرحلة فيديو Reels سريعًا يبدأ بالمشهد الأقوى ويعرض ثلاثة أماكن.", received:"استلمت المواد", analyze:"أحدد أفضل المشاهد والأماكن في التسجيل", assembling:"أجهز المعاينة", ready:"فيديو الرحلة جاهز: 32 ثانية، عمودي وبإيقاع سريع.", readyHint:"يمكنك المشاهدة أو التعديل أو التصدير.", working:"أعمل على المشروع", complete:"اكتمل التحرير", live:"كل خطوة تظهر هنا مباشرة", preview:"المعاينة جاهزة", steps:["البدء بأقوى لقطة", "ترتيب الأماكن كقصة قصيرة", "إضافة العناوين والموسيقى"], caption:"ثلاث محطات تستحق الزيارة في يوم واحد.", askMore:"اطلب تعديلًا آخر…", send:"إرسال الطلب", pause:"إيقاف العرض", play:"تشغيل العرض", statusWork:"جارٍ العمل…", statusReady:"جاهز", paused:"متوقف", video:"فيديو", audio:"صوت", captions:"ترجمة" },
  ru: { label:"Живая демонстрация Hypescript", project:"Урок дизайна · Shorts", media:"Исходники", source:"Урок с планшетом", upload:"+ Добавить файл", export:"Экспорт", ai:"AI-редактор", together:"Редактирует вместе с вами", active:"Активен", ask:"Собери из урока короткий Shorts: одна идея, три шага и крупные схемы с планшета.", received:"Материалы получены", analyze:"Нахожу объяснение, шаги и кадры с планшета", assembling:"Собираю предпросмотр", ready:"Урок готов: 42 секунды, три шага и читаемые подписи.", readyHint:"Можно посмотреть, изменить или экспортировать.", working:"Работаю над проектом", complete:"Монтаж завершён", live:"Каждое действие видно здесь в реальном времени", preview:"Предпросмотр готов", steps:["Выделяю одну главную идею", "Собираю три понятных шага", "Увеличиваю схемы и добавляю подписи"], caption:"Одна идея. Три шага. Готовый результат.", askMore:"Попросите ещё одно изменение…", send:"Отправить", pause:"Остановить демонстрацию", play:"Запустить демонстрацию", statusWork:"В работе…", statusReady:"Готово", paused:"Пауза", video:"Видео", audio:"Звук", captions:"Субтитры" },
  hi: { label:"Hypescript का लाइव डेमो", project:"रेसिपी वीडियो · Shorts", media:"रॉ मीडिया", source:"घर की रेसिपी", upload:"+ फ़ाइल जोड़ें", export:"एक्सपोर्ट", ai:"AI एडिटर", together:"आपके साथ एडिट करता है", active:"सक्रिय", ask:"इस पूरी रेसिपी को 40 सेकंड के Shorts में बदलें—सामग्री, तीन स्टेप और अंतिम प्लेट दिखाएँ।", received:"फ़ाइलें मिल गईं", analyze:"सामग्री, मुख्य स्टेप और तैयार डिश खोज रहा हूँ", assembling:"प्रीव्यू बना रहा हूँ", ready:"रेसिपी वीडियो तैयार है: 40 सेकंड, तीन स्टेप और साफ़ कैप्शन।", readyHint:"देखें, बदलें या एक्सपोर्ट करें।", working:"प्रोजेक्ट पर काम चल रहा है", complete:"एडिट पूरा हुआ", live:"हर कार्रवाई यहाँ रियल टाइम में दिखती है", preview:"प्रीव्यू तैयार है", steps:["सामग्री की तेज़ शुरुआत", "तीन आसान स्टेप दिखाना", "तैयार डिश और सेव CTA जोड़ना"], caption:"तीन आसान स्टेप में घर का स्वाद।", askMore:"एक और बदलाव माँगें…", send:"अनुरोध भेजें", pause:"डेमो रोकें", play:"डेमो चलाएँ", statusWork:"काम जारी…", statusReady:"तैयार", paused:"रुका हुआ", video:"वीडियो", audio:"ऑडियो", captions:"कैप्शन" },
} satisfies Record<AppLocale, DemoCopy>;

export default function LandingProductExperience() {
  const { locale } = useI18n();
  const copy = LANDING_DEMO_COPY[locale];
  const demoImage = LANDING_DEMO_IMAGES[locale];
  const [playing, setPlaying] = useState(true);
  const [demoStep, setDemoStep] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setDemoStep((value) => (value >= 6 ? 0 : value + 1)), demoStep === 6 ? 3600 : demoStep === 0 ? 2200 : 1800);
    return () => window.clearTimeout(timer);
  }, [playing, demoStep]);
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>(".hsx-reveal"));
    if (!("IntersectionObserver" in window)) { items.forEach((item) => item.classList.add("is-visible")); return; }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.14 });
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch" || !shellRef.current) return;
    const rect = shellRef.current.getBoundingClientRect();
    shellRef.current.style.setProperty("--tilt-x", `${-((event.clientY - rect.top) / rect.height - 0.5) * 2.4}deg`);
    shellRef.current.style.setProperty("--tilt-y", `${((event.clientX - rect.left) / rect.width - 0.5) * 3.5}deg`);
  }
  const progress = [8, 20, 36, 54, 72, 88, 100][demoStep];
  const activeAction = demoStep >= 2 && demoStep <= 4 ? copy.steps[demoStep - 2] : null;
  const ready = demoStep === 6;

  return <section className="hsx-product-stage" aria-label={copy.label}>
    <div className="hsx-laptop" ref={shellRef} onPointerMove={tilt} onPointerLeave={() => { shellRef.current?.style.setProperty("--tilt-x", "0deg"); shellRef.current?.style.setProperty("--tilt-y", "0deg"); }}>
      <div className="hsx-laptop-lid"><div className="hsx-camera" /><div className="hsx-app" data-demo-step={demoStep}>
        <header className="hsx-appbar"><div className="hsx-app-brand"><BrandLogo variant="icon" size="xs" decorative /><b>Hypescript</b></div><span>{copy.project}</span><button type="button">{copy.export}</button></header>
        <div className="hsx-workspace">
          <aside className="hsx-media-panel"><strong>{copy.media}</strong><div className="hsx-media-card active"><img src={demoImage} alt="" /><span>{copy.source}</span></div><div className="hsx-media-card audio"><i /><i /><i /><i /><i /></div><button type="button">{copy.upload}</button></aside>
          <div className="hsx-canvas"><div className="hsx-video-frame"><img src={demoImage} alt="" /><span className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></span><div className={`hsx-canvas-action action-${demoStep}`}><WandSparkles size={12} /><span>{activeAction || (demoStep === 1 ? copy.analyze : demoStep === 5 ? copy.assembling : ready ? copy.preview : copy.received)}</span></div><div className={`hsx-caption${demoStep >= 4 ? " is-visible" : ""}`}>{copy.caption}</div><button type="button" className="hsx-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? copy.pause : copy.play}>{playing ? <span className="hsx-pause" /> : <Play size={18} fill="currentColor" />}</button></div><div className="hsx-transport"><span>00:18.4 / 00:35.0</span><div><i style={{ width: `${progress}%` }} /></div><b>{playing ? (ready ? copy.statusReady : copy.statusWork) : copy.paused}</b></div></div>
          <aside className="hsx-inspector"><div className="hsx-ai-title"><span><Sparkles size={13} /></span><div><b>{copy.ai}</b><small>{copy.together}</small></div><i>{copy.active}</i></div><div className="hsx-chat-thread"><p className="from-user"><small>{copy.project}</small><b>{copy.ask}</b></p>{demoStep >= 1 && <p className="from-agent message-enter"><b>{copy.received}</b><span>{copy.analyze}</span></p>}{demoStep >= 2 && !ready && <div className="hsx-chat-operation message-enter"><WandSparkles size={12} /><span><b>{activeAction || copy.assembling}</b><small>{copy.live}</small></span><span className="hsx-thinking-dots"><i /><i /><i /></span></div>}{ready && <div className="hsx-chat-result message-enter"><div><img src={demoImage} alt="" /><span><Play size={12} fill="currentColor" /></span></div><b>{copy.ready}</b><small>{copy.readyHint}</small></div>}</div><div className={`hsx-agent-panel ${ready ? "ready" : "working"}`}><small>{ready ? copy.complete : copy.working}</small><div><WandSparkles size={14} /> {ready ? copy.preview : copy.live}</div><ul>{copy.steps.map((step, index) => { const state = demoStep > index + 2 ? "done" : demoStep === index + 2 ? "current" : "pending"; return <li key={step} className={state}><Check size={12} />{step}</li>; })}</ul></div><div className="hsx-chat-input"><span>{copy.askMore}</span><button type="button" aria-label={copy.send}><Send size={12} /></button></div></aside>
        </div>
        <div className="hsx-timeline"><div className="hsx-timecodes"><span>00:00</span><span>00:09</span><span>00:18</span><span>00:27</span><span>00:35</span></div><div className="hsx-track hsx-video-track"><b>{copy.video}</b>{[1,2,3,4,5,6].map((item) => <img className={demoStep >= Math.ceil(item / 2) + 1 ? "edited" : ""} key={item} src={demoImage} alt="" />)}</div><div className="hsx-track hsx-audio-track"><b>{copy.audio}</b><div>{Array.from({ length: 46 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 17) % 74)}%` }} />)}</div></div><div className="hsx-track hsx-caption-track"><b>{copy.captions}</b><span>{copy.steps[0]}</span><span>{copy.steps[1]}</span><span>{copy.steps[2]}</span></div><i className="hsx-playhead" style={{ left: `${progress}%` }} /></div>
      </div></div><div className="hsx-laptop-base"><i /></div>
    </div>
  </section>;
}
