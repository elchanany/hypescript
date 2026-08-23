"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, AudioWaveform, Captions, Check, Film, Layers3, Play, Scissors, Sparkles, WandSparkles, Zap } from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

type PlaygroundCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  tabs: {
    title: string;
    badge: string;
    description: string;
    stat: string;
    statLabel: string;
  }[];
  demoBadge: string;
  tryPrompt: string;
};

const PLAYGROUND_COPY: Record<AppLocale, PlaygroundCopy> = {
  he: {
    eyebrow: "מנוע העריכה החכם בפעולה",
    title: "במקום שעות של עבודה ידנית — לחיצה אחת",
    subtitle: "בחרו יכולת וראו כיצד Hypescript מעבד, מעצב ומשדרג את הווידאו בזמן אמת.",
    demoBadge: "סימולציית סטודיו חיה",
    tryPrompt: "נסו לבחור פיצ'ר למעלה:",
    tabs: [
      {
        title: "חיתוך שתיקות ומהססים",
        badge: "0.2s דיוק",
        description: "מזהה 'אהה...', שתיקות ונשימות מיותרות ומסיר אותן אוטומטית לרצף דיבור מהודק וקצבי.",
        stat: "-58%",
        statLabel: "זמן מבוזבז בסרטון",
      },
      {
        title: "כתוביות ויראליות באנימציה",
        badge: "RTL 100%",
        description: "כתוביות מונפשות בסגנון קריוקי עם הדגשת מילה בזמן אמת, אימוג'ים מותאמים ויישור עברית מושלם.",
        stat: "x3.4",
        statLabel: "יותר צפיות עד הסוף",
      },
      {
        title: "מוזיקה והנמכת קול חכמה",
        badge: "Auto-Ducking",
        description: "שכבת מוזיקת רקע מקורית שמונמכת בדיוק כשיש דיבור ומתגברת במעברים ובסופי משפטים.",
        stat: "100%",
        statLabel: "סאונד מאוזן ומורשה",
      },
      {
        title: "התאמת פורמט אוטומטית",
        badge: "9:16 · 16:9 · 1:1",
        description: "המרה מיידית של הסרטון לכל הפורמטים המובילים עם מעקב חכם אחרי הדובר במרכז הפריים.",
        stat: "1-Click",
        statLabel: "מוכן לכל הרשתות",
      },
    ],
  },
  en: {
    eyebrow: "Smart Editing Engine in Action",
    title: "Instead of hours of manual work — one click",
    subtitle: "Pick an editing superpower and see how Hypescript transforms footage in real time.",
    demoBadge: "Live Studio Simulator",
    tryPrompt: "Select a feature above:",
    tabs: [
      {
        title: "Silence & Filler Removal",
        badge: "0.2s precision",
        description: "Detects 'umms', pauses and awkward breaths, auto-snipping them for a tight and energetic flow.",
        stat: "-58%",
        statLabel: "Wasted video time",
      },
      {
        title: "Kinetic Animated Captions",
        badge: "Word-sync",
        description: "Karaoke-style dynamic captions with live word highlight, contextual emojis, and custom styling.",
        stat: "x3.4",
        statLabel: "Higher retention",
      },
      {
        title: "Smart Music & Auto-Ducking",
        badge: "Auto-Ducking",
        description: "Original background soundtrack that automatically ducks under speech and rises during transitions.",
        stat: "100%",
        statLabel: "Balanced licensed audio",
      },
      {
        title: "Instant Multi-Format Reframe",
        badge: "9:16 · 16:9 · 1:1",
        description: "Instant reformatting across all social ratios with intelligent speaker centering.",
        stat: "1-Click",
        statLabel: "Ready for every channel",
      },
    ],
  },
  ar: {
    eyebrow: "محرك التحرير الذكي قيد العمل",
    title: "بدل ساعات من العمل اليدوي — نقرة واحدة",
    subtitle: "اختر ميزة وشاهد كيف يحرر Hypescript الفيديو ويحسنه مباشرة.",
    demoBadge: "محاكاة الاستوديو الحي",
    tryPrompt: "اختر ميزة من الأعلى:",
    tabs: [
      {
        title: "إزالة السكتات والتأتأة",
        badge: "دقة 0.2s",
        description: "يتعرف على الوقفات والتردد ويزيلها تلقائيًا ليصبح الفيديو سريعًا ومترابطًا.",
        stat: "-58%",
        statLabel: "وقت مستقطع",
      },
      {
        title: "ترجمة متحركة بصرية",
        badge: "RTL 100%",
        description: "نصوص متحركة بنمط الكاريوكي مع تمييز الكلمات وتوافق كامل مع العربية.",
        stat: "x3.4",
        statLabel: "معدل تفاعل أعلى",
      },
      {
        title: "موسيقى وتخفيض تلقائي",
        badge: "Auto-Ducking",
        description: "موسيقى خلفية تخفت تلقائيًا أثناء الكلام وترتفع في الفواصل.",
        stat: "100%",
        statLabel: "صوت متوازن ومرخص",
      },
      {
        title: "إعادة تأطير تلقائية",
        badge: "9:16 · 16:9 · 1:1",
        description: "تحويل فوري لجميع المقاسات مع تتبع ذكي للمتحدث في وسط الإطار.",
        stat: "1-Click",
        statLabel: "جاهز للنشر",
      },
    ],
  },
  ru: {
    eyebrow: "Умный движок монтажа в действии",
    title: "Вместо часов ручной работы — один клик",
    subtitle: "Выберите функцию и посмотрите, как Hypescript улучшает видео в реальном времени.",
    demoBadge: "Живой симулятор студии",
    tryPrompt: "Выберите режим выше:",
    tabs: [
      {
        title: "Удаление пауз и запинок",
        badge: "Точность 0.2с",
        description: "Находит слова-паразиты и неловкие паузы, создавая плотный динамичный ритм.",
        stat: "-58%",
        statLabel: "Лишнего хронометража",
      },
      {
        title: "Анимированные субтитры",
        badge: "Синхронно",
        description: "Динамичные караоке-субтитры с подсветкой слов и стильным оформлением.",
        stat: "x3.4",
        statLabel: "Удержание зрителей",
      },
      {
        title: "Музыка с авто-дакингом",
        badge: "Auto-Ducking",
        description: "Фоновая музыка автоматически приглушается во время речи и нарастает в паузах.",
        stat: "100%",
        statLabel: "Чистый баланс звука",
      },
      {
        title: "Авто-рефрейминг 9:16",
        badge: "9:16 · 16:9 · 1:1",
        description: "Мгновенная адаптация видео под все площадки с удержанием спикера в центре кадра.",
        stat: "1-Click",
        statLabel: "Готово к публикации",
      },
    ],
  },
  hi: {
    eyebrow: "स्मार्ट एडिटिंग इंजन लाइव",
    title: "घंटों के काम के बदले — सिर्फ एक क्लिक",
    subtitle: "एक फ़ीचर चुनें और देखें Hypescript कैसे वीडियो को रियल-टाइम में अपग्रेड करता है।",
    demoBadge: "लाइव स्टूडियो सिम्युलेटर",
    tryPrompt: "ऊपर से फ़ीचर चुनें:",
    tabs: [
      {
        title: "खामोशी और रुकावटें हटाना",
        badge: "0.2s सटीकता",
        description: "अवांछित आवाज़ें और लंबी खामोशी पहचानकर वीडियो को तेज़ और सटीक बनाता है।",
        stat: "-58%",
        statLabel: "बचाया गया समय",
      },
      {
        title: "एनिमेटेड कैप्शंस",
        badge: "वर्ड-सिंक",
        description: "कराओके स्टाइल डायनामिक सबटाइटल जो बोले गए शब्दों के साथ चमकते हैं।",
        stat: "x3.4",
        statLabel: "अधिक व्यूज़ और रिटेंशन",
      },
      {
        title: "स्मार्ट म्यूज़िक और डकिंग",
        badge: "Auto-Ducking",
        description: "बैकग्राउंड म्यूज़िक जो बातचीत के दौरान अपने आप धीमा हो जाता है।",
        stat: "100%",
        statLabel: "संतुलित ऑडियो",
      },
      {
        title: "मल्टी-फ़ॉर्मेट रीफ़्रेम",
        badge: "9:16 · 16:9 · 1:1",
        description: "सभी सोशल मीडिया फ़ॉर्मेट्स के लिए स्मार्ट स्पीकर ट्रैकिंग।",
        stat: "1-Click",
        statLabel: "सभी प्लेटफ़ॉर्म्स के लिए",
      },
    ],
  },
};

