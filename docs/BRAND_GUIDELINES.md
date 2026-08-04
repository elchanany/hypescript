# Hypescript — Brand Guidelines

מדריך פרקטי למפתחים ומעצבים. אין סיפור מותג ארוך.

## נכסים רשמיים

| תפקיד | קובץ מקור | נתיב מוצר |
|---|---|---|
| App icon (HS מרובע, רקע navy) | `web/public/brand/sources/original-icon-navy.png` | `/brand/hypescript-icon.png` (**עותק ביטים זהה** למקור) |
| Horizontal lockup (אייקון + Hypescript) | `web/public/brand/sources/original-wordmark.png` | `/brand/hypescript-logo-horizontal.png` (רקע שחור הוסר → RGBA + crop) |
| Additional / reference (אייקון על שחור) | `web/public/brand/sources/original-additional.png` (= `original-icon-black.png`) | מקור בלבד — לא לשימוש אקראי ב-UI |

### תפקיד הקובץ השלישי
`original-icon-black.png` / `original-additional.png` — וריאציית אייקון על רקע שחור (רפרנס).  
אין להשתמש בו כ-favicon או כלוגו אופקי.

### כלל מקור
הנכסים הרשמיים מגיעים **רק** משלושת קבצי המשתמש. אין לייצר לוגו מחדש ב-AI.

## נגזרות

```
web/public/brand/
  hypescript-icon.png
  hypescript-logo-horizontal.png
  hypescript-logo-dark.png
  hypescript-logo-light.png
  icons/icon-{16,32,48,64,96,128,180,192,256,512}.png
  icons/icon-maskable-{192,512}.png
  icons/apple-touch-icon.png
  social/open-graph.png
  social/twitter-card.png
web/public/
  favicon-16.png, favicon-32.png, favicon.ico, apple-touch-icon.png
  manifest.webmanifest
```

אין SVG וקטורי אמיתי כרגע — הנכסים הם PNG. אל תעטוף PNG ב-SVG ותטען שהוא וקטורי.

## רכיב מרכזי

`BrandLogo` (`web/components/BrandLogo.tsx`) + נתיבים ב-`web/lib/brand/assets.ts`.

Props: `variant` (icon | horizontal), `size` (xs–xl), `theme` (auto | dark | light), `decorative`.

אל תכתוב נתיבי `/brand/...` ידנית ברכיבים.

## מתי אייקון / מתי אופקי

| הקשר | גרסה |
|---|---|
| Editor top bar, sidebar מכווץ, favicon, PWA | icon |
| Login, Dashboard header, Onboarding שלב 1 | horizontal |
| Settings About | icon קטן |
| Empty states | עדיף אייקון פונקציונלי; לוגו רק כמוטיב עדין |

אל תכריח Wordmark כשהטקסט בלתי קריא. אל תדביק לוגו בכל כרטיס/כפתור.

## Palette (נדגם מהלוגו)

| Token | Hex | שימוש |
|---|---|---|
| `--brand-navy-950` | `#000821` | רקע עמוק |
| `--brand-navy-900` | `#000B30` | רקע אייקון / launch |
| `--brand-blue-600` | `#0066FF` | Primary press |
| `--brand-cyan-500` | `#00E0F0` | Accent / selection |
| `--brand-ai-lime` | `#C6FF00` | AI / Generate בלבד |
| `--brand-attention-yellow` | `#F5C518` | Warning (לא זהה ל-AI) |

Primary = cyan/blue. AI = lime מרוסן. Warning = yellow נפרד. Danger = red. Success = green רגוע.

## Theme

- ברירת מחדל: **System** (`prefers-color-scheme`)
- Dark / Light נשמרים ב-`localStorage` (`hs_theme`) לפני login; אחרי login — גם ב-`user_settings.theme` (כשה-DB מוכן)
- אין flash: סקריפט קטן ב-`<head>` ב-`layout.tsx`
- Light: השתמש ב-`hypescript-logo-light.png` ל-wordmark (contrast גבוה יותר)

## Clear space / Minimum size

- Clear space סביב האייקון: ≈ ⅛ מרוחב האייקון
- אייקון מינימום ב-UI: 16×16 (favicon); מומלץ 24–28 ב-top bar
- Wordmark מינימום: גובה ≈ 28px; אל תכווץ מתחת לכך

## שימוש אסור

- Watermark על ייצוא משתמש בלי מדיניות מפורשת
- לוגו כאייקון Delete / AI לכל פעולה
- רקע אפור/checkerboard צרוב
- החלפת favicon בלוגו אופקי
- Sparkles / clapperboard / camera מפורטת כתחליף למותג

## Metadata / PWA / Social

- Manifest: `/manifest.webmanifest` — name/short_name = Hypescript
- Open Graph: `/brand/social/open-graph.png` (1200×630)
- Twitter card: `/brand/social/twitter-card.png`
- Apple touch: `/apple-touch-icon.png`

## Accessibility

- `BrandLogo`: alt = "Hypescript" אלא אם `decorative`
- אל תציג גם Alt וגם טקסט "Hypescript" צמוד שגורם לקריאה כפולה
- Focus ring: `var(--focus)`

## Email

כשמערכת אימיילים תיבנה: header = horizontal logo על רקע בהיר (`hypescript-logo-light.png`), URL ציבורי מ-`NEXT_PUBLIC_SITE_URL`. בינתיים המיפוי ב-`BRAND_PATHS` מוכן.
