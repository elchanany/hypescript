import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  AudioWaveform,
  BadgeCheck,
  Captions,
  Check,
  Cloud,
  Command,
  CreditCard,
  Download,
  Eye,
  Film,
  Gauge,
  Layers3,
  LockKeyhole,
  MessageSquareText,
  MousePointer2,
  Play,
  ScanText,
  Scissors,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "@/components/icons";
import BrandLogo from "@/components/BrandLogo";
import LandingProductExperience from "@/components/LandingProductExperience";
import LandingDeviceShowcase from "@/components/LandingDeviceShowcase";
import LandingUseCaseGallery from "@/components/LandingUseCaseGallery";
import LandingCreativeStack from "@/components/LandingCreativeStack";
import LandingStudioPlayground from "@/components/LandingStudioPlayground";
import LandingSubtitlePlayground from "@/components/LandingSubtitlePlayground";
import LandingAudioComparison from "@/components/LandingAudioComparison";
import LandingEfficiencyCalculator from "@/components/LandingEfficiencyCalculator";
import LandingThemeToggle from "@/components/LandingThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import T from "@/components/LandingText";
import HypescriptBrandSpinner from "@/components/HypescriptBrandSpinner";
import LandingLocalizedBody, { LandingHebrewOnly } from "@/components/LandingLocalizedBody";
import "./landing-v2.css";

export const metadata: Metadata = {
  title: "Hypescript — עורך וידאו AI בעברית",
  description:
    "עורך וידאו AI שפשוט מדברים איתו: מעלים חומר גלם, מבקשים שינוי בשפה טבעית ומקבלים סרטון מעוצב ומוכן לפרסום.",
  keywords: [
    "עריכת וידאו",
    "כתוביות בעברית",
    "חיתוך סרטונים",
    "עורך וידאו אונליין",
    "תמלול וידאו",
    "עורך AI",
  ],
  alternates: { canonical: "/welcome" },
};

const features = [
  {
    icon: MessageSquareText,
    title: "פשוט אומרים מה רוצים",
    text: "מתארים את הסרטון הרצוי בשפה טבעית — והעורך הופך את הבקשה לפעולות אמיתיות על הטיימליין.",
  },
  {
    icon: Scissors,
    title: "חותכים בטקסט או בטיימליין",
    text: "עורכים דרך התמלול או בדיוק של פריימים, בלי לקפוץ בין תוכנות כבדות ומסורבלות.",
  },
  {
    icon: Captions,
    title: "כתוביות עברית שנראות נכון",
    text: "RTL אמיתי, הדגשת מילים דינמית, תזמון מילה במילה וייצוא SRT מלא.",
  },
  {
    icon: Layers3,
    title: "וידאו, לוגו, תמונות וסאונד",
    text: "שכבות חופשיות, גרירה ישירה על הקנבס, שקיפות, Fade ומיקום מדויק.",
  },
  {
    icon: Cloud,
    title: "עבודה מקומית או בענן",
    text: "עיבוד וידאו מקומי מהיר ב-WASM בתוך הדפדפן לצד שמירה וסנכרון ענן מאובטח.",
  },
  {
    icon: Download,
    title: "רינדור שאפשר לסמוך עליו",
    text: "התקדמות ברורה, צפייה מיידית בתוצאה וייצוא מהיר לכל הרשתות באיכות 1080p/4K.",
  },
];

