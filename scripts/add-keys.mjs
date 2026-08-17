#!/usr/bin/env node
// אשף הוספת מפתחות API ל-Vercel.
//
// למה סקריפט ולא ידנית: מפתחות × שלוש סביבות = עשרות הרצות של
// `vercel env add`, כל אחת עם שם מדויק ו-prompt נפרד. קל לטעות בשם, וקשה
// לזכור מאיזה דשבורד כל מפתח מגיע.
//
// המפתח שאתה מקליד הולך ישירות מהטרמינל שלך ל-Vercel CLI. הוא לא נכתב
// לדיסק, לא נשמר בהיסטוריית הפקודות, ולא מוצג על המסך בזמן ההקלדה.
//
// שימוש:
//   node scripts/add-keys.mjs            הוספה אינטראקטיבית של מה שחסר
//   node scripts/add-keys.mjs --status   רק להראות מה קיים ומה חסר
//   node scripts/add-keys.mjs --only=GOOGLE_FONTS_API_KEY,GIPHY_API_KEY

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";

import { say, visual, warn } from "./lib/rtl.mjs";

const ENVIRONMENTS = ["production", "preview", "development"];

/**
 * שירותים שאין להם מפתח להוסיף — מוצגים כדי שיהיה ברור שלא שכחנו אותם.
 * @type {Array<{label:string,why:string,url:string}>}
 */
const NO_KEY_SERVICES = [
  { label: "Remotion Effects & Transitions", url: "https://www.remotion.dev/docs/effects",
    why: "רץ מקומית דרך CSS ו-Canvas. 100% אופליין, ללא מפתח." },
  { label: "FFmpeg Video & Audio Processing", url: "https://ffmpeg.org/ffmpeg-filters.html",
    why: "עיבוד וידאו מקומי (xfade, eq, colorbalance, curves, unsharp). ללא מפתח." },
  { label: "Iconify (150k+ Icons)", url: "https://iconify.design",
    why: "API ציבורי פתוח ומאגר מובנה ללא צורך במפתח." },
  { label: "Lottie / dotLottie & Shapes", url: "https://dotlottie.io",
    why: "רץ מקומית (SVG Animated / Lottie JSON) ללא צורך במפתח." },
  { label: "Free Music Archive", url: "https://freemusicarchive.org",
    why: "ה-API הציבורי הוסר. הורדה ידנית, ובדיקת רישיון לכל טראק." },
  { label: "Uppbeat", url: "https://uppbeat.io",
    why: "אין API ציבורי. הורדה מהאתר עם חשבון." },
  { label: "Epidemic Sound", url: "https://www.epidemicsound.com",
    why: "Partner API דורש אישור עסקי מראש. מנוי, לא מפתח." },
  { label: "Artlist", url: "https://artlist.io",
    why: "אין API ציבורי. מנוי + הורדה ידנית." },
  { label: "Lickd (שירים מוכרים)", url: "https://lickd.co",
    why: "אין API. רכישה לפי טראק דרך האתר. הדרך החוקית היחידה לשיר מסחרי." },
];