export default function LandingStudioPlayground() {
  const { locale } = useI18n();
  const copy = PLAYGROUND_COPY[locale];
  const [activeTab, setActiveTab] = useState(0);
  const [isAutoCycling, setIsAutoCycling] = useState(true);

  useEffect(() => {
    if (!isAutoCycling) return;
    const timer = window.setTimeout(() => {
      setActiveTab((prev) => (prev + 1) % copy.tabs.length);
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [activeTab, isAutoCycling, copy.tabs.length]);

  const active = copy.tabs[activeTab];

  return (
    <section className="marketing-section hsx-studio-playground hsx-reveal" aria-label={copy.title}>
      <div className="marketing-section-head">
        <span>{copy.eyebrow}</span>
        <h2>{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </div>

      {/* Feature Selector Tabs */}
      <div className="hsx-playground-tabs" role="tablist">
        {copy.tabs.map((tab, index) => {
          const isSelected = activeTab === index;
          return (
            <button
              key={tab.title}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`hsx-tab-btn ${isSelected ? "active" : ""}`}
              onClick={() => {
                setIsAutoCycling(false);
                setActiveTab(index);
              }}
            >
              <div className="hsx-tab-icon">
                {index === 0 && <Scissors size={19} />}
                {index === 1 && <Captions size={19} />}
                {index === 2 && <AudioWaveform size={19} />}
                {index === 3 && <Film size={19} />}
              </div>
              <div className="hsx-tab-text">
                <strong>{tab.title}</strong>
                <small>{tab.badge}</small>
              </div>
              {isSelected && <span className="hsx-tab-progress" />}
            </button>
          );
        })}
      </div>

      {/* Interactive Studio Stage */}
      <div className="hsx-playground-stage" data-active-mode={activeTab}>
        {/* Left/Info Column */}
        <div className="hsx-stage-details">
          <div className="hsx-stage-badge">
            <Sparkles size={13} />
            <span>{copy.demoBadge}</span>
          </div>
          <h3>{active.title}</h3>
          <p>{active.description}</p>

          <div className="hsx-stage-stats">
            <div className="hsx-stat-box">
              <b>{active.stat}</b>
              <span>{active.statLabel}</span>
            </div>
            <div className="hsx-stat-box accent">
              <b>0.3s</b>
              <span>זמן תגובה ממוצע</span>
            </div>
          </div>

          <div className="hsx-stage-prompt-box">
            <div className="prompt-header">
              <WandSparkles size={14} />
              <span>הנחיה לדוגמה בעברית</span>
            </div>
            <code>
              {activeTab === 0 && '״תחתוך לי את כל השתיקות מעל 0.3 שניות ותסיר מהסרטון את כל הגימגומים״'}
              {activeTab === 1 && '״הוסף כתוביות בסגנון קריוקי עם היילייט צהוב זוהר ואימוג׳י בכל משפט״'}
              {activeTab === 2 && '״שלב מוזיקת רקע קצבית בווליום עדין שמונמכת אוטומטית כשאני מדבר״'}
              {activeTab === 3 && '״הפוך את הווידאו האופקי לקליפ 9:16 עם מעקב אחרי הדובר וכותרת עליונה״'}
            </code>
          </div>
        </div>

        {/* Right/Screen Simulator */}
        <div className="hsx-stage-screen">
          <div className="hsx-screen-header">
            <div className="hsx-screen-dots">
              <i /><i /><i />
            </div>
            <span className="hsx-screen-title">Hypescript Studio · 1080p 60fps</span>
            <span className="hsx-screen-live"><Zap size={11} /> LIVE PREVIEW</span>
          </div>

          <div className="hsx-screen-canvas">
            {/* Visual Screen based on active mode */}
            {activeTab === 0 && (
              <div className="hsx-demo-jumpcut">
                <div className="hsx-jumpcut-video">
                  <img src="/brand/landing-creator-frame.webp" alt="Live Jumpcut Preview" />
                  <div className="jumpcut-badge"><Scissors size={13} /> נוקו 14 שניות שתיקה</div>
                </div>
                <div className="hsx-jumpcut-timeline">
                  <div className="transcript-strip">
                    <span className="word kept">שלום לכולם</span>
                    <span className="word cut"><del>אה... אממ...</del></span>
                    <span className="word kept">היום נלמד</span>
                    <span className="word cut"><del>(שתיקה 1.8s)</del></span>
                    <span className="word kept">איך יוצרים סרטון ויראלי</span>
                  </div>
                  <div className="wave-strip">
                    {Array.from({ length: 32 }, (_, i) => (
                      <i
                        key={i}
                        className={i % 6 === 2 || i % 6 === 3 ? "is-cut" : "is-active"}
                        style={{ height: `${20 + ((i * 37) % 70)}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 1 && (
              <div className="hsx-demo-captions">
                <div className="hsx-caption-video">
                  <img src="/brand/landing-creator-male.webp" alt="Captions Preview" />
                  <div className="kinetic-caption-box">
                    <span className="caption-word">הסוד</span>
                    <span className="caption-word">הכי</span>
                    <span className="caption-word highlight">גדול ✦</span>
                    <span className="caption-word">בעריכת</span>
                    <span className="caption-word pop">וידאו! 🚀</span>
                  </div>
                  <div className="caption-style-tag">סגנון: TikTok Viral · צהוב פולס</div>
                </div>
                <div className="hsx-caption-presets">
                  <span className="preset-pill active">קריוקי זוהר</span>
                  <span className="preset-pill">MrBeast Pop</span>
                  <span className="preset-pill">נקי ויוקרתי</span>
                  <span className="preset-pill">שורה אחרי שורה</span>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="hsx-demo-audio">
                <div className="hsx-audio-visual">
                  <img src="/brand/landing-creator-frame.webp" alt="Audio Preview" />
                  <div className="ducking-indicator">
                    <AudioWaveform size={14} />
                    <span>Auto-Ducking: -14dB בעת דיבור</span>
                  </div>
                </div>
                <div className="hsx-audio-tracks">
                  <div className="audio-track-row speech">
                    <span className="track-name">ערוץ דיבור (Voice)</span>
                    <div className="wave-bars">
                      {Array.from({ length: 28 }, (_, i) => (
                        <i key={i} style={{ height: `${30 + ((i * 41) % 65)}%` }} />
                      ))}
                    </div>
                  </div>
                  <div className="audio-track-row music">
                    <span className="track-name">מוזיקת רקע (Beats AI)</span>
                    <div className="wave-bars ducked">
                      {Array.from({ length: 28 }, (_, i) => (
                        <i key={i} style={{ height: `${i > 6 && i < 22 ? 18 : 65}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 3 && (
              <div className="hsx-demo-reframe">
                <div className="hsx-reframe-grid">
                  <div className="reframe-card vertical active">
                    <div className="ratio-badge">9:16 Reels / TikTok</div>
                    <img src="/brand/landing-creator-male.webp" alt="9:16" />
                    <div className="face-track-box" />
                  </div>
                  <div className="reframe-card square">
                    <div className="ratio-badge">1:1 Feed</div>
                    <img src="/brand/landing-creator-male.webp" alt="1:1" />
                  </div>
                  <div className="reframe-card wide">
                    <div className="ratio-badge">16:9 YouTube</div>
                    <img src="/brand/landing-creator-male.webp" alt="16:9" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="hsx-screen-footer">
            <div className="footer-left">
              <span className="status-dot active" />
              <span>רינדור מקומי מהיר ב-WASM · ללא איבוד איכות</span>
            </div>
            <div className="footer-right">
              <button type="button" className="btn-mini primary">
                <span>החל על הסרטון</span>
                <ArrowLeft size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
