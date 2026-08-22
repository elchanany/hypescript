"use client";

import { Check, Play, Send, Sparkles, WandSparkles } from "@/components/icons";
import { useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { LANDING_DEMO_IMAGES } from "@/components/LandingProductExperience";

const showcaseCopy = {
  he:{label:"Hypescript בכל מסך",eyebrow:"אותו פרויקט. כל מסך.",title:<>מדברים עם העורך.<br />ורואים אותו עובד.</>,body:"סרטון לרשת, מצגת וידאו, מודעת מוצר או קליפים מפרק ארוך — מבקשים בשיחה ורואים את העריכה מתרחשת.",tabs:"דוגמאות לבקשות עריכה",version:"גרסת Reels",export:"ייצוא",play:"הפעלת תצוגה",caption:"בקשה אחת. סרטון מוכן.",connected:"מחובר לפרויקט",ready:"הסרטון שלך מוכן",change:"בקש שינוי…",send:"שליחת בקשה",prompts:[['ערוך מזה TikTok של 35 שניות','בחרתי את הרגעים החזקים והכנתי גרסה אנכית.'],['בנה מצגת וידאו מהתמונות והקריינות','סידרתי שקופיות, מעברים וקול באורך מדויק.'],['צור סרטון מוצר קצר עם לוגו','הוספתי מיתוג, מוזיקה וקריאה לפעולה.'],['מצא ארבעה קליפים בפרק הזה','מצאתי ארבעה הוקים והכנתי גרסאות לפרסום.']]},
  en:{label:"Hypescript on every screen",eyebrow:"One project. Every screen.",title:<>Talk to the editor.<br />Watch it work.</>,body:"A social video, video presentation, product ad, or clips from a long episode — ask in chat and watch the edit happen.",tabs:"Editing request examples",version:"Reels version",export:"Export",play:"Play preview",caption:"One request. Finished video.",connected:"Connected to project",ready:"Your video is ready",change:"Ask for a change…",send:"Send request",prompts:[['Turn this into a 35-second TikTok','I selected the strongest moments and made a vertical version.'],['Build a video presentation from the photos and narration','I arranged the slides, transitions, and audio to the exact duration.'],['Create a short product video with a logo','I added branding, music, and a call to action.'],['Find four clips in this episode','I found four strong hooks and prepared them for publishing.']]},
  ar:{label:"Hypescript على كل شاشة",eyebrow:"مشروع واحد. كل شاشة.",title:<>تحدث مع المحرر.<br />وشاهده يعمل.</>,body:"فيديو للشبكات أو عرض فيديو أو إعلان منتج أو مقاطع من حلقة طويلة — اطلب في الدردشة وشاهد التحرير يحدث.",tabs:"أمثلة لطلبات التحرير",version:"نسخة Reels",export:"تصدير",play:"تشغيل المعاينة",caption:"طلب واحد. فيديو جاهز.",connected:"متصل بالمشروع",ready:"الفيديو جاهز",change:"اطلب تعديلًا…",send:"إرسال الطلب",prompts:[['حوّل هذا إلى TikTok مدته 35 ثانية','اخترت أقوى اللحظات وأعددت نسخة عمودية.'],['أنشئ عرض فيديو من الصور والتعليق','رتبت الشرائح والانتقالات والصوت بطول دقيق.'],['أنشئ فيديو منتج قصيرًا مع الشعار','أضفت الهوية والموسيقى والدعوة لاتخاذ إجراء.'],['استخرج أربعة مقاطع من هذه الحلقة','وجدت أربعة افتتاحيات قوية وجهزتها للنشر.']]},
  ru:{label:"Hypescript на любом экране",eyebrow:"Один проект. Любой экран.",title:<>Говорите с редактором.<br />Смотрите, как он работает.</>,body:"Ролик для соцсетей, видеопрезентация, реклама товара или клипы из длинного выпуска — попросите в чате и наблюдайте за монтажом.",tabs:"Примеры запросов",version:"Версия Reels",export:"Экспорт",play:"Запустить предпросмотр",caption:"Один запрос. Готовое видео.",connected:"Подключено к проекту",ready:"Видео готово",change:"Попросите изменение…",send:"Отправить",prompts:[['Сделай из этого TikTok на 35 секунд','Я выбрал лучшие моменты и подготовил вертикальную версию.'],['Собери видеопрезентацию из фото и озвучки','Я выстроил слайды, переходы и звук с точной длительностью.'],['Создай короткое видео товара с логотипом','Я добавил фирменный стиль, музыку и призыв к действию.'],['Найди четыре клипа в этом выпуске','Я нашёл четыре сильных начала и подготовил версии к публикации.']]},
  hi:{label:"हर स्क्रीन पर Hypescript",eyebrow:"एक प्रोजेक्ट। हर स्क्रीन।",title:<>एडिटर से बात करें।<br />उसे काम करते देखें।</>,body:"सोशल वीडियो, वीडियो प्रेज़ेंटेशन, प्रोडक्ट विज्ञापन या लंबे एपिसोड के क्लिप — चैट में कहें और एडिट होते देखें।",tabs:"एडिटिंग अनुरोध के उदाहरण",version:"Reels संस्करण",export:"एक्सपोर्ट",play:"प्रीव्यू चलाएँ",caption:"एक अनुरोध। तैयार वीडियो।",connected:"प्रोजेक्ट से जुड़ा",ready:"आपका वीडियो तैयार है",change:"बदलाव माँगें…",send:"अनुरोध भेजें",prompts:[['इसे 35 सेकंड का TikTok बनाएँ','मैंने बेहतरीन पल चुने और वर्टिकल संस्करण बनाया।'],['फ़ोटो और नैरेशन से वीडियो प्रेज़ेंटेशन बनाएँ','मैंने स्लाइड, ट्रांज़िशन और ऑडियो सही लंबाई में लगाए।'],['लोगो के साथ छोटा प्रोडक्ट वीडियो बनाएँ','मैंने ब्रांडिंग, संगीत और कॉल टू एक्शन जोड़ा।'],['इस एपिसोड से चार क्लिप खोजें','मैंने चार मज़बूत हुक चुने और प्रकाशन के लिए तैयार किए।']]},
} as const;

export default function LandingDeviceShowcase() {
  const { locale } = useI18n();
  const copy = showcaseCopy[locale];
  const demoImage = LANDING_DEMO_IMAGES[locale];
  const [prompt, setPrompt] = useState(0);
  const prompts = copy.prompts;

  return (
    <section className="hsx-device-story hsx-reveal" aria-label={copy.label}>
      <div className="hsx-device-copy">
        <span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.body}</p>
        <div className="hsx-prompt-switcher" role="tablist" aria-label={copy.tabs}>
          {prompts.map((item, index) => <button key={item[0]} type="button" role="tab" aria-selected={prompt === index} onClick={() => setPrompt(index)}>{index + 1}</button>)}
        </div>
      </div>

      <div className="hsx-device-scene">
        <div className="hsx-tablet">
          <i className="hsx-tablet-camera" />
          <div className="hsx-tablet-ui">
            <header><div className="hsx-tablet-brand"><BrandLogo variant="icon" size="xs" decorative /><b>Hypescript</b></div><span>{copy.version}</span><button type="button">{copy.export}</button></header>
            <div className="hsx-tablet-work">
              <div className="hsx-tablet-video"><img src={demoImage} alt="" /><span className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></span><button type="button" aria-label={copy.play}><Play size={18} fill="currentColor" /></button><strong>{copy.caption}</strong></div>
              <aside><span><Sparkles size={12} />Hype AI</span><p>{prompts[prompt][0]}</p><div><Check size={12} />{prompts[prompt][1]}</div></aside>
            </div>
            <div className="hsx-tablet-timeline"><i /><i /><i /><i /><i /><b /></div>
          </div>
        </div>

        <div className="hsx-phone">
          <div className="hsx-phone-notch" />
          <header><span><BrandLogo variant="icon" size="xs" decorative /></span><div><b>Hype AI</b><small>{copy.connected}</small></div><i /></header>
          <div className="hsx-phone-preview"><img src={demoImage} alt="" /><i className="hsx-preview-brand"><BrandLogo variant="icon" size="xs" decorative /></i><span>00:35</span></div>
          <div className="hsx-phone-chat">
            <p className="user">{prompts[prompt][0]}</p><p className="agent"><WandSparkles size={12} />{prompts[prompt][1]}</p><div><Check size={12} />{copy.ready}</div>
          </div>
          <footer><span>{copy.change}</span><button type="button" aria-label={copy.send}><Send size={12} /></button></footer>
        </div>
        <div className="hsx-device-halo" />
      </div>
    </section>
  );
}