/** @type {Array<{key:string,label:string,url:string,tier:string,note?:string}>} */
const SERVICES = [
  { key: "GOOGLE_FONTS_API_KEY", label: "Google Fonts — חיפוש וקטלוג 1,500+ גופנים", tier: "חינם",
    url: "https://developers.google.com/fonts/docs/developer_api",
    note: "אופציונלי. מאפשר חיפוש דינמי ומיון טרנדינג. עובד גם בלי מפתח על בסיס קטלוג מובנה עשיר." },
  { key: "GIPHY_API_KEY", label: "GIPHY — סטיקרים שקופים ו-GIFs מונפשים", tier: "חינם",
    url: "https://developers.giphy.com/",
    note: "אופציונלי. מאפשר חיפוש חי וטרנדים ב-GIPHY. עובד גם בלי מפתח על בסיס Starter Pack." },
  { key: "GEMINI_API_KEY", label: "Google Gemini — ראיית תמונות", tier: "חינם",
    url: "https://aistudio.google.com/apikey",
    note: "DeepSeek לא רואה תמונות. בלי מודל ראייה, זיהוי תמונות וסידור סיפור לא עובדים." },
  { key: "PEXELS_API_KEY", label: "Pexels — וידאו ותמונות סטוק", tier: "חינם",
    url: "https://www.pexels.com/api/", note: "ללא ייחוס נדרש. הכי נקי משפטית." },
  { key: "PIXABAY_API_KEY", label: "Pixabay — סטוק + מוזיקה + אפקטים", tier: "חינם",
    url: "https://pixabay.com/api/docs/", note: "חובה להציג מקור בתוצאות חיפוש." },
  { key: "FREESOUND_API_KEY", label: "Freesound — אפקטי קול", tier: "חינם",
    url: "https://freesound.org/apiv2/apply/", note: "רישיון משתנה לכל קובץ — לסנן ל-CC0." },
  { key: "UNSPLASH_ACCESS_KEY", label: "Unsplash — תמונות", tier: "חינם",
    url: "https://unsplash.com/developers", note: "דורש ייחוס לצלם." },
  { key: "OPENAI_API_KEY", label: "OpenAI — יצירת תמונות + ראייה", tier: "בתשלום",
    url: "https://platform.openai.com/api-keys" },
  { key: "ANTHROPIC_API_KEY", label: "Anthropic — ראייה (חלופה)", tier: "בתשלום",
    url: "https://console.anthropic.com/settings/keys" },
  { key: "STABILITY_API_KEY", label: "Stability — מוזיקה/תמונות", tier: "בתשלום",
    url: "https://platform.stability.ai/account/keys" },
  { key: "OPENVERSE_CLIENT_ID", label: "Openverse — חיפוש CC מאוחד", tier: "חינם",
    url: "https://api.openverse.org/v1/auth_tokens/register/",
    note: "עובד גם בלי מפתח; המפתח רק מעלה את מגבלת הקצב." },
  { key: "OPENVERSE_CLIENT_SECRET", label: "Openverse — סוד", tier: "חינם",
    url: "https://api.openverse.org/v1/auth_tokens/register/",
    note: "מגיע יחד עם ה-client id למעלה." },
  { key: "SUNO_API_KEY", label: "Suno — מוזיקה AI", tier: "בתשלום",
    url: "https://suno.com",
    note: "⚠ תנאי רישוי מסחרי עדיין לא יציבים. לפרויקט לקוח — ElevenLabs Music עדיף." },
  { key: "DEEPGRAM_API_KEY", label: "Deepgram — תמלול (גיבוי)", tier: "חינם 200$",
    url: "https://console.deepgram.com/signup",
    note: "אופציונלי. גיבוי אם Groq ו-ElevenLabs שניהם נופלים." },
];

const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a === `--${n}` || a.startsWith(`--${n}=`));
const flagValue = (n) => { const h = flag(n); return h && h.includes("=") ? h.slice(h.indexOf("=") + 1) : undefined; };

function existingKeys() {
  const r = spawnSync("npx", ["vercel", "env", "ls", "production"],
    { encoding: "utf8", shell: process.platform === "win32" });
  if (r.status !== 0) {
    warn("לא הצלחתי לקרוא את המשתנים מ-Vercel. ודא ש-`npx vercel whoami` עובד.");
    process.exit(1);
  }
  return new Set((r.stdout || "").split("\n")
    .map((line) => line.trim().split(/\s+/)[0])
    .filter((name) => /^[A-Z][A-Z0-9_]+$/.test(name)));
}