const plans = [
  {
    name: "Free",
    price: "₪0",
    suffix: "לתמיד",
    text: "העורך המלא עם המפתחות שלך במצב BYOK.",
    items: [
      "3 פרויקטים פעילים",
      "2GB אחסון ענן מאובטח",
      "10 דקות רינדור מקומי/ענן",
      "AI במצב מפתחות אישיים (BYOK)",
      "כתוביות RTL וייצוא SRT מלא",
    ],
    href: "/login?next=/dashboard",
    cta: "התחל בחינם",
  },
  {
    name: "Creator",
    price: "₪49",
    annualPrice: "₪39",
    suffix: "לחודש לאחר הניסיון",
    intro: "חודש ראשון ₪0",
    text: "AI מנוהל ללא צורך בהגדרת מפתחות וספקים.",
    items: [
      "50 פרויקטים",
      "20GB אחסון ענן מהיר",
      "120 דקות רינדור חודשיות",
      "מודלי AI מנוהלים + אפשרות BYOK",
      "קריינות ElevenLabs ו-GPT Image",
      "ייצוא מהיר בכל הפורמטים (9:16, 16:9)",
    ],
    featured: true,
    href: "/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth",
    cta: "התחל חודש ניסיון חינם",
  },
  {
    name: "Pro",
    price: "₪119",
    annualPrice: "₪95",
    suffix: "לחודש לאחר הניסיון",
    intro: "חודש ראשון ₪0",
    text: "לצוותים, סוכנויות ולנפח עבודה מקצועי.",
    items: [
      "500 פרויקטים",
      "100GB אחסון ייעודי",
      "480 דקות רינדור בחודש",
      "AI מנוהל בעדיפות עליונה",
      "תמיכה מועדפת וייצוא 4K",
      "קרדיטים מוזלים ומכסות גמישות",
    ],
    href: "/login?next=%2Faccount%3Fplan%3Dpro%26interval%3Dmonth",
    cta: "התחל חודש ניסיון חינם",
  },
];

const useCases = [
  {
    title: "TikTok, Reels ו-Shorts",
    tag: "סושיאל ויראלי",
    text: "הופכים חומר גלם ארוך לקליפ אנכי, קצבי, חתוך ומעוצב עם כתוביות מושכות עין.",
  },
  {
    title: "שיעורים והרצאות",
    tag: "עמותות ורבנים",
    text: "חיתוך שתיקות, התאמת טקסט מדויקת בעברית, הוספת כתוביות תורניות וייצוא פרקים קצרים.",
  },
  {
    title: "סרטוני מוצר ונדל״ן",
    tag: "שיווק ומכירות",
    text: "חיבור תמונות, הדגשת יתרונות, מיתוג לוגו, מוזיקת רקע וקריאה ברורה לפעולה.",
  },
  {
    title: "פודקאסטים וראיונות",
    tag: "תוכן ארוך לקצר",
    text: "איתור רגעי השיא בשיחה והפקת מגוון גרסאות מותאמות לכל פלטפורמה בלחיצה אחת.",
  },
];

const faqs = [
  {
    q: "האם נדרש כרטיס אשראי כדי להתחיל?",
    a: "ממש לא! מסלול Free פתוח לכולם ללא שום פרטי תשלום. כרטיס נדרש רק אם בוחרים להתחיל חודש ניסיון במסלולי Creator או Pro המנוהלים.",
  },
  {
    q: "האם הסרטונים והקבצים שלי נשארים פרטיים?",
    a: "כן, ב-100%. עיבוד הווידאו מתבצע ישירות בדפדפן שלך (באמצעות ffmpeg.wasm), ורק חלקי אודיו ממוקדים נשלחים לתמלול. הפרויקטים שלך מאובטחים לחלוטין.",
  },
  {
    q: "האם אפשר לערוך גם ידנית בנוסף להנחיות ל-AI?",
    a: "בהחלט. Hypescript מעניק לך שליטה מלאה: כל פעולה של ה-AI משתקפת על גבי הטיימליין והקנבס, וניתן להזיז שכבות, לחתוך פריימים ולשנות טקסטים ידנית בכל שלב.",
  },
  {
    q: "איך עובד מודל ה-BYOK (Bring Your Own Key)?",
    a: "אם יש לך מפתחות API משלך מ-OpenAI, Anthropic או ElevenLabs, תוכל להזין אותם בהגדרות ולהשתמש במערכת בעלות של הספקים ישירות ללא עמלות.",
  },
  {
    q: "מה קורה כאשר המכסה החודשית מסתיימת?",
    a: "המערכת אף פעם לא תחייב אותך בהפתעה. הפעולה תיעצר בבטחה, ותוכל לבחור אם להמתין לחודש הבא, לשדרג מסלול או להמשיך עם מפתחות אישיים.",
  },
];

