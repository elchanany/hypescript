import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Captions, Check, Cloud, CreditCard, Download, Film, Gauge, Layers3, LockKeyhole, MessageSquareText, Play, Scissors, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Hypescript — עריכת וידאו שמתחילה במילים",
  description: "מעבירים שיעור או סרטון ארוך לגרסה מדויקת ומוכנה לפרסום — חיתוך דרך טקסט, כתוביות עברית, שכבות ורינדור במקום אחד.",
  keywords: ["עריכת וידאו", "כתוביות בעברית", "חיתוך סרטונים", "עורך וידאו אונליין", "תמלול וידאו"],
  alternates: { canonical: "/welcome" },
};

const features = [
  { icon: Scissors, title: "חותכים דרך הטקסט", text: "מוחקים משפט, נשימה או חזרה — והטיימליין מתעדכן בדיוק באותו רגע." },
  { icon: Captions, title: "כתוביות עברית שנראות נכון", text: "RTL אמיתי, תזמון מדויק, עריכה ישירה על הווידאו וייצוא SRT." },
  { icon: Layers3, title: "וידאו, לוגו, תמונות וסאונד", text: "שכבות חופשיות, גרירה, שינוי גודל, שקיפות, fade ומיקום מדויק." },
  { icon: MessageSquareText, title: "עוזר עריכה בתוך הפרויקט", text: "מבקש תוצאה בשפה טבעית, רואה את הפעולות ומבטל שינוי בלחיצה." },
  { icon: Cloud, title: "הענן הוא ברירת המחדל", text: "מצב העריכה נשמר בחשבון וקובצי מדיה חדשים מועלים לאחסון פרטי ומאובטח." },
  { icon: Download, title: "רינדור שאפשר לסמוך עליו", text: "התקדמות ברורה, תוצאה לצפייה והורדה, ללא מסכים שמעמידים פנים." },
];

const plans = [
  { name: "Free", price: "₪0", suffix: "לתמיד", text: "להכיר את סביבת העריכה בקצב שלך.", items: ["3 פרויקטים", "2GB אחסון", "10 דקות רינדור בחודש"], href: "/login?next=/dashboard", cta: "התחל בחינם" },
  { name: "Creator", price: "₪49", suffix: "לחודש לאחר הניסיון", intro: "חודש ראשון ₪0", text: "ליוצרים, עורכים ועסקים שמפרסמים באופן קבוע.", items: ["50 פרויקטים", "20GB אחסון", "120 דקות רינדור בחודש"], featured: true, href: "/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth", cta: "התחל חודש חינם" },
  { name: "Pro", price: "₪119", suffix: "לחודש לאחר הניסיון", intro: "חודש ראשון ₪0", text: "לצוותים ולנפח עבודה מקצועי.", items: ["500 פרויקטים", "100GB אחסון", "480 דקות רינדור בחודש"], href: "/login?next=%2Faccount%3Fplan%3Dpro%26interval%3Dmonth", cta: "התחל חודש חינם" },
];

const useCases = [
  { title: "שיעורים והרצאות", text: "מורידים שתיקות, נשימות וחזרות בלי לאבד מילה חשובה." },
  { title: "תוכן לרשתות", text: "מכינים גרסה הדוקה, כתוביות ברורות ופורמט אנכי לפרסום." },
  { title: "עסקים ועמותות", text: "שומרים על לוגו, צבעים, פתיחים וקריאות לפעולה עקביות." },
];

