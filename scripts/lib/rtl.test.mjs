// הרצה:  node --test scripts/lib/
//
// כל מקרה כאן נבדק ידנית מול מה שדפדפן מציג לאותה מחרוזת. הבדיקה משווה
// למחרוזת ויזואלית מפורשת, כי זה הדבר היחיד שאפשר באמת לקרוא בטרמינל.

import assert from "node:assert/strict";
import test from "node:test";

import { toVisual } from "./rtl.mjs";

test("שורה בלי עברית לא משתנה", () => {
  const line = "  ✓ ELEVENLABS_API_KEY";
  assert.equal(toVisual(line), line);
});

test("שורה עברית מתהפכת, והמספרים נשארים קריאים", () => {
  assert.equal(toVisual("  קיימים 0/13 · חסרים 13"), "  13 םירסח · 0/13 םימייק");
});

test("עמודה באנגלית נשארת במקום, רק התיאור העברי מתהפך", () => {
  assert.equal(
    toVisual("  · GEMINI_API_KEY   Google Gemini — ראיית תמונות"),
    "  · GEMINI_API_KEY   Google Gemini — תונומת תייאר",
  );
});

test("ביטוי לטיני בתוך משפט עברי נשאר שלם ולא מתפרק", () => {
  assert.equal(toVisual("  מפתחות API — Vercel"), "  API — Vercel תוחתפמ");
});

test("סוגריים מתהפכים לבן הזוג שלהם", () => {
  assert.equal(
    toVisual("  לפרוס עכשיו לפרודקשן? (y/N) "),
    "  (y/N) ?ןשקדורפל וישכע סורפל ",
  );
});

// כלל N0: בלי טיפול בזוגות, הסוגר האחרון נשען על סוף השורה, מקבל את כיוון
// הבסיס, ויוצאים שני סוגריים סוגרים: "הפולח) הייאר)".
test("זוג סוגריים בסוף שורה לטינית נשאר זוג", () => {
  assert.equal(
    toVisual("  · ANTHROPIC_API_KEY      Anthropic — ראייה (חלופה)"),
    "  · ANTHROPIC_API_KEY      Anthropic — (הפולח) הייאר",
  );
});

test("סוגריים סביב טקסט עברי בשורה עברית", () => {
  assert.equal(toVisual("  · Google Fonts (גופנים עבריים)"), "  · Google Fonts (םיירבע םינפוג)");
});

test("אורך השורה נשמר — טבלאות לא זזות", () => {
  for (const line of [
    "  · PIXABAY_API_KEY        Pixabay — סטוק + מוזיקה + אפקטים",
    "      אין API. מורידים את קובצי הגופן וארוזים בפרויקט. OFL, מסחרי מותר.",
    "  ⚠ תנאי רישוי מסחרי עדיין לא יציבים. לפרויקט לקוח — ElevenLabs Music עדיף.",
  ]) {
    assert.equal(toVisual(line).length, line.length, line);
  }
});

test("הזחה ורווח בסוף נשארים במקום", () => {
  assert.equal(toVisual("      דילוג"), "      גוליד");
  assert.equal(toVisual("     נוסף ל-production  "), "     production-ל ףסונ  ");
});

test("היפוך כפול מחזיר את המקור בשורה עברית נקייה", () => {
  const line = "אין בילדים פעילים";
  assert.equal(toVisual(toVisual(line)), line);
});
