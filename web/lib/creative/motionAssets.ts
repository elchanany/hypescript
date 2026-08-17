// קטלוג אלמנטים מונפשים ונכסי תנועה (Motion Assets & Lottie/dotLottie Runtime)
//
// כולל אנימציות SVG ו-Lottie מובנות לשימוש מיידי, וכן תמיכה בהעלאת קובצי Lottie מותאמים אישית.

export type MotionCategory =
  | "social"        // כפתורי מנוי ולייק
  | "celebration"   // קונפטי וזיקוקים
  | "indicators"    // חצים וסימונים
  | "energy"        // אש וניצוצות
  | "badges"        // צ'קים וסמלים
  | "custom";       // העלאות משתמש

export interface MotionAsset {
  id: string;
  nameHe: string;
  category: MotionCategory;
  descriptionHe: string;
  defaultDuration: number; // בשניות
  /** SVG מונפש באמצעות CSS keyframes מובנים או Lottie JSON Data URL */
  animatedSvgMarkup: string;
  viewBox: string;
  width: number;
  height: number;
}

export const CURATED_MOTION_ASSETS: readonly MotionAsset[] = [
  // ── כפתורי רשתות והנעה לפעולה (SOCIAL) ──────────────────────────────────
  {
    id: "motion_subscribe_bell",
    nameHe: "כפתור Subscribe + פעמון",
    category: "social",
    descriptionHe: "כפתור הרשמה מונפש בצבע אדום עם פעמון מצלצל",
    defaultDuration: 3.0,
    width: 320,
    height: 90,
    viewBox: "0 0 320 90",
    animatedSvgMarkup: `
      <g>
        <rect x="10" y="10" width="300" height="70" rx="35" fill="#dc2626">
          <animate attributeName="opacity" values="1;0.85;1" dur="1.5s" repeatCount="indefinite"/>
        </rect>
        <text x="145" y="52" fill="#ffffff" font-size="22" font-weight="bold" font-family="system-ui" text-anchor="middle">SUBSCRIBE</text>
        <g transform="translate(245, 27)">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" stroke="#ffffff" stroke-width="2.5" fill="none">
            <animateTransform attributeName="transform" type="rotate" values="0 12 12; 15 12 12; -15 12 12; 0 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </g>
      </g>`,
  },
  {
    id: "motion_like_thumbs",
    nameHe: "לייק קופץ",
    category: "social",
    descriptionHe: "אייקון לייק פועם וקופץ להדגשת בקשת תמיכה",
    defaultDuration: 2.0,
    width: 120,
    height: 120,
    viewBox: "0 0 120 120",
    animatedSvgMarkup: `
      <g transform="translate(10, 10)">
        <circle cx="50" cy="50" r="45" fill="#3b82f6"/>
        <path d="M35 50v25M45 42l4-15a4 4 0 0 1 7 3v12h14a6 6 0 0 1 6 7l-4 20a6 6 0 0 1-6 6H45V42" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <animateTransform attributeName="transform" type="scale" values="1; 1.15; 1" keyTimes="0; 0.5; 1" dur="1.0s" repeatCount="indefinite" transform-origin="50 50"/>
        </path>
      </g>`,
  },

  // ── חגיגות ושמחה (CELEBRATION) ──────────────────────────────────────────
  {
    id: "motion_confetti_burst",
    nameHe: "פיצוץ קונפטי צבעוני",
    category: "celebration",
    descriptionHe: "חלקיקי קונפטי זוהרים המתפזרים לכל עבר",
    defaultDuration: 2.5,
    width: 200,
    height: 200,
    viewBox: "0 0 200 200",
    animatedSvgMarkup: `
      <g>
        <circle cx="100" cy="100" r="6" fill="#facc15">
          <animate attributeName="cy" values="100; 30" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="100; 40" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1; 0" dur="1.2s" repeatCount="indefinite"/>
        </circle>
        <rect x="95" y="95" width="8" height="8" fill="#ef4444">
          <animate attributeName="y" values="95; 20" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="x" values="95; 160" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1; 0" dur="1.4s" repeatCount="indefinite"/>
        </rect>
        <circle cx="100" cy="100" r="5" fill="#3b82f6">
          <animate attributeName="cy" values="100; 170" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="100; 30" dur="1.3s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1; 0" dur="1.3s" repeatCount="indefinite"/>
        </circle>
        <rect x="95" y="95" width="7" height="12" fill="#10b981">
          <animate attributeName="y" values="95; 180" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="x" values="95; 150" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1; 0" dur="1.5s" repeatCount="indefinite"/>
        </rect>
      </g>`,
  },

  // ── חצים וסימונים (INDICATORS) ──────────────────────────────────────────
  {
    id: "motion_arrow_bounce_down",
    nameHe: "חץ מקפץ למטה",
    category: "indicators",
    descriptionHe: "חץ אדום מקפץ להכוונה לקישור או לפרטים למטה",
    defaultDuration: 1.5,
    width: 80,
    height: 120,
    viewBox: "0 0 80 120",
    animatedSvgMarkup: `
      <g>
        <path d="M40 10v80M20 70l20 20 20-20" stroke="#ef4444" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 15; 0 0" dur="0.8s" repeatCount="indefinite"/>
        </path>
      </g>`,
  },
  {
    id: "motion_pulse_target",
    nameHe: "מטרת פוקוס פועמת",
    category: "indicators",
    descriptionHe: "טבעות פעימה להדגשת נקודה מסוימת במסך",
    defaultDuration: 2.0,
    width: 100,
    height: 100,
    viewBox: "0 0 100 100",
    animatedSvgMarkup: `
      <g>
        <circle cx="50" cy="50" r="15" fill="#ef4444"/>
        <circle cx="50" cy="50" r="30" stroke="#ef4444" stroke-width="3" fill="none" opacity="0.6">
          <animate attributeName="r" values="15; 45" dur="1.2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8; 0" dur="1.2s" repeatCount="indefinite"/>
        </circle>
      </g>`,
  },

  // ── אנרגיה ואפקטים (ENERGY) ─────────────────────────────────────────────
  {
    id: "motion_fire_burn",
    nameHe: "להבת אש מונפשת",
    category: "energy",
    descriptionHe: "להבה חיה פועמת לתכנים חמים וטרנדיים",
    defaultDuration: 1.5,
    width: 100,
    height: 120,
    viewBox: "0 0 100 120",
    animatedSvgMarkup: `
      <g>
        <path d="M50 10c0 30-30 40-30 70a30 30 0 0 0 60 0c0-30-30-40-30-70z" fill="#f97316">
          <animateTransform attributeName="transform" type="scale" values="1 1; 1.05 0.95; 0.96 1.04; 1 1" keyTimes="0; 0.33; 0.66; 1" dur="0.6s" repeatCount="indefinite" transform-origin="50 80"/>
        </path>
        <path d="M50 45c0 15-15 20-15 35a15 15 0 0 0 30 0c0-15-15-20-15-35z" fill="#facc15"/>
      </g>`,
  },
  {
    id: "motion_soundwave",
    nameHe: "גלי קול פועמים",
    category: "energy",
    descriptionHe: "ויזואליזציה של סאונד מוזיקלי או קול רמקול",
    defaultDuration: 1.0,
    width: 120,
    height: 80,
    viewBox: "0 0 120 80",
    animatedSvgMarkup: `
      <g stroke="#38bdf8" stroke-width="6" stroke-linecap="round">
        <line x1="20" y1="30" x2="20" y2="50"><animate attributeName="y1" values="30; 10; 30" dur="0.5s" repeatCount="indefinite"/><animate attributeName="y2" values="50; 70; 50" dur="0.5s" repeatCount="indefinite"/></line>
        <line x1="40" y1="20" x2="40" y2="60"><animate attributeName="y1" values="20; 5; 20" dur="0.4s" repeatCount="indefinite"/><animate attributeName="y2" values="60; 75; 60" dur="0.4s" repeatCount="indefinite"/></line>
        <line x1="60" y1="10" x2="60" y2="70"><animate attributeName="y1" values="10; 30; 10" dur="0.6s" repeatCount="indefinite"/><animate attributeName="y2" values="70; 50; 70" dur="0.6s" repeatCount="indefinite"/></line>
        <line x1="80" y1="25" x2="80" y2="55"><animate attributeName="y1" values="25; 10; 25" dur="0.45s" repeatCount="indefinite"/><animate attributeName="y2" values="55; 70; 55" dur="0.45s" repeatCount="indefinite"/></line>
        <line x1="100" y1="35" x2="100" y2="45"><animate attributeName="y1" values="35; 20; 35" dur="0.55s" repeatCount="indefinite"/><animate attributeName="y2" values="45; 60; 45" dur="0.55s" repeatCount="indefinite"/></line>
      </g>`,
  },

  // ── תגים וסמלים (BADGES) ────────────────────────────────────────────────
  {
    id: "motion_check_success",
    nameHe: "וי הצלחה מונפש",
    category: "badges",
    descriptionHe: "סמל צ'ק ירוק המאושר בתנועת ציור חלקה",
    defaultDuration: 2.0,
    width: 100,
    height: 100,
    viewBox: "0 0 100 100",
    animatedSvgMarkup: `
      <g>
        <circle cx="50" cy="50" r="40" fill="#22c55e">
          <animate attributeName="r" values="0; 40" dur="0.4s" fill="freeze"/>
        </circle>
        <path d="M30 50l15 15 28-28" stroke="#ffffff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none">
          <animate attributeName="stroke-dasharray" values="0,100; 100,0" dur="0.6s" fill="freeze"/>
        </path>
      </g>`,
  },
  {
    id: "motion_loading_spinner",
    nameHe: "ספינר טעינה מודרני",
    category: "badges",
    descriptionHe: "טבעת טעינה מונפשת עגולה וחלקה",
    defaultDuration: 1.0,
    width: 80,
    height: 80,
    viewBox: "0 0 80 80",
    animatedSvgMarkup: `
      <g>
        <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.2)" stroke-width="6" fill="none"/>
        <circle cx="40" cy="40" r="30" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="45 140">
          <animateTransform attributeName="transform" type="rotate" values="0 40 40; 360 40 40" dur="0.9s" repeatCount="indefinite"/>
        </circle>
      </g>`,
  },
];

export const MOTION_CATEGORIES = [
  { id: "social", labelHe: "רשתות והנעה לפעולה 🔔" },
  { id: "celebration", labelHe: "חגיגות ושמחה 🎉" },
  { id: "indicators", labelHe: "חצים וסימונים 🎯" },
  { id: "energy", labelHe: "אנרגיה ואפקטים ⚡" },
  { id: "badges", labelHe: "תגים ואישורים ✅" },
];
