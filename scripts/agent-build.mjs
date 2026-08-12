#!/usr/bin/env node
// בילד מבודד לכל סוכן — פותר את ההתנגשות שגרמה לבילדים תקועים.
//
// מה קרה בפועל: כמה סוכנים הריצו `next build` במקביל. לכולם אותו `.next`,
// אז הם דרסו זה את קבצי זה, ננעלו, ונתקעו לשעות. אחר כך סוכן שניסה לנקות
// זיהה בטעות בילד *חי* כתקוע והרג אותו.
//
// הפתרון: לכל סוכן distDir משלו (`.next-agent-<name>`), ורישום שאומר מי
// מריץ מה ומתי. שני סוכנים כבר לא נוגעים באותם קבצים, ואף אחד לא צריך
// לנחש אם תהליך חי או מת.
//
// שימוש:
//   node scripts/agent-build.mjs --name=captions      בילד מבודד
//   node scripts/agent-build.mjs --list               מי מריץ עכשיו
//   node scripts/agent-build.mjs --clean              מחיקת שאריות מתות

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "web");
const registryDir = join(root, ".ai", "locks");
const registryFile = join(registryDir, "builds.json");

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

function readRegistry() {
  try { return JSON.parse(readFileSync(registryFile, "utf8")); }
  catch { return { builds: [] }; }
}

function writeRegistry(data) {
  mkdirSync(registryDir, { recursive: true });
  writeFileSync(registryFile, JSON.stringify(data, null, 2));
}

function alive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === "EPERM"; }
}

/** מסיר רשומות של תהליכים שכבר מתו — כך "מי חי" תמיד אמין. */
function prune() {
  const data = readRegistry();
  const before = data.builds.length;
  data.builds = data.builds.filter((entry) => alive(entry.pid));
  if (data.builds.length !== before) writeRegistry(data);
  return data;
}

function minutesSince(iso) {
  return Math.round((Date.now() - new Date(iso).getTime()) / 60000);
}

if (flag("list")) {
  const data = prune();
  if (!data.builds.length) {
    console.log("אין בילדים פעילים.");
  } else {
    console.log("בילדים פעילים:");
    for (const entry of data.builds) {
      console.log(`  pid ${entry.pid}  ${entry.name}  ${entry.distDir}  לפני ${minutesSince(entry.startedAt)} דק'`);
    }
  }
  console.log("\nאל תהרוג תהליך שמופיע כאן בלי לשאול — הוא של סוכן אחר שעובד עכשיו.");
  process.exit(0);
}

if (flag("clean")) {
  const data = prune();
  const busy = new Set(data.builds.map((entry) => entry.distDir));
  let removed = 0;
  for (const name of readdirSync(webDir)) {
    if (!name.startsWith(".next-agent-")) continue;
    if (busy.has(name)) { console.log(`דילוג על ${name} — בשימוש עכשיו.`); continue; }
    rmSync(join(webDir, name), { recursive: true, force: true });
    console.log(`נמחק ${name}`);
    removed++;
  }
  console.log(removed ? `נוקו ${removed} תיקיות.` : "אין שאריות לניקוי.");
  process.exit(0);
}

const name = String(flag("name") || process.env.AGENT_NAME || `p${process.pid}`)
  .replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || `p${process.pid}`;
const distDir = `.next-agent-${name}`;

const data = prune();
const conflict = data.builds.find((entry) => entry.distDir === distDir);
if (conflict) {
  console.error(`בילד בשם "${name}" כבר רץ (pid ${conflict.pid}, לפני ${minutesSince(conflict.startedAt)} דק').`);
  console.error("בחר --name אחר, או המתן לו. אל תהרוג אותו בלי לשאול.");
  process.exit(1);
}

const entry = { pid: process.pid, name, distDir, startedAt: new Date().toISOString() };
data.builds.push(entry);
writeRegistry(data);

const release = () => {
  const current = readRegistry();
  current.builds = current.builds.filter((item) => item.pid !== process.pid);
  writeRegistry(current);
};
process.on("exit", release);
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => { release(); process.exit(1); });
}

console.log(`בילד מבודד "${name}" → web/${distDir}`);
if (!existsSync(webDir)) { console.error("web/ לא נמצא"); process.exit(1); }

const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
  cwd: webDir,
  stdio: "inherit",
  shell: process.platform === "win32",
  // אותו משתנה שכבר קיים ב-web/next.config.js
  env: { ...process.env, HYPESCRIPT_NEXT_DIST_DIR: distDir },
});
child.on("exit", (code) => { release(); process.exit(code ?? 1); });
