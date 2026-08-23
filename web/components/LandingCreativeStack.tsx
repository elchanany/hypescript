"use client";

import { useEffect, useState, type CSSProperties } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

const COPY = {
  he: {
    eyebrow: "יצירה בתוך אותה שיחה",
    title: "כל מנוע יצירתי מתחבר לאותה עריכה",
    body: "קול, מוזיקה, תמלול, תמונה ותכנון עובדים יחד — והכול חוזר לפרויקט אחד שאפשר לראות, לשנות ולייצא.",
    tools: [
      "קול, מוזיקה ותמלול",
      "GPT Image ותכנון חזותי",
      "הבנת בריף וסצנות",
      "תמלול מהיר כגיבוי",
      "עריכה ושיחה",
      "ניתוח ותכנון ב־BYOK",
    ],
    social: "יוצר גרסאות מוכנות לכל רשת",
    output: "סרטון 9:16 נבנה עכשיו",
    activeFeeds: [
      "מפיק קריינות ומוזיקת רקע בעברית…",
      "מעבד שכבות ויזואליות ו-GPT Image…",
      "מנתח מבנה סצנות ובריף חכם…",
      "תמלול מהיר בזמן שיא 0.28s…",
      "חותך שתיקות ומסדר רצף דיבור…",
      "מתכנן רצף סיפורי ב-BYOK…",
    ],
    liveStatus: "מחובר ופעיל",
  },
  en: {
    eyebrow: "Creation inside one conversation",
    title: "Every creative engine feeds the same edit",
    body: "Voice, music, transcription, images, and planning work together—then return to one project you can inspect, change, and export.",
    tools: [
      "Voice, music & transcription",
      "GPT Image & visual planning",
      "Brief and scene understanding",
      "Fast transcription fallback",
      "Editing and conversation",
      "BYOK analysis and planning",
    ],
    social: "Creates a ready version for every channel",
    output: "Building a 9:16 video",
    activeFeeds: [
      "Synthesizing Hebrew narration & music…",
      "Rendering GPT Image & visual layers…",
      "Analyzing scenes & multimodal brief…",
      "Fast STT fallback in 0.28s…",
      "Snapping silence & editing flow…",
      "Planning storyboard via BYOK…",
    ],
    liveStatus: "Connected & Live",
  },
  ar: {
    eyebrow: "الإنشاء داخل محادثة واحدة",
    title: "كل محرك إبداعي يعمل داخل نفس المونتاج",
    body: "الصوت والموسيقى والتفريغ والصور والتخطيط تعمل معًا، ثم تعود إلى مشروع واحد يمكنك مراجعته وتعديله وتصديره.",
    tools: [
      "الصوت والموسيقى والتفريغ",
      "GPT Image والتخطيط البصري",
      "فهم الفكرة والمشاهد",
      "تفريغ سريع احتياطي",
      "التحرير والمحادثة",
      "التحليل والتخطيط عبر BYOK",
    ],
    social: "ينشئ نسخة جاهزة لكل منصة",
    output: "يتم إنشاء فيديو 9:16",
    activeFeeds: [
      "توليد التعليق الصوتي والموسيقى…",
      "معالجة الصور والطبقات البصرية…",
      "تحليل المشاهد والفكرة بالذكاء الاصطناعي…",
      "تفريغ فائق السرعة في 0.28 ثانية…",
      "قص الصمت وترتيب الحديث…",
      "تخطيط القصة عبر BYOK…",
    ],
    liveStatus: "متصل ونشط",
  },
  ru: {
    eyebrow: "Создание в одном диалоге",
    title: "Все творческие движки работают над одним монтажом",
    body: "Голос, музыка, транскрибация, изображения и планирование работают вместе и возвращаются в один проект для проверки, правок и экспорта.",
    tools: [
      "Голос, музыка и текст",
      "GPT Image и визуальный план",
      "Понимание задачи и сцен",
      "Быстрая резервная транскрибация",
      "Монтаж и диалог",
      "Анализ и планирование BYOK",
    ],
    social: "Готовит версию для каждой площадки",
    output: "Собирается видео 9:16",
    activeFeeds: [
      "Генерация озвучки и музыки…",
      "Рендеринг GPT Image и визуала…",
      "Анализ сцен и контекста…",
      "Сверхбыстрый STT за 0.28с…",
      "Удаление пауз и сборка ритма…",
      "Планирование сюжета в BYOK…",
    ],
    liveStatus: "Подключён и активен",
  },
  hi: {
    eyebrow: "एक ही बातचीत में क्रिएशन",
    title: "हर क्रिएटिव इंजन उसी एडिट पर काम करता है",
    body: "आवाज़, संगीत, ट्रांसक्रिप्शन, तस्वीरें और योजना साथ काम करते हैं—फिर सब एक ऐसे प्रोजेक्ट में लौटता है जिसे आप देख, बदल और एक्सपोर्ट कर सकते हैं।",
    tools: [
      "आवाज़, संगीत और ट्रांसक्रिप्शन",
      "GPT Image और विज़ुअल प्लानिंग",
      "ब्रीफ़ और सीन की समझ",
      "तेज़ ट्रांसक्रिप्शन बैकअप",
      "एडिटिंग और बातचीत",
      "BYOK विश्लेषण और योजना",
    ],
    social: "हर प्लेटफ़ॉर्म के लिए तैयार वर्ज़न",
    output: "9:16 वीडियो बन रहा है",
    activeFeeds: [
      "आवाज़ और संगीत तैयार हो रहा है…",
      "GPT Image और विज़ुअल प्रोसेस हो रहे हैं…",
      "सीन और स्क्रिप्ट का विश्लेषण…",
      "0.28s में तेज़ ट्रांसक्रिप्शन…",
      "खामोशी हटाकर एडिट तैयार…",
      "BYOK के साथ स्टोरी प्लानिंग…",
    ],
    liveStatus: "सक्रिय और कनेक्टेड",
  },
} satisfies Record<
  AppLocale,
  {
    eyebrow: string;
    title: string;
    body: string;
    tools: readonly string[];
    social: string;
    output: string;
    activeFeeds: readonly string[];
    liveStatus: string;
  }
