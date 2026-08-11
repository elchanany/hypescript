import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Captions, Check, Cloud, Download, Film, Layers3, MessageSquareText, Play, Scissors, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export const metadata: Metadata = {
  title: "Hypescript — עריכת וידאו שמתחילה במילים",
  description: "עורך וידאו מקצועי בעברית עם חיתוך חכם, כתוביות, שכבות ורינדור בענן.",
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
  { name: "Free", price: "₪0", suffix: "לתמיד", text: "לנסות, ללמוד וליצור פרויקטים קצרים.", items: ["3 פרויקטים", "2GB אחסון", "10 דקות רינדור בחודש"] },
  { name: "Creator", price: "₪49", suffix: "לחודש", text: "ליוצרים, עורכים ועסקים שמפרסמים באופן קבוע.", items: ["50 פרויקטים", "20GB אחסון", "120 דקות רינדור בחודש"], featured: true },
  { name: "Pro", price: "₪119", suffix: "לחודש", text: "לצוותים ולנפח עבודה מקצועי.", items: ["500 פרויקטים", "100GB אחסון", "480 דקות רינדור בחודש"] },
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
      { "@type": "Offer", name: "Creator", price: "49", priceCurrency: "ILS" },
      { "@type": "Offer", name: "Pro", price: "119", priceCurrency: "ILS" },
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
          <a href="#pricing">מסלולים</a>
        </nav>
        <div className="marketing-actions">
          <Link href="/login" className="btn ghost">התחברות</Link>
          <Link href="/login?next=/dashboard" className="btn primary">התחל בחינם <ArrowLeft size={15} /></Link>
        </div>
      </header>

      <section className="marketing-hero">
        <div className="marketing-kicker"><Play size={14} fill="currentColor" />עריכת וידאו מקצועית, בלי להילחם בטיימליין</div>
        <h1>הווידאו שלך מתחיל<br />במילים הנכונות.</h1>
        <p>Hypescript מחבר תמלול, חיתוך מדויק, כתוביות, שכבות ורינדור בענן לממשק עברי אחד — נקי ומהיר.</p>
        <div className="marketing-hero-actions">
          <Link href="/login?next=/dashboard" className="btn primary marketing-cta">צור פרויקט ראשון <ArrowLeft size={17} /></Link>
          <a href="#how" className="btn secondary marketing-cta"><Play size={16} />ראה איך זה עובד</a>
        </div>
        <div className="marketing-trust"><ShieldCheck size={15} />הקבצים פרטיים לחשבון שלך · אפשר לבחור מצב מקומי בהגדרות</div>

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

      <section className="marketing-section" id="features">
        <div className="marketing-section-head"><span>כלי עבודה אמיתיים</span><h2>כל מה שצריך כדי להגיע לגרסה הסופית</h2><p>פחות חלונות, פחות ייצוא־ייבוא, פחות תיקונים ידניים.</p></div>
        <div className="marketing-feature-grid">
          {features.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>)}
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

      <section className="marketing-section" id="pricing">
        <div className="marketing-section-head"><span>מתחילים בלי סיכון</span><h2>מסלול שמתאים לקצב שלך</h2><p>לא מחייבים על שימוש מעבר למכסה בלי אישור ומנוי פעיל.</p></div>
        <div className="marketing-pricing">
          {plans.map((plan) => <article key={plan.name} className={plan.featured ? "featured" : ""}>{plan.featured && <em>הכי מתאים ליוצרים</em>}<h3>{plan.name}</h3><div className="marketing-price">{plan.price}<small>{plan.suffix}</small></div><p>{plan.text}</p><ul>{plan.items.map((item) => <li key={item}><Check size={15} />{item}</li>)}</ul><Link href={plan.name === "Free" ? "/login?next=/dashboard" : "/login?next=/account%23plans"} className={`btn ${plan.featured ? "primary" : "secondary"}`}>{plan.name === "Free" ? "התחל בחינם" : "בחר מסלול"}</Link></article>)}
        </div>
        <p className="marketing-billing-note">המסלולים בתשלום זמינים כרגע ב־Test Mode בלבד עד אישור החנות.</p>
      </section>

      <section className="marketing-final"><h2>הסרטון הבא שלך יכול להיות מוכן היום.</h2><p>פותחים פרויקט, מעלים חומר גלם ומתחילים לערוך בעברית.</p><Link href="/login?next=/dashboard" className="btn primary marketing-cta">התחל בחינם <ArrowLeft size={17} /></Link></section>
      <footer className="marketing-footer"><BrandLogo variant="horizontal" size="xs" theme="light" decorative /><span>© 2026 Hypescript</span><nav><Link href="/legal/privacy">פרטיות</Link><Link href="/legal/terms">תנאי שימוש</Link><Link href="/login">התחברות</Link></nav></footer>
    </main>
  );
}
