import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AudioWaveform, BadgeCheck, Captions, Check, Cloud, Command, CreditCard, Download, Eye, Film, Gauge, Layers3, LockKeyhole, MessageSquareText, MousePointer2, Play, ScanText, Scissors, ShieldCheck, Sparkles, WandSparkles, Zap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import LandingProductExperience from "@/components/LandingProductExperience";
import LandingDeviceShowcase from "@/components/LandingDeviceShowcase";
import "./landing-v2.css";

export const metadata: Metadata = {
  title: "Hypescript — עורך וידאו AI בעברית",
  description: "עורך וידאו AI שפשוט מדברים איתו: מעלים חומר גלם, מבקשים שינוי בשפה טבעית ומקבלים סרטון מעוצב ומוכן לפרסום.",
  keywords: ["עריכת וידאו", "כתוביות בעברית", "חיתוך סרטונים", "עורך וידאו אונליין", "תמלול וידאו"],
  alternates: { canonical: "/welcome" },
};

const features = [
  { icon: MessageSquareText, title: "פשוט אומרים מה רוצים", text: "מתארים את הסרטון הרצוי בשפה טבעית — והעורך הופך את הבקשה לפעולות אמיתיות." },
  { icon: Scissors, title: "חותכים בטקסט או בטיימליין", text: "עורכים דרך התמלול או בדיוק של פריימים, בלי לקפוץ בין כלים ותוכנות." },
  { icon: Captions, title: "כתוביות עברית שנראות נכון", text: "RTL אמיתי, תזמון מדויק, עריכה ישירה על הווידאו וייצוא SRT." },
  { icon: Layers3, title: "וידאו, לוגו, תמונות וסאונד", text: "שכבות חופשיות, גרירה, שינוי גודל, שקיפות, fade ומיקום מדויק." },
  { icon: Cloud, title: "הענן הוא ברירת המחדל", text: "מצב העריכה נשמר בחשבון וקובצי מדיה חדשים מועלים לאחסון פרטי ומאובטח." },
  { icon: Download, title: "רינדור שאפשר לסמוך עליו", text: "התקדמות ברורה, תוצאה לצפייה והורדה, ללא מסכים שמעמידים פנים." },
];

const plans = [
  { name: "Free", price: "₪0", suffix: "לתמיד", text: "העורך המלא עם המפתחות שלך.", items: ["3 פרויקטים", "2GB אחסון", "10 דקות רינדור", "AI במצב BYOK בלבד"], href: "/login?next=/dashboard", cta: "התחל בחינם" },
  { name: "Creator", price: "₪49", suffix: "לחודש לאחר הניסיון", intro: "חודש ראשון ₪0", text: "AI מנוהל בלי להתעסק במפתחות וספקים.", items: ["50 פרויקטים", "20GB אחסון", "120 דקות רינדור", "מודלי AI מנוהלים + אפשרות BYOK"], featured: true, href: "/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth", cta: "התחל חודש חינם" },
  { name: "Pro", price: "₪119", suffix: "לחודש לאחר הניסיון", intro: "חודש ראשון ₪0", text: "לצוותים ולנפח עבודה מקצועי.", items: ["500 פרויקטים", "100GB אחסון", "480 דקות רינדור", "AI מנוהל, קדימות וקרדיטים מוזלים"], href: "/login?next=%2Faccount%3Fplan%3Dpro%26interval%3Dmonth", cta: "התחל חודש חינם" },
];

const useCases = [
  { title: "יוצרים ופודקאסטים", text: "הופכים פרק ארוך לקליפים, כתוביות וגרסאות מוכנות לכל רשת." },
  { title: "עסקים ומותגים", text: "מייצרים סרטוני מוצר, הדרכה ופרסום עם לוגו, צבעים וקריאה לפעולה." },
  { title: "קורסים וארגונים", text: "עורכים הרצאות, מפגשים והדרכות בלי ללמוד תוכנת עריכה מורכבת." },
];