export default function WelcomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hypescript",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description:
      "עורך וידאו AI בעברית שפועל בשיחה ומבצע חיתוך, כתוביות, עיצוב, שכבות ורינדור בענן.",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "ILS" },
      {
        "@type": "Offer",
        name: "Creator",
        price: "49",
        priceCurrency: "ILS",
        description: "חודש ראשון ללא חיוב, לאחר מכן ₪49 לחודש",
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "119",
        priceCurrency: "ILS",
        description: "חודש ראשון ללא חיוב, לאחר מכן ₪119 לחודש",
      },
    ],
  };

  return (
    <main className="marketing-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="marketing-nav">
        <Link href="/welcome" aria-label="Hypescript">
          <BrandLogo variant="horizontal" size="sm" theme="auto" priority decorative />
        </Link>
        <nav aria-label="ניווט ראשי">
          <a href="#features">
            <T id="nav.features" />
          </a>
          <a href="#how">
            <T id="nav.how" />
          </a>
          <a href="#for-whom">
            <T id="nav.audience" />
          </a>
          <a href="#pricing">
            <T id="nav.plans" />
          </a>
        </nav>
        <div className="marketing-actions">
          <LandingThemeToggle />
          <LanguageSwitcher compact />
          <Link href="/login" className="btn ghost">
            <T id="nav.login" />
          </Link>
          <Link href="/login?next=/dashboard" className="btn primary">
            <span>
              <T id="nav.trial" />
            </span>
            <ArrowLeft size={15} />
          </Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-hero-header">
          <div className="marketing-hero-content">
            <h1>
              <T id="hero.line1" />
              <br />
              <span>
                <T id="hero.line2" />
              </span>
            </h1>
            <p>
              <T id="hero.copy" />
            </p>
            <div className="marketing-hero-actions">
              <Link href="/login?next=/dashboard" className="btn primary marketing-cta">
                <T id="hero.start" /> <ArrowLeft size={17} />
              </Link>
              <a href="#how" className="btn secondary marketing-cta">
                <Play size={16} />
                <T id="hero.see" />
              </a>
            </div>
            <div className="marketing-trust">
              <LockKeyhole size={15} />
              <T id="hero.trust" />
            </div>
          </div>

          <div className="marketing-hero-visual">
            <HypescriptBrandSpinner size="hero" showCard priority />
          </div>
        </div>

        <LandingProductExperience />
      </section>

      <LandingUseCaseGallery />
      <LandingCreativeStack />

      {/* Interactive AI Studio Simulator */}
      <LandingStudioPlayground />

      {/* Interactive Subtitle Styles Playground */}
      <LandingSubtitlePlayground />

      <LandingLocalizedBody />

      <LandingHebrewOnly>
        {/* Visual Kinetic Feature Bar */}
        <div className="hsx-kinetic" aria-hidden="true">
          <div>
            <span>⚡ חיתוך שתיקות ב-0.2s</span>
            <i>✦</i>
            <span>💬 כתוביות קריוקי בעברית תקנית</span>
            <i>✦</i>
            <span>🎵 הנמכת מוזיקה אוטומטית (Auto-Ducking)</span>
            <i>✦</i>
            <span>📱 המרה מיידית ל-9:16 Reels ו-TikTok</span>
            <i>✦</i>
            <span>🔒 עיבוד מקומי מאובטח בדפדפן</span>
            <i>✦</i>
            <span>🎙️ קריינות ElevenLabs אותנטית</span>
            <i>✦</i>
          </div>
        </div>

        {/* 3 Core Trust Pillars */}
        <section className="marketing-proof hsx-reveal" aria-label="עקרונות המוצר">
          <article>
            <BadgeCheck size={20} />
            <div>
              <strong>דיוק ושליטה מלאה</strong>
              <span>כל שינוי נשאר גלוי על הטיימליין וניתן לביטול ולעריכה ידנית</span>
            </div>
          </article>
          <article>
            <Gauge size={20} />
            <div>
              <strong>בקשה אחת, ביצוע מלא</strong>
              <span>חיתוך, עיצוב שכבות, כתוביות ומוזיקה באותו פרויקט בלי לקפוץ בין תוכנות</span>
            </div>
          </article>
          <article>
            <ShieldCheck size={20} />
            <div>
              <strong>שקיפות וביטחון בעלויות</strong>
              <span>מכסות קשיחות והגנה מלאה — ללא חיובי חריגה אוטומטיים בהפתעה</span>
            </div>
          </article>
        </section>

        {/* Creator Transformation Story */}
        <section className="marketing-story hsx-reveal hsx-story" aria-label="מחומר גלם לתוכן מוכן">
          <div className="hsx-story-visual">
            <img
              src="/brand/landing-creator-frame.webp"
              alt="יוצרת תוכן באולפן מודרני"
              loading="eager"
            />
            <div className="hsx-story-caption">
              <span>לפני</span>
              <del>אז... מה שבעצם רציתי להגיד... אהה...</del>
              <span>אחרי</span>
              <strong>רציתי להפוך רעיון לסיפור שכולם ישתפו.</strong>
            </div>
            <div className="hsx-story-wave">
              {Array.from({ length: 26 }, (_, index) => (
                <i
                  key={index}
                  style={{ height: `${20 + ((index * 31) % 74)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="marketing-story-copy">
            <span>הכול קורה באותו מסך</span>
            <h2>
              מבקשים שינוי בעברית
              <br />
              ורואים אותו קורה מול העיניים
            </h2>
            <p>
              Hypescript מבין בדיוק את הכוונה שלך, מנתח את התמלול, בונה תוכנית עריכה חכמה
              ומבצע אותה על טיימליין אמיתי. אפשר להזיז כל שכבה, לעצב כל כותרת, להחליף סגנון
              ולהמשיך לערוך ידנית בכל רגע שתרצה.
            </p>
            <div className="story-metrics">
              <b>
                <strong>0</strong> תסכול
              </b>
              <b>
                <strong>1</strong> פרויקט מאוחד
              </b>
              <b>
                <strong>∞</strong> גרסאות לרשתות
              </b>
            </div>
          </div>
        </section>

        {/* Acoustic Audio Waveform Comparison */}
        <LandingAudioComparison />

        {/* Ultra-Rich Visual Bento Studio */}
        <section className="marketing-section marketing-lab hsx-reveal">
          <div className="marketing-section-head">
            <span>הצ׳אט והטיימליין מסונכרנים ב-100%</span>
            <h2>ארגז הכלים המתקדם ביותר לעריכת וידאו</h2>
            <p>
              שילוב של מהירות שיחה טבעית לצד דיוק של תוכנת עריכה מקצועית.
            </p>
          </div>
          <div className="marketing-bento">
            <article className="bento-command">
              <Command size={22} />
              <span>Conversational Video Engine</span>
              <h3>
                מדברים עם העורך.
                <br />
                מקבלים סרטון שלם.
              </h3>
              <div className="command-demo">
                <i>״הפוך את הראיון לקליפ 9:16 עם כותרת, חיתוך שתיקות וכתוביות צהובות״</i>
                <b>
                  <Zap size={13} /> תוכנית עריכה הורכבה ב-0.3 שניות
                </b>
              </div>
            </article>

            <article className="bento-transcript">
              <ScanText size={22} />
              <span>Transcript-Native Editing</span>
              <h3>הטקסט הוא כלי העריכה</h3>
              <p>מוחקים מילה מהטקסט — והיא נחתכת מיד מהווידאו והאודיו.</p>
              <div className="word-stream">
                <i>הפרק</i>
                <i>הזה</i>
                <i className="cut">אהה...</i>
                <i>מתחיל</i>
                <i>עכשיו</i>
              </div>
            </article>

            <article className="bento-precision">
              <AudioWaveform size={22} />
              <span>Frame-Accurate Timeline</span>
              <h3>דיוק של פריימים וגלי קול</h3>
              <p>טיימליין רב-שכבתי עם סנכרון חותמות זמן ברמת המילה הבודדת.</p>
              <div className="mini-wave">
                {Array.from({ length: 14 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            </article>

            <article className="bento-direct">
              <MousePointer2 size={22} />
              <span>Direct Canvas Manipulation</span>
              <h3>גוררים ומעצבים על הווידאו עצמו</h3>
              <div className="mini-canvas">
                <b>כותרת הפרק והדובר</b>
                <i />
                <i />
                <i />
                <i />
              </div>
            </article>

            <article className="bento-proof">
              <Eye size={22} />
              <span>Instant Local WASM Preview</span>
              <h3>צפייה מיידית ללא המתנה</h3>
              <div className="proof-line">
                <i />
                <b>Preview matches final export</b>
              </div>
            </article>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="marketing-section hsx-reveal" id="features">
          <div className="marketing-section-head">
            <span><T id="features.eyebrow" /></span>
            <h2><T id="features.title" /></h2>
            <p><T id="features.copy" /></p>
          </div>
          <div className="marketing-feature-grid">
            {features.map(({ icon: Icon, title, text }, index) => (
              <article key={title} className={`feature-${index + 1}`}>
                <Icon size={22} />
                <small>0{index + 1}</small>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Visual Comparison: Old Way vs Hypescript */}
        <section className="marketing-section marketing-before-after hsx-reveal">
          <div className="marketing-section-head">
            <span>מהפכת יעילות</span>
            <h2>הדרך הישנה מול Hypescript</h2>
            <p>למה אלפי דקות עריכה ידניות הופכות לכמה שניות של יצירה.</p>
          </div>
          <div className="marketing-compare">
            <article className="old">
              <span>העריכה המסורתית</span>
              <ul>
                <li>שעות של גזירת שתיקות ו-“אהה...” פריים אחרי פריים</li>
                <li>כתוביות הפוכות, ייצוא וייבוא קבצי SRT בין תוכנות</li>
                <li>התאמה ידנית מסורבלת של מוזיקה ואיזון ווליום</li>
                <li>יצירה ידנית של כל גרסת סושיאל (9:16 / 16:9) בנפרד</li>
                <li>תוכנות כבדות שדורשות חומרה יקרה והתקנות מורכבות</li>
              </ul>
            </article>
            <div className="marketing-compare-arrow">
              <ArrowLeft size={24} />
            </div>
            <article className="new">
              <span>עם Hypescript AI</span>
              <ul>
                <li>
                  <Check size={15} /> חיתוך שתיקות אוטומטי מבוסס תמלול מדויק
                </li>
                <li>
                  <Check size={15} /> כתוביות RTL מעוצבות בסגנון קריוקי מובנה
                </li>
                <li>
                  <Check size={15} /> מוזיקה חכמה עם הנמכת קול אוטומטית (Auto-Ducking)
                </li>
                <li>
                  <Check size={15} /> ייצוא רב-פורמטי לכל הרשתות בלחיצת כפתור אחת
                </li>
                <li>
                  <Check size={15} /> עבודה ישירה בדפדפן מכל מחשב במהירות שיא
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* 3-Step Production Flow */}
        <section className="marketing-section marketing-how hsx-reveal" id="how">
          <div className="marketing-section-head">
            <span><T id="how.eyebrow" /></span>
            <h2><T id="how.title" /></h2>
          </div>
          <div className="marketing-steps">
            <article>
              <b>01</b>
              <Film size={24} />
              <h3>מעלים חומר גלם</h3>
              <p>קובץ וידאו, אודיו, תמונות או לוגו נקלטים ומתוזמנים אוטומטית.</p>
            </article>
            <article>
              <b>02</b>
              <MessageSquareText size={24} />
              <h3>מנחים בשפה טבעית</h3>
              <p>מבקשים מה-AI לחתוך, לעצב, להוסיף כתוביות או לערוך ידנית על הקנבס.</p>
            </article>
            <article>
              <b>03</b>
              <Download size={24} />
              <h3>מייצאים ומפרסמים</h3>
              <p>צופים בתצוגה המקדימה ומייצאים סרטון מושלם באיכות גבוהה לכל פלטפורמה.</p>
            </article>
          </div>
        </section>

        {/* Use Cases / Audience */}
        <section className="marketing-section hsx-reveal" id="for-whom">
          <div className="marketing-section-head">
            <span><T id="audience.eyebrow" /></span>
            <h2><T id="audience.title" /></h2>
          </div>
          <div className="marketing-use-cases">
            {useCases.map((item, index) => (
              <article key={item.title}>
                <div className="usecase-badge">
                  <b>0{index + 1}</b>
                  <span>{item.tag}</span>
                </div>
                <WandSparkles size={21} />
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </LandingHebrewOnly>

      <LandingDeviceShowcase />

      <LandingHebrewOnly>
        {/* Interactive Efficiency & ROI Calculator */}
        <LandingEfficiencyCalculator />

        {/* Pricing Section */}
        <section className="marketing-section hsx-reveal" id="pricing">
          <div className="marketing-section-head">
            <span><T id="pricing.eyebrow" /></span>
            <h2><T id="pricing.title" /></h2>
            <p><T id="pricing.copy" /></p>
          </div>

          <div className="marketing-pricing">
            {plans.map((plan) => (
              <article key={plan.name} className={plan.featured ? "featured" : ""}>
                {plan.featured && <em>הכי מתאים ליוצרים</em>}
                <h3>{plan.name}</h3>
                {plan.intro && <div className="marketing-intro-price">{plan.intro}</div>}
                <div className="marketing-price">
                  {plan.price}
                  <small>{plan.suffix}</small>
                </div>
                <p>{plan.text}</p>
                <ul>
                  {plan.items.map((item) => (
                    <li key={item}>
                      <Check size={15} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`btn ${plan.featured ? "primary" : "secondary"}`}
                >
                  {plan.cta}
                </Link>
                {plan.intro && (
                  <small className="marketing-card-note">
                    <CreditCard size={12} />
                    כרטיס נדרש · המכסה המלאה נפתחת בחיוב הראשון
                  </small>
                )}
              </article>
            ))}
          </div>
          <p className="marketing-billing-note">
            בתקופת הניסיון: 5 פרויקטים, 1GB אחסון ו־20 דקות רינדור. כרגע ה־Checkout ב־Test Mode בלבד,
            ולכן אין חיוב אמיתי.
          </p>
        </section>

        {/* Interactive FAQ Accordion */}
        <section className="marketing-section marketing-faq hsx-reveal">
          <div className="marketing-section-head">
            <span>שאלות ותשובות</span>
            <h2>כל מה שחשוב לדעת לפני שמתחילים</h2>
          </div>
          <div className="marketing-faq-list">
            {faqs.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Cinematic Outro Stage */}
        <section className="hsx-outro hsx-reveal" aria-label="מתוצאה אחת למערכת תוכן">
          <div className="hsx-outro-head">
            <span>ממשיכים מאותה נקודה</span>
            <h2>
              פרויקט אחד
              <br />
              כמה גרסאות שרוצים
            </h2>
            <p>כל מה שנוצר נשאר מאורגן, ניתן לשינוי ומוכן לגרסה הבאה.</p>
          </div>
          <div className="hsx-output-orbit">
            <div className="hsx-output-core">
              <img src="/brand/landing-creator-male.webp" alt="סרטון הסבר מוכן לפרסום" />
              <span>
                <Play size={16} fill="currentColor" />
              </span>
              <b>הסרטון שלך מוכן</b>
              <small>1080p · 00:35</small>
            </div>
            <article className="output-video">
              <Film size={17} />
              <div>
                <b>MP4</b>
                <small>מוכן להורדה</small>
              </div>
              <Check size={14} />
            </article>
            <article className="output-captions">
              <Captions size={17} />
              <div>
                <b>SRT</b>
                <small>כתוביות מסונכרנות</small>
              </div>
              <Check size={14} />
            </article>
            <article className="output-social">
              <Sparkles size={17} />
              <div>
                <b>9:16</b>
                <small>גרסה לרשתות</small>
              </div>
              <Check size={14} />
            </article>
            <i className="hsx-orbit-line one" />
            <i className="hsx-orbit-line two" />
            <i className="hsx-orbit-line three" />
          </div>
        </section>
      </LandingHebrewOnly>

      <section className="marketing-final hsx-final-stage hsx-reveal">
        <div className="hsx-final-beam" />
        <div className="marketing-final-brand">
          <BrandLogo variant="horizontal" size="md" theme="dark" decorative />
        </div>
        <span>
          <T id="final.eyebrow" />
        </span>
        <h2>
          <T id="final.line1" />
          <br />
          <T id="final.line2" />
        </h2>
        <p>
          <T id="final.copy" />
        </p>
        <Link href="/login?next=/dashboard" className="btn primary marketing-cta">
          <T id="hero.start" /> <ArrowLeft size={17} />
        </Link>
        <small>
          <T id="hero.trust" />
        </small>
      </section>

      <footer className="marketing-footer">
        <BrandLogo variant="horizontal" size="xs" theme="auto" decorative />
        <span>© 2026 Hypescript</span>
        <nav>
          <Link href="/legal/privacy">
            <T id="footer.privacy" />
          </Link>
          <Link href="/legal/terms">
            <T id="footer.terms" />
          </Link>
          <Link href="/legal/refund">
            <T id="footer.refund" />
          </Link>
          <Link href="/legal/accessibility">
            <T id="footer.accessibility" />
          </Link>
          <Link href="/login">
            <T id="footer.login" />
          </Link>
        </nav>
      </footer>
    </main>
  );
}