>;

const PROVIDERS = [
  {
    id: "elevenlabs",
    name:"ElevenLabs",
    src: "/brand/icons/elevenlabs.svg",
    className: "provider-eleven",
    color: "#f43f5e",
    accentGlow: "rgba(244, 63, 94, 0.4)",
    gradient: "linear-gradient(135deg, #f43f5e, #fda4af)",
    pathId: "path-elevenlabs",
    kind: "audio-wave",
    roleLabel: "Voice & Audio",
  },
  {
    id: "openai",
    name:"OpenAI",
    src: "/brand/icons/openai.svg",
    className: "provider-openai",
    color: "#10a37f",
    accentGlow: "rgba(16, 163, 127, 0.4)",
    gradient: "linear-gradient(135deg, #10a37f, #6ee7b7)",
    pathId: "path-openai",
    kind: "visual-pixel",
    roleLabel: "Vision & GPT",
  },
  {
    id: "anthropic",
    name:"Anthropic",
    src: "/brand/icons/anthropic.svg",
    className: "provider-anthropic",
    color: "#d97706",
    accentGlow: "rgba(217, 119, 6, 0.4)",
    gradient: "linear-gradient(135deg, #d97706, #fde68a)",
    pathId: "path-anthropic",
    kind: "synapse-gold",
    roleLabel: "Reasoning & BYOK",
  },
  {
    id: "gemini",
    name:"Gemini",
    src: "/brand/icons/googlegemini.svg",
    className: "provider-gemini",
    color: "#818cf8",
    accentGlow: "rgba(129, 140, 248, 0.45)",
    gradient: "linear-gradient(135deg, #818cf8, #38bdf8)",
    pathId: "path-gemini",
    kind: "stardust-spark",
    roleLabel: "Multimodal & Scenes",
  },
] as const;

const NETWORKS = [
  ["/brand/icons/tiktok.svg", "TikTok"],
  ["/brand/icons/instagram.svg", "Instagram"],
  ["/brand/icons/youtube.svg", "YouTube"],
  ["/brand/icons/facebook.svg", "Facebook"],
] as const;

