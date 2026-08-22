"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Check, Play, Send, Sparkles, WandSparkles } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

type DemoCopy = { [key: string]: string | readonly string[]; steps: readonly string[] };
export const LANDING_DEMO_COPY = {
  he: { label:"הדגמה חיה של Hypescript", project:"פרויקט חדש · סרטון TikTok", media:"חומרי גלם", source:"ראיון ראשי", upload:"+ הוספת קובץ", export:"ייצוא", ai:"עורך AI", together:"עורך יחד איתך", active:"פעיל", ask:"קח את חומרי הגלם וצור מהם סרטון TikTok מהודק, ברמה גבוהה.", received:"קיבלתי את החומרים", analyze:"מנתח 24 דקות ומסמן רגעים חזקים", assembling:"מרכיב תצוגה מקדימה", ready:"הסרטון מוכן: 35 שניות, אנכי, עם קצב וכתוביות.", readyHint:"אפשר לצפות, לשנות או לייצא.", working:"עובד על הפרויקט", complete:"העריכה הושלמה", live:"כל פעולה מופיעה כאן בזמן אמת", preview:"התצוגה המקדימה מוכנה", steps:["בוחר רגעי שיא", "מסדר קצב וחיתוכים", "יוצר כתוביות וגרסה אנכית"], caption:"הרעיון החשוב — בלי שנייה מיותרת.", askMore:"בקש שינוי נוסף…", send:"שליחת בקשה", pause:"עצירת ההדגמה", play:"הפעלת ההדגמה", statusWork:"עובד…", statusReady:"מוכן", paused:"מושהה", video:"וידאו", audio:"קול", captions:"כתוביות" },
  en: { label:"Live Hypescript demo", project:"New project · TikTok video", media:"Raw media", source:"Main interview", upload:"+ Add file", export:"Export", ai:"AI editor", together:"Editing with you", active:"Live", ask:"Take this raw footage and make a polished, high-quality TikTok video.", received:"I have the footage", analyze:"Analyzing 24 minutes and marking the strongest moments", assembling:"Building a preview", ready:"Your video is ready: 35 seconds, vertical, paced and captioned.", readyHint:"Review, revise, or export it.", working:"Working on your project", complete:"Edit complete", live:"Every action appears here in real time", preview:"Preview is ready", steps:["Selecting highlights", "Tightening pace and cuts", "Creating captions and a vertical version"], caption:"The key idea — without a wasted second.", askMore:"Ask for another change…", send:"Send request", pause:"Pause demo", play:"Play demo", statusWork:"Working…", statusReady:"Ready", paused:"Paused", video:"Video", audio:"Audio", captions:"Captions" },
  ar: { label:"عرض حي لـ Hypescript", project:"مشروع جديد · فيديو TikTok", media:"المواد الخام", source:"المقابلة الرئيسية", upload:"+ إضافة ملف", export:"تصدير", ai:"محرر AI", together:"يحرر معك", active:"نشط", ask:"خذ المواد الخام وأنشئ فيديو TikTok احترافيًا ومكثفًا.", received:"استلمت المواد", analyze:"أحلل 24 دقيقة وأحدد أقوى اللحظات", assembling:"أجهز المعاينة", ready:"الفيديو جاهز: 35 ثانية، عمودي، بإيقاع وترجمة.", readyHint:"يمكنك المشاهدة أو التعديل أو التصدير.", working:"أعمل على المشروع", complete:"اكتمل التحرير", live:"كل خطوة تظهر هنا مباشرة", preview:"المعاينة جاهزة", steps:["اختيار أبرز اللحظات", "ضبط الإيقاع والقصات", "إنشاء الترجمة والنسخة العمودية"], caption:"الفكرة الأهم — بلا ثانية زائدة.", askMore:"اطلب تعديلًا آخر…", send:"إرسال الطلب", pause:"إيقاف العرض", play:"تشغيل العرض", statusWork:"جارٍ العمل…", statusReady:"جاهز", paused:"متوقف", video:"فيديو", audio:"صوت", captions:"ترجمة" },
  ru: { label:"Живая демонстрация Hypescript", project:"Новый проект · TikTok", media:"Исходники", source:"Основное интервью", upload:"+ Добавить файл", export:"Экспорт", ai:"AI-редактор", together:"Редактирует вместе с вами", active:"Активен", ask:"Возьми исходники и создай динамичный профессиональный TikTok.", received:"Материалы получены", analyze:"Анализирую 24 минуты и отмечаю лучшие моменты", assembling:"Собираю предпросмотр", ready:"Видео готово: 35 секунд, вертикальное, с ритмом и субтитрами.", readyHint:"Можно посмотреть, изменить или экспортировать.", working:"Работаю над проектом", complete:"Монтаж завершён", live:"Каждое действие видно здесь в реальном времени", preview:"Предпросмотр готов", steps:["Выбираю лучшие моменты", "Настраиваю ритм и склейки", "Создаю субтитры и вертикальную версию"], caption:"Главная мысль — без лишней секунды.", askMore:"Попросите ещё одно изменение…", send:"Отправить", pause:"Остановить демонстрацию", play:"Запустить демонстрацию", statusWork:"В работе…", statusReady:"Готово", paused:"Пауза", video:"Видео", audio:"Звук", captions:"Субтитры" },
  hi: { label:"Hypescript का लाइव डेमो", project:"नया प्रोजेक्ट · TikTok वीडियो", media:"रॉ मीडिया", source:"मुख्य इंटरव्यू", upload:"+ फ़ाइल जोड़ें", export:"एक्सपोर्ट", ai:"AI एडिटर", together:"आपके साथ एडिट करता है", active:"सक्रिय", ask:"इन रॉ फ़ाइलों से एक चुस्त, उच्च-गुणवत्ता वाला TikTok वीडियो बनाएँ।", received:"फ़ाइलें मिल गईं", analyze:"24 मिनट का विश्लेषण करके बेहतरीन पल चुन रहा हूँ", assembling:"प्रीव्यू बना रहा हूँ", ready:"वीडियो तैयार है: 35 सेकंड, वर्टिकल, सही गति और कैप्शन के साथ।", readyHint:"देखें, बदलें या एक्सपोर्ट करें।", working:"प्रोजेक्ट पर काम चल रहा है", complete:"एडिट पूरा हुआ", live:"हर कार्रवाई यहाँ रियल टाइम में दिखती है", preview:"प्रीव्यू तैयार है", steps:["मुख्य पल चुनना", "गति और कट व्यवस्थित करना", "कैप्शन और वर्टिकल संस्करण बनाना"], caption:"मुख्य विचार — एक भी सेकंड बेकार नहीं।", askMore:"एक और बदलाव माँगें…", send:"अनुरोध भेजें", pause:"डेमो रोकें", play:"डेमो चलाएँ", statusWork:"काम जारी…", statusReady:"तैयार", paused:"रुका हुआ", video:"वीडियो", audio:"ऑडियो", captions:"कैप्शन" },
} satisfies Record<AppLocale, DemoCopy>;