export default function WelcomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hypescript",
    applicationCategory: "MultimediaApplication",
    operatingSystem: "Web",
    description: "עורך וידאו מקצועי בעברית עם חיתוך דרך טקסט, כתוביות ורינדור בענן.",
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
          <Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary">חודש ראשון חינם <ArrowLeft size={15} /></Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-kicker"><Sparkles size={14} />חודש ראשון חינם במסלולים בתשלום</div>
        <h1>ממילים ארוכות.<br /><span>לסרטון שאי אפשר לדלג עליו.</span></h1>
        <p>Hypescript הופך שיעור, הרצאה או חומר גלם ארוך לסרטון מדויק ומוכן לפרסום — עם חיתוך דרך הטקסט, כתוביות עברית ושכבות בממשק אחד נקי.</p>
        <div className="marketing-hero-actions">
          <Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary marketing-cta">התחל חודש חינם <ArrowLeft size={17} /></Link>
          <a href="#how" className="btn secondary marketing-cta"><Play size={16} />ראה איך זה עובד</a>
        </div>
        <div className="marketing-trust"><LockKeyhole size={15} />נדרש כרטיס לאימות · אפשר לבטל לפני החיוב הראשון · מכסת ניסיון מוגנת</div>

        <div className="marketing-product" aria-label="תצוגה מקדימה של עורך Hypescript">
          <div className="mp-top"><i /><i /><i /><span>הרב הקדיש והחסד</span><b>ייצוא</b></div>
          <div className="mp-body">
            <aside><span>מדיה</span><div /><div /><div /></aside>
            <section className="mp-preview"><div className="mp-video"><span className="mp-play"><Play size={22} fill="currentColor" /></span><strong>קשה סילוקו של אדם כשר<br />כשריפת בית אלהינו.</strong></div><div className="mp-controls" /></section>
            <aside className="mp-agent"><span>עוזר העריכה</span><p>הסר את הנשימות והחזרות, ושמור על כל המילים.</p><em>בוצעו 12 חיתוכים · אין חפיפות</em></aside>
          </div>
          <div className="mp-timeline"><div className="mp-ruler" /><div className="mp-track video" /><div className="mp-track audio" /><div className="mp-track captions" /></div>
        </div>
      </section>

      <section className="marketing-proof" aria-label="עקרונות המוצר">
        <article><BadgeCheck size={18} /><div><strong>דיוק לפני אוטומציה</strong><span>כל שינוי נשאר גלוי וניתן לביטול</span></div></article>
        <article><Gauge size={18} /><div><strong>קצב עריכה מהיר</strong><span>פחות שניות מתות ופחות עבודת ניקוי</span></div></article>
        <article><ShieldCheck size={18} /><div><strong>שליטה בעלויות</strong><span>מכסות קשיחות, בלי חיובי חריגה אוטומטיים</span></div></article>
      </section>

      <section className="marketing-section" id="features">
        <div className="marketing-section-head"><span>כלי עבודה אמיתיים</span><h2>כל מה שצריך כדי להגיע לגרסה הסופית</h2><p>פחות חלונות, פחות ייצוא־ייבוא, פחות תיקונים ידניים.</p></div>
        <div className="marketing-feature-grid">
          {features.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}
        </div>
      </section>

      <section className="marketing-section marketing-before-after">
        <div className="marketing-section-head"><span>לא עוד תהליך מפורק</span><h2>העריכה נשארת במקום אחד</h2><p>במקום לקפוץ בין תמלול, חיתוך, כתוביות, עיצוב וייצוא.</p></div>
        <div className="marketing-compare">
          <article className="old"><span>הדרך הישנה</span><ul><li>למצוא ידנית כל שתיקה וחזרה</li><li>להעתיק כתוביות בין תוכנות</li><li>לאבד גרסאות וקבצים בדרך</li><li>לגלות בעיית חיתוך רק אחרי הייצוא</li></ul></article>
          <div className="marketing-compare-arrow"><ArrowLeft size={24} /></div>
          <article className="new"><span>עם Hypescript</span><ul><li><Check size={15} />חותכים דרך הטקסט</li><li><Check size={15} />רואים כל פעולה על הטיימליין</li><li><Check size={15} />שומרים כתוביות ומיתוג יחד</li><li><Check size={15} />צופים ומורידים את התוצר במקום</li></ul></article>
        </div>
      </section>

      <section className="marketing-section marketing-how" id="how">
        <div className="marketing-section-head"><span>פשוט להתחיל</span><h2>מחומר גלם לסרטון מוכן בשלושה צעדים</h2></div>
        <div className="marketing-steps">
          <article><b>01</b><Film size={24} /><h3>מעלים</h3><p>וידאו, אודיו, תמונות ולוגו נשמרים ישירות בפרויקט הענן.</p></article>
          <article><b>02</b><MessageSquareText size={24} /><h3>עורכים</h3><p>חותכים בטקסט או מבקשים מעוזר העריכה לבצע סדרת פעולות.</p></article>
          <article><b>03</b><Download size={24} /><h3>מפרסמים</h3><p>רינדור בענן, צפייה בתוצאה והורדה באיכות שנבחרה.</p></article>
        </div>
      </section>

      <section className="marketing-section" id="for-whom">
        <div className="marketing-section-head"><span>נבנה לעבודה אמיתית</span><h2>אותו כלי, שלושה קצבי יצירה</h2></div>
        <div className="marketing-use-cases">{useCases.map((item, index) => <article key={item.title}><b>0{index + 1}</b><WandSparkles size={21} /><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

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

      <section className="marketing-final"><div className="marketing-final-icon"><Film size={24} /></div><h2>הסרטון הבא שלך יכול להיות מוכן היום.</h2><p>מתחילים בחודש ניסיון, רואים את התהליך כולו ומחליטים לפני החיוב הראשון.</p><Link href="/login?next=%2Faccount%3Fplan%3Dcreator%26interval%3Dmonth" className="btn primary marketing-cta">התחל חודש חינם <ArrowLeft size={17} /></Link></section>
      <footer className="marketing-footer"><BrandLogo variant="horizontal" size="xs" theme="light" decorative /><span>© 2026 Hypescript</span><nav><Link href="/legal/privacy">פרטיות</Link><Link href="/legal/terms">תנאי שימוש</Link><Link href="/login">התחברות</Link></nav></footer>
    </main>
  );
}