export default function LandingCreativeStack() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  const [activeProvider, setActiveProvider] = useState(0);
  const [isManualHover, setIsManualHover] = useState(false);

  useEffect(() => {
    if (isManualHover) return;
    const timer = window.setTimeout(
      () => setActiveProvider((value) => (value + 1) % PROVIDERS.length),
      2600
    );
    return () => window.clearTimeout(timer);
  }, [activeProvider, isManualHover]);

  const curProvider = PROVIDERS[activeProvider];

  return (
    <section className="marketing-section landing-creative-stack hsx-reveal">
      <div className="landing-creative-copy">
        <span>{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>

      <div
        className="landing-creative-map"
        aria-label={copy.title}
        data-active-provider={activeProvider}
        style={
          {
            "--active-brand-color": curProvider.color,
            "--active-brand-glow": curProvider.accentGlow,
          } as CSSProperties
        }
      >
        {/* Ambient Radial Background Glow matching active provider */}
        <div className="creative-ambient-glow" />

        {/* SVG Precision Curved Paths connecting Core to all Provider Cards & Output */}
        <svg
          className="creative-svg-canvas"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Gradients for each provider */}
            <linearGradient id="grad-elevenlabs" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b9f65d" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="grad-openai" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10a37f" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b9f65d" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="grad-anthropic" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#b9f65d" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="grad-gemini" x1="100%" y1="50%" x2="0%" y2="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#b9f65d" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="grad-output" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b9f65d" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#22d3a6" stopOpacity="0.8" />
            </linearGradient>

            {/* Glow Filter */}
            <filter id="svg-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ElevenLabs Curve: Top-Left (235, 110) -> Core (450, 260) */}
          <path
            className={`creative-wire wire-elevenlabs ${activeProvider === 0 ? "active" : ""}`}
            d="M 235 110 C 330 120, 390 190, 450 260"
            stroke="url(#grad-elevenlabs)"
            fill="none"
          />
          {/* OpenAI Curve: Top-Right (765, 110) -> Core (550, 260) */}
          <path
            className={`creative-wire wire-openai ${activeProvider === 1 ? "active" : ""}`}
            d="M 765 110 C 670 120, 610 190, 550 260"
            stroke="url(#grad-openai)"
            fill="none"
          />
          {/* Anthropic Curve: Mid-Left (235, 290) -> Core (435, 305) */}
          <path
            className={`creative-wire wire-anthropic ${activeProvider === 2 ? "active" : ""}`}
            d="M 235 290 C 310 295, 370 300, 435 305"
            stroke="url(#grad-anthropic)"
            fill="none"
          />
          {/* Gemini Curve: Mid-Right (765, 290) -> Core (565, 305) */}
          <path
            className={`creative-wire wire-gemini ${activeProvider === 3 ? "active" : ""}`}
            d="M 765 290 C 690 295, 630 300, 565 305"
            stroke="url(#grad-gemini)"
            fill="none"
          />

          {/* Vertical Stream from Core (500, 355) down to 9:16 Output Box (500, 412) */}
          <path
            className="creative-wire wire-output active"
            d="M 500 355 L 500 412"
            stroke="url(#grad-output)"
            fill="none"
          />

          {/* Stream from 9:16 Output Box (500, 475) down to Social Channels (500, 595) */}
          <path
            className="creative-wire wire-social"
            d="M 500 475 L 500 595"
            stroke="rgba(185, 246, 93, 0.4)"
            fill="none"
          />
          <path
            className="creative-wire-branch"
            d="M 260 625 C 320 600, 420 595, 500 595 C 580 595, 680 600, 740 625"
            stroke="rgba(185, 246, 93, 0.25)"
            fill="none"
          />
        </svg>

        {/* Central Hypescript Hub Node */}
        <div className="creative-core" style={{ borderColor: curProvider.color }}>
          <BrandLogo variant="icon" size="md" decorative />
          <span>Hypescript</span>
          <i />
          <i />
          <span className="core-pulse-beacon" />
        </div>

        {/* 6 AI Provider Cards */}
        {PROVIDERS.map((provider, index) => {
          const isCurrent = activeProvider === index;
          return (
            <button
              type="button"
              className={`creative-provider ${provider.className} ${isCurrent ? "is-active" : ""}`}
              aria-pressed={isCurrent}
              onClick={() => {
                setActiveProvider(index);
                setIsManualHover(true);
              }}
              onMouseEnter={() => {
                setActiveProvider(index);
                setIsManualHover(true);
              }}
              onMouseLeave={() => setIsManualHover(false)}
              key={provider.name}
            >
              {"src" in provider ? (
                <img src={provider.src} alt="" />
              ) : (
                <i aria-hidden="true">{provider.mark}</i>
              )}
              <div className="provider-info">
                <b>{provider.name}</b>
                <small>{copy.tools[index]}</small>
              </div>
              <span className="provider-status-dot" aria-hidden="true" />
              {isCurrent && <span className="provider-live-pill">{copy.liveStatus}</span>}

              {/* Specialized Provider Thematic Particles / Badge */}
              <div className={`provider-signal-badge kind-${provider.kind}`} aria-hidden="true">
                {provider.kind === "audio-wave" && (
                  <span className="mini-eq">
                    <i /><i /><i /><i />
                  </span>
                )}
                {provider.kind === "visual-pixel" && <span className="mini-lens">✦</span>}
                {provider.kind === "stardust-spark" && <span className="mini-gemini">✧</span>}
                {provider.kind === "lightning-speed" && <span className="mini-bolt">⚡</span>}
                {provider.kind === "cyber-packet" && <span className="mini-cyber">01</span>}
                {provider.kind === "synapse-gold" && <span className="mini-synapse">◎</span>}
              </div>
            </button>
          );
        })}

        {/* 9:16 Active Output Preview Stage */}
        <div className="creative-output" aria-live="polite">
          <div className="output-screen-thumb">
            <i />
            <i />
            <i />
          </div>
          <div className="output-text-stream">
            <div className="output-tag">
              <span>9:16</span>
              <small>{curProvider.roleLabel}</small>
            </div>
            <b>{copy.output}</b>
            <p className="output-live-action">{copy.activeFeeds[activeProvider]}</p>
          </div>
        </div>

        {/* Multi-Platform Social Export Bar */}
        <div className="creative-social">
          <strong>{copy.social}</strong>
          {NETWORKS.map(([src, name], index) => (
            <span
              style={{ "--network-delay": `${index * 0.16}s` } as CSSProperties}
              key={name}
            >
              <img src={src} alt="" />
              <small>{name}</small>
            </span>
          ))}
        </div>

        {/* Backward Compatibility Path Anchors for CSS hooks & tests */}
        {PROVIDERS.map((provider, index) => (
          <i
            className={`creative-path path-${index + 1}`}
            aria-hidden="true"
            key={`${provider.name}-path`}
          />
        ))}
      </div>
    </section>
  );
}