export default function WelcomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hypescript",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: "עורך וידאו AI בעברית שפועל בשיחה ומבצע חיתוך, כתוביות, עיצוב, שכבות ורינדור בענן.",
    offers: [
      { "@type": "Offer", name: "Free", price: "0", priceCurrency: "ILS" },
      { "@type": "Offer", name: "Creator", price: "49", priceCurrency: "ILS", description: "חודש ראשון ללא חיוב, לאחר מכן ₪49 לחודש" },
      { "@type": "Offer", name: "Pro", price: "119", priceCurrency: "ILS", description: "חודש ראשון ללא חיוב, לאחר מכן ₪119 לחודש" },
    ],
  };
  return (
    <main className="marketing-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <header className="marketing-nav">
        <Link href="/welcome" aria-label="Hypescript"><BrandLogo variant="horizontal" size="sm" theme="light" priority decorative /></Link>
        <nav aria-label="ניווט ראשי">
          <a href="#features">יכולות</a>
          <a href="#how">איך זה עובד</a>
          <a href="#for-whom">למי זה מתאים</a>
          <a href="#pricing">מסלולים</a>
        </nav>
        <div className="marketing-actions">
          <Link href="/login" className="btn ghost">התחברות</Link>
          <Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary"><span>חודש ראשון חינם</span><ArrowLeft size={15} /></Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-kicker"><Sparkles size={14} />עורך וידאו AI בעברית — בלי ללמוד תוכנה מסובכת</div>
        <h1>עורך הווידאו<br /><span>שפשוט מדברים איתו.</span></h1>
        <p>מעלים וידאו וכותבים מה רוצים: לקצר, לסדר, להוסיף כתוביות, תמונות, מוזיקה ולוגו, לשנות פורמט או להכין גרסה לרשתות. Hypescript מבצע הכול — ואתם רואים ומאשרים כל שינוי.</p>
        <div className="marketing-hero-actions">
          <Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary marketing-cta">התחל חודש חינם <ArrowLeft size={17} /></Link>
          <a href="#how" className="btn secondary marketing-cta"><Play size={16} />ראה איך זה עובד</a>
        </div>
        <div className="marketing-trust"><LockKeyhole size={15} />נדרש כרטיס לאימות · אפשר לבטל לפני החיוב הראשון · מכסת ניסיון מוגנת</div>

        <LandingProductExperience />
      </section>

      <div className="hsx-kinetic" aria-hidden="true"><div><span>מבקשים בשיחה</span><i>✦</i><span>חותכים ומסדרים</span><i>✦</i><span>מוסיפים כתוביות ועיצוב</span><i>✦</i><span>מפרסמים בכל פורמט</span><i>✦</i><span>מבקשים בשיחה</span><i>✦</i><span>מקבלים סרטון מוכן</span><i>✦</i></div></div>

      <section className="marketing-proof" aria-label="עקרונות המוצר">
        <article><BadgeCheck size={18} /><div><strong>דיוק לפני אוטומציה</strong><span>כל שינוי נשאר גלוי וניתן לביטול</span></div></article>
        <article><Gauge size={18} /><div><strong>בקשה אחת, הרבה פעולות</strong><span>חיתוך, עיצוב, כתוביות ופורמטים באותו פרויקט</span></div></article>
        <article><ShieldCheck size={18} /><div><strong>שליטה בעלויות</strong><span>מכסות קשיחות, בלי חיובי חריגה אוטומטיים</span></div></article>
      </section>

      <section className="marketing-story hsx-reveal hsx-story" aria-label="מחומר גלם לתוכן מוכן">
        <div className="hsx-story-visual">
          <img src="/brand/landing-creator-frame.webp" alt="יוצרת תוכן באולפן מודרני" loading="eager" />
          <div className="hsx-story-caption"><span>לפני</span><del>אז... מה שבעצם רציתי להגיד...</del><span>אחרי</span><strong>רציתי להפוך רעיון לסיפור.</strong></div>
          <div className="hsx-story-wave">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 29) % 76)}%` }} />)}</div>
        </div>
        <div className="marketing-story-copy">
          <span>זה עורך וידאו מלא — עם שיחה במקום תפריטים מסובכים</span>
          <h2>אומרים מה צריך.<br />רואים את הסרטון נבנה.</h2>
          <p>Hypescript מבין את הבקשה, בונה תוכנית עריכה ומבצע אותה על טיימליין אמיתי. אפשר להזיז כל שכבה, לשנות כל כיתוב, לבטל כל פעולה ולהמשיך לערוך ידנית בכל רגע.</p>
          <div className="story-metrics"><b><strong>0</strong> חפיפות</b><b><strong>1</strong> פרויקט</b><b><strong>∞</strong> גרסאות</b></div>
        </div>
      </section>

      <section className="hsx-scroll-story hsx-reveal" aria-label="תהליך עריכה חי">
        <div className="hsx-scroll-head"><span>בקשה. עריכה. תוצאה.</span><h2>כך המוצר עובד באמת.</h2></div>
        <div className="hsx-scroll-rail">
          <article><b>01</b><div><ScanText size={22} /><h3>כותבים את התוצאה הרצויה</h3><p>“הכן סרטון קצר, הוסף כתוביות ולוגו” — בלי לחפש איפה נמצא כל כלי.</p></div><div className="hsx-text-sculpture"><span>קצר</span><span className="muted">+</span><span>כתוביות</span><span>9:16</span></div></article>
          <article><b>02</b><div><Layers3 size={22} /><h3>הקנבס מגיב למגע</h3><p>לוגו, תמונה, כותרת וכתוביות נגררים למקום המדויק — בלי לנחש מספרים.</p></div><div className="hsx-layer-sculpture"><i /><i /><i /><strong>H</strong></div></article>
          <article><b>03</b><div><WandSparkles size={22} /><h3>העורך מבצע. אתם בשליטה.</h3><p>כל פעולה מגיעה עם תצוגה מקדימה, הסבר ואפשרות ביטול.</p></div><div className="hsx-decision"><span><Check size={14} />הגרסה מוכנה לבדיקה</span><button type="button">החל הכול</button></div></article>
        </div>
      </section>

      <section className="marketing-section marketing-lab">
        <div className="marketing-section-head"><span>חדש בדרך שבה עורכים</span><h2>לא עוד עורך עם כפתור AI בצד</h2><p>ממשק שנבנה סביב הפעולה עצמה — שיחה, תמונה, קול וטיימליין שעובדים יחד.</p></div>
        <div className="marketing-bento">
          <article className="bento-command"><Command size={22} /><span>Conversational editing</span><h3>כותבים בקשה.<br />מקבלים עריכה.</h3><div className="command-demo"><i>הפוך את הפרק לקליפ אנכי עם כותרת וכתוביות</i><b><Zap size={13} /> תוכנית העריכה מוכנה</b></div></article>
          <article className="bento-transcript"><ScanText size={22} /><span>Transcript native</span><h3>הטקסט הוא כלי העריכה</h3><div className="word-stream"><i>הפרק</i><i>הזה</i><i className="cut">אה...</i><i>מתחיל</i><i>עכשיו</i></div></article>
          <article className="bento-precision"><AudioWaveform size={22} /><span>Timeline precision</span><h3>כל שינוי נוחת בדיוק במקום</h3><div className="mini-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></article>
          <article className="bento-direct"><MousePointer2 size={22} /><span>Direct manipulation</span><h3>גוררים על הסרטון עצמו</h3><div className="mini-canvas"><b>שם הפרק והדובר</b><i /><i /><i /><i /></div></article>
          <article className="bento-proof"><Eye size={22} /><span>Proof before export</span><h3>רואים את התוצאה לפני שמחכים לרינדור</h3><div className="proof-line"><i /><b>Preview matches export</b></div></article>
        </div>
      </section>

      <section className="marketing-section" id="features">
        <div className="marketing-section-head"><span>כלי עבודה אמיתיים</span><h2>כל מה שצריך כדי להגיע לגרסה הסופית</h2><p>פחות חלונות, פחות ייצוא־ייבוא, פחות תיקונים ידניים.</p></div>
        <div className="marketing-feature-grid">
          {features.map(({ icon: Icon, title, text }, index) => <article key={title} className={`feature-${index + 1}`}><Icon size={22} /><small>0{index + 1}</small><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="marketing-section marketing-before-after">
        <div className="marketing-section-head"><span>לא עוד תהליך מפורק</span><h2>העריכה נשארת במקום אחד</h2><p>במקום לקפוץ בין תמלול, חיתוך, כתוביות, עיצוב וייצוא.</p></div>
        <div className="marketing-compare">
          <article className="old"><span>הדרך הישנה</span><ul><li>ללמוד איפה מסתתר כל כלי</li><li>להעתיק כתוביות בין תוכנות</li><li>לאבד גרסאות וקבצים בדרך</li><li>לבנות ידנית כל פורמט מחדש</li></ul></article>
          <div className="marketing-compare-arrow"><ArrowLeft size={24} /></div>
          <article className="new"><span>עם Hypescript</span><ul><li><Check size={15} />מבקשים את התוצאה בשיחה</li><li><Check size={15} />רואים כל פעולה על הטיימליין</li><li><Check size={15} />שומרים כתוביות ומיתוג יחד</li><li><Check size={15} />מקבלים כל גרסה במקום אחד</li></ul></article>
        </div>
      </section>

      <section className="marketing-section marketing-how" id="how">
        <div className="marketing-section-head"><span>פשוט להתחיל</span><h2>מחומר גלם לסרטון מוכן בשלושה צעדים</h2></div>
        <div className="marketing-steps">
          <article><b>01</b><Film size={24} /><h3>מעלים</h3><p>וידאו, אודיו, תמונות ולוגו נשמרים ישירות בפרויקט הענן.</p></article>
          <article><b>02</b><MessageSquareText size={24} /><h3>מבקשים</h3><p>מתארים בשיחה את הסרטון הרצוי, או עורכים ידנית בטקסט ובטיימליין.</p></article>
          <article><b>03</b><Download size={24} /><h3>מפרסמים</h3><p>רינדור בענן, צפייה בתוצאה והורדה באיכות שנבחרה.</p></article>
        </div>
      </section>

      <section className="marketing-section" id="for-whom">
        <div className="marketing-section-head"><span>נבנה לעבודה אמיתית</span><h2>אותו כלי, שלושה קצבי יצירה</h2></div>
        <div className="marketing-use-cases">{useCases.map((item, index) => <article key={item.title}><b>0{index + 1}</b><WandSparkles size={21} /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

      <LandingDeviceShowcase />

      <section className="marketing-section" id="pricing">
        <div className="marketing-section-head"><span>מתחילים בלי סיכון</span><h2>מסלול שמתאים לקצב שלך</h2><p>לא מחייבים על שימוש מעבר למכסה בלי אישור ומנוי פעיל.</p></div>
        <div className="marketing-pricing">
          {plans.map((plan) => <article key={plan.name} className={plan.featured ? "featured" : ""}>{plan.featured && <em>הכי מתאים ליוצרים</em>}<h3>{plan.name}</h3>{plan.intro && <div className="marketing-intro-price">{plan.intro}</div>}<div className="marketing-price">{plan.price}<small>{plan.suffix}</small></div><p>{plan.text}</p><ul>{plan.items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul><Link href={plan.href} className={`btn ${plan.featured ? "primary" : "secondary"}`}>{plan.cta}</Link>{plan.intro && <small className="marketing-card-note"><CreditCard size={12} />כרטיס נדרש · המכסה המלאה נפתחת בחיוב הראשון</small>}</article>)}
        </div>
        <p className="marketing-billing-note">בתקופת הניסיון: 5 פרויקטים, 1GB אחסון ו־20 דקות רינדור. כרגע ה־Checkout ב־Test Mode בלבד, ולכן אין חיוב אמיתי.</p>
      </section>

      <section className="marketing-section marketing-faq">
        <div className="marketing-section-head"><span>לפני שמתחילים</span><h2>שאלות קצרות, תשובות ברורות</h2></div>
        <div className="marketing-faq-list">
          <details><summary>מתי מחייבים את הכרטיס?</summary><p>לא במהלך חודש הניסיון. לאחר מכן המנוי מתחדש לפי המסלול שבחרת, אלא אם ביטלת לפני מועד החיוב.</p></details>
          <details><summary>למה מכסת הניסיון קטנה יותר?</summary><p>כדי לאפשר לבדוק את כל הזרימה בלי לפתוח שימוש ענן בלתי מוגבל. עם תחילת המנוי נפתחת המכסה המלאה.</p></details>
          <details><summary>אפשר לעבוד בלי הענן?</summary><p>כן. בהגדרות הפרויקט אפשר לבחור עבודה מקומית כאשר פרטיות או קבצים כבדים דורשים זאת.</p></details>
          <details><summary>מה קורה כשהמכסה נגמרת?</summary><p>הפעולה נעצרת לפני יצירת עלות נוספת, והמערכת מציגה בדיוק איזו מכסה הסתיימה ואילו מסלולים זמינים.</p></details>
        </div>
      </section>

      <section className="hsx-outro hsx-reveal" aria-label="מתוצאה אחת למערכת תוכן">
        <div className="hsx-outro-head"><span>לא עוצרים בייצוא הראשון</span><h2>פרויקט אחד.<br />מערכת תוכן שלמה.</h2><p>כל מה שנוצר נשאר מאורגן, ניתן לשינוי ומוכן לגרסה הבאה.</p></div>
        <div className="hsx-output-orbit">
          <div className="hsx-output-core"><img src="/brand/landing-creator-male.webp" alt="סרטון הסבר מוכן לפרסום" /><span><Play size={16} fill="currentColor" /></span><b>הסרטון שלך מוכן</b><small>1080p · 00:35</small></div>
          <article className="output-video"><Film size={17} /><div><b>MP4</b><small>מוכן להורדה</small></div><Check size={14} /></article>
          <article className="output-captions"><Captions size={17} /><div><b>SRT</b><small>כתוביות מסונכרנות</small></div><Check size={14} /></article>
          <article className="output-social"><Sparkles size={17} /><div><b>9:16</b><small>גרסה לרשתות</small></div><Check size={14} /></article>
          <i className="hsx-orbit-line one" /><i className="hsx-orbit-line two" /><i className="hsx-orbit-line three" />
        </div>
      </section>

      <section className="marketing-final hsx-final-stage"><div className="hsx-final-beam" /><div className="marketing-final-icon"><Film size={24} /></div><span>הסרטון הראשון מתחיל כאן</span><h2>מעלים. מבקשים.<br />מקבלים סרטון מוכן.</h2><p>מתחילים בחודש ניסיון, מדברים עם עורך הווידאו ורואים כל שינוי לפני שמפרסמים.</p><Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary marketing-cta">התחל חודש חינם <ArrowLeft size={17} /></Link><small>כרטיס נדרש לאימות · אפשר לבטל לפני החיוב הראשון</small></section>
      <footer className="marketing-footer"><BrandLogo variant="horizontal" size="xs" theme="light" decorative /><span>© 2026 Hypescript</span><nav><Link href="/legal/privacy">פרטיות</Link><Link href="/legal/terms">תנאי שימוש</Link><Link href="/login">התחברות</Link></nav></footer>
    </main>
  );
}