/** קלט מוסתר — המפתח לא מוצג בזמן ההקלדה ולא נשאר על המסך. */
function askSecret(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    let value = "";
    const onData = (chunk) => {
      const s = chunk.toString("utf8");
      for (const ch of s) {
        if (ch === "\r" || ch === "\n") {
          stdin.removeListener("data", onData);
          if (stdin.isTTY) stdin.setRawMode(!!wasRaw);
          stdin.pause();
          process.stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (ch === " ") { process.stdout.write("\n"); process.exit(130); }
        if (ch === " " || ch === "\b") { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    stdin.resume();
    stdin.on("data", onData);
  });
}

function askLine(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(prompt, (a) => { rl.close(); resolve(a.trim()); }));
}

/** מזין ערך יחיד ל-Vercel דרך stdin — לא כארגומנט, כדי שלא ידלוף להיסטוריה. */
function pushToVercel(key, value, environment) {
  return new Promise((resolve) => {
    const child = spawn("npx", ["vercel", "env", "add", key, environment],
      { stdio: ["pipe", "pipe", "pipe"], shell: process.platform === "win32" });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.stdout.on("data", () => {});
    child.stdin.write(`${value}\n`);
    child.stdin.end();
    child.on("close", (code) => resolve({ ok: code === 0, stderr }));
  });
}

const have = existingKeys();
const only = flagValue("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const wanted = only ? SERVICES.filter((s) => only.includes(s.key)) : SERVICES;

say("\n  מפתחות API — Vercel\n  " + "─".repeat(52));
for (const s of SERVICES) {
  say(`  ${have.has(s.key) ? "✓" : "·"} ${s.key.padEnd(24)} ${s.label}`);
}
const missing = wanted.filter((s) => !have.has(s.key));
say("  " + "─".repeat(52));
say(`  קיימים ${SERVICES.length - SERVICES.filter((s) => !have.has(s.key)).length}/${SERVICES.length} · חסרים ${missing.length}`);

say("\n  כבר מוגדרים בפרויקט (לא נשאלים כאן):");
for (const key of ["ELEVENLABS_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY"]) {
  if (have.has(key)) say(`  ✓ ${key}`);
}

say("\n  שירותים ללא צורך במפתח (מובנים מקומית / חופשיים):");
for (const s of NO_KEY_SERVICES) {
  say(`  · ${s.label}`);
  say(`      ${s.why}`);
  if (s.url !== "-") say(`      ${s.url}`);
}
say("\n  הדרכה מלאה — מה כל מפתח עושה, מאיפה מביאים אותו ובאיזה סדר:");
say("  docs/API_KEYS.md");
say("");

if (flag("status")) process.exit(0);
if (!missing.length) { say("  הכל כבר מוגדר.\n"); process.exit(0); }

say("  Enter ריק = דילוג. Ctrl+C = יציאה.");
say("  המפתח לא מוצג בהקלדה ולא נשמר בהיסטוריה.\n");

let added = 0;
for (const service of missing) {
  say(`  ${service.label}  [${service.tier}]`);
  say(`     ${service.url}`);
  if (service.note) say(`     ${service.note}`);
  const value = await askSecret(`     ${service.key} = `);
  if (!value) { say("     דילוג\n"); continue; }

  for (const environment of ENVIRONMENTS) {
    const { ok, stderr } = await pushToVercel(service.key, value, environment);
    if (ok) continue;
    if (/already exists/i.test(stderr)) { say(`     כבר קיים ב-${environment}`); continue; }
    say(`     נכשל ב-${environment}: ${stderr.trim().split("\n").pop()}`);
  }
  say(`     נוסף ל-${ENVIRONMENTS.join(", ")}\n`);
  added++;
}

say(`  ${"─".repeat(52)}`);
say(`  נוספו ${added} מפתחות.`);
if (added) {
  const deploy = await askLine(visual("  לפרוס עכשיו לפרודקשן? (y/N) "));
  if (deploy.toLowerCase() === "y") {
    say("\n  פורס…\n");
    const r = spawnSync("npx", ["vercel", "--prod"], { stdio: "inherit", shell: process.platform === "win32" });
    process.exit(r.status ?? 0);
  }
  say("  לפריסה מאוחר יותר:  npx vercel --prod\n");
}
