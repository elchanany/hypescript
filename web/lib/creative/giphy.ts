// אינטגרציית GIPHY API וספריית סטיקרים ו-GIFs מובנית (GIPHY + Starter Pack)
//
// כולל תמיכה בחיפוש, Trending, קטגוריות, סטיקרים שקופים (Stickers),
// GIFs מונפשים ואימוג'י, תוך שמירה על דרישות הייחוס ("Powered by GIPHY").

export type GiphyItemType = "sticker" | "gif" | "emoji";

export interface GiphyAssetItem {
  id: string;
  title: string;
  type: GiphyItemType;
  previewUrl: string; // URL קטן ומהיר לתצוגה מקדימה ברשת
  fullUrl: string;    // URL באיכות מלאה להוספה לקנבס
  width: number;
  height: number;
  isTransparent: boolean;
}

/**
 * חבילת Starter Pack מובנית של סטיקרים ואימוג'ים הזמינה תמיד (Offline וגם ללא מפתח API).
 */
export const STARTER_STICKERS: readonly GiphyAssetItem[] = [
  // ── מחיאות כפיים וחגיגה ──────────────────────────────────────────────────
  {
    id: "sticker_celebrate_confetti",
    title: "קונפטי חגיגה",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif",
    fullUrl: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif",
    width: 320,
    height: 320,
    isTransparent: true,
  },
  {
    id: "sticker_fire_flame",
    title: "אש ולהבה",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif",
    fullUrl: "https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif",
    width: 250,
    height: 250,
    isTransparent: true,
  },
  {
    id: "sticker_sparkles_star",
    title: "ניצוצות זהב",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    fullUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    width: 300,
    height: 300,
    isTransparent: true,
  },
  {
    id: "sticker_thumbs_up",
    title: "לייק בוהן למעלה",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    fullUrl: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    width: 280,
    height: 280,
    isTransparent: true,
  },
  {
    id: "sticker_hundred_100",
    title: "100 נקודות",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    fullUrl: "https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif",
    width: 260,
    height: 260,
    isTransparent: true,
  },

  // ── חצים והצבעה ─────────────────────────────────────────────────────────
  {
    id: "sticker_arrow_down_red",
    title: "חץ מונפש אדום למטה",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
    fullUrl: "https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif",
    width: 200,
    height: 280,
    isTransparent: true,
  },
  {
    id: "sticker_arrow_left_yellow",
    title: "חץ מונפש שמאלה",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif",
    fullUrl: "https://media.giphy.com/media/3o7TKTDnUxE0g2fSE8/giphy.gif",
    width: 280,
    height: 200,
    isTransparent: true,
  },

  // ── פעמונים והתראות ─────────────────────────────────────────────────────
  {
    id: "sticker_bell_notification",
    title: "פעמון התראות מצלצל",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
    fullUrl: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif",
    width: 250,
    height: 250,
    isTransparent: true,
  },
  {
    id: "sticker_heart_pulse",
    title: "לב פועם אדום",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif",
    fullUrl: "https://media.giphy.com/media/l41lT4n6ylgW2hh04/giphy.gif",
    width: 260,
    height: 260,
    isTransparent: true,
  },
  {
    id: "sticker_wow_reaction",
    title: "וואו! (WOW)",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    fullUrl: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
    width: 300,
    height: 220,
    isTransparent: true,
  },
  {
    id: "sticker_mind_blown",
    title: "הלם מוחלט",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    fullUrl: "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
    width: 280,
    height: 280,
    isTransparent: true,
  },
  {
    id: "sticker_subscribe_red",
    title: "כפתור Subscribe מונפש",
    type: "sticker",
    previewUrl: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif",
    fullUrl: "https://media.giphy.com/media/3ohzdIuqJoo8QdKlnW/giphy.gif",
    width: 320,
    height: 120,
    isTransparent: true,
  },
];

export const GIPHY_CATEGORIES = [
  { id: "trending", labelHe: "פופולרי עכשיו 🔥" },
  { id: "stickers", labelHe: "סטיקרים שקופים ✨" },
  { id: "reactions", labelHe: "תגובות ורגשות 😂" },
  { id: "arrows", labelHe: "חצים והצבעה 🎯" },
  { id: "celebration", labelHe: "חגיגה ומחיאות כפיים 🎉" },
  { id: "memes", labelHe: "ממים וקומדיה 🕶️" },
  { id: "emojis", labelHe: "אימוג'י מונפש 😍" },
];