export default function LandingProductExperience() {
  const { locale } = useI18n();
  const copy = LANDING_DEMO_COPY[locale];
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
          <aside className="hsx-media-panel"><strong>{copy.media}</strong><div className="hsx-media-card active"><img src="/brand/landing-creator-frame.webp" alt="" /><span>{copy.source}</span></div><div className="hsx-media-card audio"><i /><i /><i /><i /><i /></div><button type="button">{copy.upload}</button></aside>
          <div className="hsx-canvas"><div className="hsx-video-frame"><img src="/brand/landing-creator-frame.webp" alt="" /><span className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></span><div className={`hsx-canvas-action action-${demoStep}`}><WandSparkles size={12} /><span>{activeAction || (demoStep === 1 ? copy.analyze : demoStep === 5 ? copy.assembling : ready ? copy.preview : copy.received)}</span></div><div className={`hsx-caption${demoStep >= 4 ? " is-visible" : ""}`}>{copy.caption}</div><button type="button" className="hsx-play" onClick={() => setPlaying((value) => !value)} aria-label={playing ? copy.pause : copy.play}>{playing ? <span className="hsx-pause" /> : <Play size={18} fill="currentColor" />}</button></div><div className="hsx-transport"><span>00:18.4 / 00:35.0</span><div><i style={{ width: `${progress}%` }} /></div><b>{playing ? (ready ? copy.statusReady : copy.statusWork) : copy.paused}</b></div></div>
          <aside className="hsx-inspector"><div className="hsx-ai-title"><span><Sparkles size={13} /></span><div><b>{copy.ai}</b><small>{copy.together}</small></div><i>{copy.active}</i></div><div className="hsx-chat-thread"><p className="from-user"><small>{copy.project}</small><b>{copy.ask}</b></p>{demoStep >= 1 && <p className="from-agent message-enter"><b>{copy.received}</b><span>{copy.analyze}</span></p>}{demoStep >= 2 && !ready && <div className="hsx-chat-operation message-enter"><WandSparkles size={12} /><span><b>{activeAction || copy.assembling}</b><small>{copy.live}</small></span><span className="hsx-thinking-dots"><i /><i /><i /></span></div>}{ready && <div className="hsx-chat-result message-enter"><div><img src="/brand/landing-creator-frame.webp" alt="" /><span><Play size={12} fill="currentColor" /></span></div><b>{copy.ready}</b><small>{copy.readyHint}</small></div>}</div><div className={`hsx-agent-panel ${ready ? "ready" : "working"}`}><small>{ready ? copy.complete : copy.working}</small><div><WandSparkles size={14} /> {ready ? copy.preview : copy.live}</div><ul>{copy.steps.map((step, index) => { const state = demoStep > index + 2 ? "done" : demoStep === index + 2 ? "current" : "pending"; return <li key={step} className={state}><Check size={12} />{step}</li>; })}</ul></div><div className="hsx-chat-input"><span>{copy.askMore}</span><button type="button" aria-label={copy.send}><Send size={12} /></button></div></aside>
        </div>
        <div className="hsx-timeline"><div className="hsx-timecodes"><span>00:00</span><span>00:09</span><span>00:18</span><span>00:27</span><span>00:35</span></div><div className="hsx-track hsx-video-track"><b>{copy.video}</b>{[1,2,3,4,5,6].map((item) => <img className={demoStep >= Math.ceil(item / 2) + 1 ? "edited" : ""} key={item} src="/brand/landing-creator-frame.webp" alt="" />)}</div><div className="hsx-track hsx-audio-track"><b>{copy.audio}</b><div>{Array.from({ length: 46 }, (_, index) => <i key={index} style={{ height: `${20 + ((index * 17) % 74)}%` }} />)}</div></div><div className="hsx-track hsx-caption-track"><b>{copy.captions}</b><span>{copy.steps[0]}</span><span>{copy.steps[1]}</span><span>{copy.steps[2]}</span></div><i className="hsx-playhead" style={{ left: `${progress}%` }} /></div>
      </div></div><div className="hsx-laptop-base"><i /></div>
    </div>
  </section>;
}
