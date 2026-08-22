"use client";

import { AudioWaveform, Film, Image, Sparkles, Users } from "@/components/icons";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { AppLocale } from "@/lib/i18n/config";

const COPY = {
  he: { eyebrow:"לא רק עוד סרטון", title:"כל רעיון מקבל פורמט משלו", body:"נותנים לעורך את החומרים ומספרים מה רוצים להשיג. הוא בונה גרסה שמתאימה לסיפור, לקהל ולמסך שבו יראו אותה.", items:[
    ["פודקאסט", "מפרק ארוך לפרק נקי, קליפים קצרים וציטוטים לרשת", "פרק אחד · כמה תוצרים"],
    ["טיול וחופשה", "רגעים מפוזרים הופכים לסיפור קצר, קצבי ונעים לשיתוף", "גלריה → Reels"],
    ["עסק ומשפיענים", "הדגמת מוצר, קריינות, מוזיקה וקריאה לפעולה בסרטון אחד", "חומר גלם → מודעה"],
    ["משפחה ואירועים", "תמונות, ברכות וסרטונים מתחברים למצגת שנראית אישית", "זיכרונות → סרט"],
  ]},
  en: { eyebrow:"More than one kind of video", title:"Every idea gets the right format", body:"Give the editor your media and describe the outcome. It shapes the story for the audience and the screen where it will live.", items:[
    ["Podcasts", "Turn a long episode into a polished cut, short clips, and shareable quotes", "One episode · many outputs"],
    ["Travel", "Scattered moments become a short, paced story worth sharing", "Gallery → Reels"],
    ["Products & creators", "Combine a demo, voice, music, and a clear call to action", "Raw media → ad"],
    ["Family moments", "Photos, greetings, and clips become a personal celebration film", "Memories → movie"],
  ]},
  ar: { eyebrow:"أكثر من نوع واحد من الفيديو", title:"لكل فكرة الشكل المناسب", body:"أرسل المواد واشرح النتيجة المطلوبة. يرتب المحرر القصة بما يناسب الجمهور والمنصة.", items:[
    ["البودكاست", "حلقة مرتبة مع مقاطع قصيرة واقتباسات جاهزة للنشر", "حلقة واحدة · نتائج متعددة"],
    ["السفر", "لحظات متفرقة تتحول إلى قصة قصيرة وسريعة للمشاركة", "صور → Reels"],
    ["المنتجات وصناع المحتوى", "عرض المنتج والصوت والموسيقى والدعوة في فيديو واحد", "مواد خام → إعلان"],
    ["العائلة والمناسبات", "صور وتهاني ومقاطع تتحول إلى فيلم شخصي", "ذكريات → فيلم"],
  ]},
  ru: { eyebrow:"Не только один тип видео", title:"Для каждой идеи — свой формат", body:"Загрузите материалы и опишите результат. Редактор соберёт историю под аудиторию и нужную площадку.", items:[
    ["Подкасты", "Чистый выпуск, короткие клипы и цитаты для соцсетей", "Один выпуск · много версий"],
    ["Путешествия", "Разрозненные моменты превращаются в динамичную историю", "Галерея → Reels"],
    ["Товары и авторы", "Демонстрация, голос, музыка и призыв в одном ролике", "Исходники → реклама"],
    ["Семья и события", "Фото, поздравления и видео складываются в личный фильм", "Воспоминания → фильм"],
  ]},
  hi: { eyebrow:"सिर्फ़ एक तरह का वीडियो नहीं", title:"हर आइडिया का सही फ़ॉर्मेट", body:"अपनी मीडिया दें और नतीजा बताएँ। एडिटर कहानी को दर्शकों और सही प्लेटफ़ॉर्म के हिसाब से बनाता है।", items:[
    ["पॉडकास्ट", "लंबे एपिसोड से साफ़ कट, छोटे क्लिप और शेयर करने योग्य कोट", "एक एपिसोड · कई आउटपुट"],
    ["यात्रा", "बिखरे पलों से तेज़ और शेयर करने लायक छोटी कहानी", "गैलरी → Reels"],
    ["प्रोडक्ट और क्रिएटर", "डेमो, आवाज़, संगीत और CTA को एक वीडियो में जोड़ें", "रॉ मीडिया → विज्ञापन"],
    ["परिवार और कार्यक्रम", "फ़ोटो, शुभकामनाएँ और क्लिप से निजी सेलिब्रेशन फ़िल्म", "यादें → फ़िल्म"],
  ]},
} satisfies Record<AppLocale, { eyebrow:string; title:string; body:string; items:readonly (readonly [string,string,string])[] }>;

const ITEMS = [
  { image:"/brand/landing-usecase-podcast.png", icon:AudioWaveform, className:"podcast" },
  { image:"/brand/landing-usecase-travel.png", icon:Film, className:"travel" },
  { image:"/brand/landing-usecase-product.png", icon:Sparkles, className:"product" },
  { image:"/brand/landing-usecase-family.png", icon:Users, className:"family" },
] as const;

export default function LandingUseCaseGallery() {
  const { locale } = useI18n();
  const copy = COPY[locale];
  return (
    <section className="marketing-section landing-usecase-showcase" aria-labelledby="landing-usecases-title">
      <header className="landing-usecase-head">
        <span>{copy.eyebrow}</span>
        <h2 id="landing-usecases-title">{copy.title}</h2>
        <p>{copy.body}</p>
      </header>
      <div className="landing-usecase-grid">
        {ITEMS.map(({ image, icon:Icon, className }, index) => {
          const [title, description, output] = copy.items[index];
          return <article className={`landing-usecase-card ${className}`} key={className}>
            <img src={image} alt="" loading="lazy" />
            <div className="landing-usecase-shade" />
            <div className="landing-usecase-copy">
              <span><Icon size={15} />{output}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
            {className === "podcast" && <div className="landing-usecase-wave" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div>}
            {className === "travel" && <div className="landing-usecase-progress" aria-hidden="true"><i /></div>}
            {className === "product" && <div className="landing-usecase-focus" aria-hidden="true"><Image size={16}/></div>}
          </article>;
        })}
      </div>
    </section>
  );
}
