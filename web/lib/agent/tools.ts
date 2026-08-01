// כלי הסוכן (צד-לקוח). מודל EDL: הסוכן והמשתמש עורכים את אותה רשימת קליפים.
// כל פעולת עריכה = כלי, כך שהמשתמש רואה כל שינוי חי על הציר.

import { Word } from "@/lib/models";
import { normalizeHebrew } from "@/lib/align";
import {
  addClip, Clip, clipDur, firstVideo, MediaAsset, mediaById, moveClip, removeClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { ToolSchema } from "./types";

export interface AgentContext {
  media: MediaAsset[];
  duration: number; // משך המקור הראשי
  words: Word[] | null;
  clips: Clip[] | null;
  lastRender: Blob | null;
  askUser: (question: string, options: string[]) => Promise<string>;
  // מוציא קובץ תוצר לצ'אט (קישור הורדה + תצוגה מקדימה).
  onOutput?: (blob: Blob, name: string, kind: "video" | "srt") => void;
}

// המקור הראשי (הסרטון הראשון) — עליו מתמללים וחותכים לפי סקריפט כברירת מחדל.
const mainVideo = (ctx: AgentContext) => firstVideo(ctx.media);
// איתור מקור לפי שם/אינדקס (1-based) שהסוכן מספק.
function resolveAsset(ctx: AgentContext, ref: string | number): MediaAsset | undefined {
  if (typeof ref === "number") return ctx.media[ref - 1];
  const s = String(ref).replace(/^@/, "").trim().toLowerCase();
  return ctx.media.find((m) => m.name.toLowerCase().includes(s)) || ctx.media[(parseInt(s, 10) || 0) - 1];
}

export type Reporter = (status: string) => void;

export interface ToolMeta {
  name: string;
  label: string;
  color: string;
  icon: string;
  schema: ToolSchema;
  run: (args: any, ctx: AgentContext, report: Reporter) => Promise<string>;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// --- אחסון תמלול לפי טביעת-אצבע (לא מתמללים שוב אותו סרטון) ---
function txKey(f: File) { return `hs_tx_${f.name}_${f.size}_${(f as any).lastModified || 0}`; }
function txRead(k: string): Word[] | null { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } }
function txWrite(k: string, w: Word[]) { try { localStorage.setItem(k, JSON.stringify(w)); } catch { /* quota */ } }

function findRanges(words: Word[], query: string, max = 6) {
  const q = query.split(/\s+/).map(normalizeHebrew).filter(Boolean);
  if (!q.length) return [];
  const norm = words.map((w) => normalizeHebrew(w.text));
  const out: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < words.length && out.length < max; i++) {
    if (norm[i] !== q[0]) continue;
    let qi = 1, j = i + 1, gap = 0;
    while (qi < q.length && j < words.length && gap <= 3) { if (norm[j] === q[qi]) { qi++; gap = 0; } else gap++; j++; }
    if (qi === q.length) { out.push({ start: words[i].start, end: words[j - 1].end, text: words.slice(i, j).map((w) => w.text).join(" ") }); i = j; }
  }
  return out;
}

const requireClips = (ctx: AgentContext) => (ctx.clips && ctx.clips.length ? null : "שגיאה: אין קליפים. צור חיתוך קודם (keep_by_script / remove_segments).");
const clipsSummary = (clips: Clip[]) => `${clips.length} קליפים, משך סופי ${fmt(totalDur(clips))}.`;

export const TOOLS: ToolMeta[] = [
  {
    name: "get_video_info", label: "בדיקת אורך", color: "#3b82f6", icon: "⏱️",
    schema: { name: "get_video_info", description: "מחזיר את אורך הסרטון הראשי בשניות.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => { const m = mainVideo(ctx); return m ? `אורך "${m.name}": ${m.duration.toFixed(2)}s.` : "שגיאה: לא נטען סרטון."; },
  },
  {
    name: "list_media", label: "רשימת מדיה", color: "#64748b", icon: "🗂️",
    schema: { name: "list_media", description: "מחזיר את כל קבצי המדיה שנטענו (אינדקס 1-based, שם, סוג, משך).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => ctx.media.length ? ctx.media.map((m, i) => `${i + 1}. ${m.name} (${m.kind}, ${m.duration.toFixed(1)}s)`).join("\n") : "אין מדיה טעונה.",
  },
  {
    name: "transcribe_video", label: "תמלול הסרטון", color: "#8b5cf6", icon: "📝",
    schema: { name: "transcribe_video", description: "מתמלל ובונה מפת נקודות-ציון (מילים+זמנים). חובה פעם אחת לפני פעולות מבוססות-טקסט.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx, report) => {
      const m = mainVideo(ctx);
      if (!m) return "שגיאה: לא נטען סרטון.";
      if (ctx.words) return `כבר תומלל (${ctx.words.length} מילים).`;
      const key = txKey(m.file); const cached = txRead(key);
      if (cached) { ctx.words = cached; if (!ctx.duration) ctx.duration = cached[cached.length - 1].end + 0.2; return `נטען תמלול שמור (${cached.length} מילים) — לא תומלל מחדש.`; }
      const { extractAudio } = await import("@/lib/ffmpeg");
      report("מחלץ אודיו…");
      const audio = await extractAudio(m.file);
      report("שולח לתמלול (Groq)…");
      const fd = new FormData();
      fd.append("file", audio, "audio.mp3"); fd.append("provider", "groq"); fd.append("model", "whisper-large-v3"); fd.append("language", "he");
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
      const words: Word[] = (data.words || []).filter((w: any) => w.start != null && w.end != null && (w.word || w.text)).map((w: any) => ({ text: String(w.word || w.text).trim(), start: +w.start, end: +w.end }));
      if (!words.length) throw new Error("התמלול לא החזיר מילים.");
      ctx.words = words; if (!ctx.duration) ctx.duration = words[words.length - 1].end + 0.2;
      txWrite(key, words);
      report("בונה מפת נקודות-ציון…");
      return `התמלול הושלם: ${words.length} מילים (נשמר). מוכן לחיתוך.`;
    },
  },
  {
    name: "find_in_transcript", label: "איתור בתמלול", color: "#14b8a6", icon: "🔍",
    schema: { name: "find_in_transcript", description: "מאתר היכן טקסט נאמר ומחזיר טווחי-זמן (שניות במקור).", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
    run: async (a, ctx) => {
      if (!ctx.words) return "שגיאה: צריך לתמלל קודם.";
      const r = findRanges(ctx.words, String(a.query || ""));
      return r.length ? "נמצא:\n" + r.map((x) => `• ${x.start.toFixed(2)}–${x.end.toFixed(2)}s: "${x.text}"`).join("\n") : `לא נמצא "${a.query}".`;
    },
  },
  {
    name: "keep_by_script", label: "חיתוך לפי סקריפט", color: "#f59e0b", icon: "✂️",
    schema: {
      name: "keep_by_script",
      description: "בונה את הסרטון לפי טקסט: הקליפים מסודרים בדיוק בסדר של הטקסט, כולל חזרות (אם הטקסט חוזר על קטע — הוא יופיע שוב). זו הדרך המועדפת.",
      parameters: { type: "object", properties: { script: { type: "string", description: "הטקסט שאמור להישאר, בסדר הרצוי" } }, required: ["script"] },
    },
    run: async (a, ctx, report) => {
      if (!ctx.words) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      const m = mainVideo(ctx);
      if (!m) return "שגיאה: אין סרטון ראשי.";
      report("מיישר סקריפט ובונה קליפים לפי הסדר…");
      const clips = scriptToClips(ctx.words, String(a.script || ""), m.id);
      if (!clips.length) return "לא נמצאו התאמות — ודא שהטקסט תואם לנאמר בסרטון.";
      ctx.clips = clips;
      return `נבנה: ${clipsSummary(clips)} (בסדר הטקסט, כולל חזרות). הרץ render_video לייצוא.`;
    },
  },
  {
    name: "remove_segments", label: "הסרת קטעים", color: "#f59e0b", icon: "✂️",
    schema: { name: "remove_segments", description: "מסיר טווחי-זמן מהמקור ובונה EDL מהשאר (בסדר המקורי).", parameters: { type: "object", properties: { segments: { type: "array", items: { type: "object", properties: { start: { type: "number" }, end: { type: "number" } }, required: ["start", "end"] } } }, required: ["segments"] } },
    run: async (a, ctx) => {
      const m = mainVideo(ctx);
      if (!m) return "שגיאה: לא נטען סרטון.";
      const dur = ctx.duration || m.duration;
      const segs = (a.segments || []).map((s: any) => ({ start: Math.max(0, +s.start), end: Math.min(dur, +s.end) })).filter((s: any) => s.end > s.start).sort((x: any, y: any) => x.start - y.start);
      const clips: Clip[] = []; let prev = 0;
      for (const s of segs) { if (s.start - prev > 0.05) clips.push({ id: uid(), sourceId: m.id, start: prev, end: s.start }); prev = Math.max(prev, s.end); }
      if (dur - prev > 0.05) clips.push({ id: uid(), sourceId: m.id, start: prev, end: dur });
      if (!clips.length) return "לא נשאר תוכן.";
      ctx.clips = clips;
      return `הוסרו ${segs.length} קטעים. ${clipsSummary(clips)}`;
    },
  },
  {
    name: "add_clip", label: "הוספת קליפ", color: "#10b981", icon: "➕",
    schema: {
      name: "add_clip",
      description: "מוסיף קליפ מכל מקור-מדיה (לפי שם או אינדקס) לסוף הרצף — כך מרכיבים סרטון מכמה סרטונים.",
      parameters: { type: "object", properties: { source: { type: "string", description: "שם המקור או אינדקס (1-based)" }, start: { type: "number" }, end: { type: "number" }, at_index: { type: "number", description: "מיקום להוספה (1-based, אופציונלי)" } }, required: ["source"] },
    },
    run: async (a, ctx) => {
      const asset = resolveAsset(ctx, a.source);
      if (!asset) return `לא נמצא מקור "${a.source}". השתמש ב-list_media.`;
      const start = a.start != null ? Math.max(0, +a.start) : 0;
      const end = a.end != null ? Math.min(asset.duration, +a.end) : asset.duration;
      const clip: Clip = { id: uid(), sourceId: asset.id, start, end: Math.max(start + 0.1, end) };
      ctx.clips = addClip(ctx.clips || [], clip, a.at_index != null ? (a.at_index | 0) - 1 : undefined);
      return `נוסף קליפ מ-"${asset.name}". ${clipsSummary(ctx.clips)}`;
    },
  },
  {
    name: "list_clips", label: "רשימת קליפים", color: "#64748b", icon: "📋",
    schema: { name: "list_clips", description: "מחזיר את רשימת הקליפים הנוכחית (אינדקס 1-based, טווח מקור, משך).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      return ctx.clips!.map((c, i) => `${i + 1}. ${c.start.toFixed(2)}–${c.end.toFixed(2)}s (${clipDur(c).toFixed(2)}s)`).join("\n");
    },
  },
  {
    name: "split_clip", label: "פיצול קליפ", color: "#0ea5e9", icon: "🔪",
    schema: { name: "split_clip", description: "מפצל קליפ לשניים בנקודת זמן במקור.", parameters: { type: "object", properties: { index: { type: "number", description: "מספר הקליפ (1-based)" }, at_source: { type: "number", description: "שנייה במקור לפיצול" } }, required: ["index", "at_source"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      ctx.clips = splitClip(ctx.clips!, c.id, +a.at_source);
      return `פוצל. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "trim_clip", label: "טרים קליפ", color: "#0ea5e9", icon: "↔️",
    schema: { name: "trim_clip", description: "משנה את גבולות המקור של קליפ (start/end בשניות).", parameters: { type: "object", properties: { index: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["index", "start", "end"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      ctx.clips = trimClip(ctx.clips!, c.id, +a.start, +a.end, ctx.duration);
      return `טורם. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "move_clip", label: "הזזת קליפ", color: "#0ea5e9", icon: "↕️",
    schema: { name: "move_clip", description: "מזיז קליפ למיקום אחר ברצף (משנה את הסדר).", parameters: { type: "object", properties: { index: { type: "number" }, to_index: { type: "number", description: "מיקום יעד (1-based)" } }, required: ["index", "to_index"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      ctx.clips = moveClip(ctx.clips!, c.id, (a.to_index | 0) - 1);
      return `הוזז. ${clipsSummary(ctx.clips!)}`;
    },
  },
  {
    name: "delete_clip", label: "מחיקת קליפ", color: "#ef4444", icon: "🗑️",
    schema: { name: "delete_clip", description: "מוחק קליפ מהרצף.", parameters: { type: "object", properties: { index: { type: "number" } }, required: ["index"] } },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      ctx.clips = removeClip(ctx.clips!, c.id);
      return `נמחק. ${ctx.clips!.length ? clipsSummary(ctx.clips!) : "אין קליפים."}`;
    },
  },
  {
    name: "render_video", label: "ייצוא הווידאו", color: "#22c55e", icon: "🎬",
    schema: { name: "render_video", description: "מרנדר ומייצא את הסרטון הסופי לפי הקליפים (בסדר). הרץ בסוף.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx, report) => {
      if (!ctx.media.length) return "שגיאה: לא נטען סרטון.";
      const err = requireClips(ctx); if (err) return err;
      const { renderEDL } = await import("@/lib/ffmpeg");
      report("מרנדר בדפדפן…");
      const blob = await renderEDL(ctx.media, ctx.clips!, (r) => report(`מרנדר… ${Math.round(r * 100)}%`));
      ctx.lastRender = blob;
      const base = (mainVideo(ctx)?.name || "video").replace(/\.[^.]+$/, "");
      ctx.onOutput?.(blob, `${base}_edited.mp4`, "video");
      return `הייצוא הושלם — קישור להורדה ותצוגה מקדימה בצ'אט.`;
    },
  },
  {
    name: "generate_subtitles", label: "יצירת כתוביות", color: "#8b5cf6", icon: "💬",
    schema: { name: "generate_subtitles", description: "מייצר קובץ כתוביות SRT (לא צרוב לסרטון) מהתמלול והקליפים — להורדה ולשימוש ב-CapCut (שינוי גופן/מיקום שם).", parameters: { type: "object", properties: { max_chars: { type: "number", description: "מקס תווים בשורה (ברירת מחדל 42)" } } } },
    run: async (a, ctx) => {
      if (!ctx.words) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      const main = mainVideo(ctx);
      const clips = ctx.clips?.length ? ctx.clips : main ? [{ id: uid(), sourceId: main.id, start: 0, end: ctx.duration || main.duration }] : [];
      if (!clips.length) return "אין תוכן ליצירת כתוביות.";
      const { edlToSrt } = await import("@/lib/editor/subtitlesEdl");
      const srt = edlToSrt(ctx.words, clips, (a.max_chars | 0) || 42);
      const name = (main?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt";
      ctx.onOutput?.(new Blob([srt], { type: "text/plain;charset=utf-8" }), name, "srt");
      return `נוצרו כתוביות SRT — קישור להורדה בצ'אט (לא צרוב, מתאים ל-CapCut).`;
    },
  },
  {
    name: "ask_user", label: "שאלה למשתמש", color: "#eab308", icon: "❓",
    schema: { name: "ask_user", description: "שואל את המשתמש שאלה עם אפשרויות, או מבקש קובץ/מידע חסר.", parameters: { type: "object", properties: { question: { type: "string" }, options: { type: "array", items: { type: "string" } } }, required: ["question", "options"] } },
    run: async (a, ctx) => `המשתמש בחר: ${await ctx.askUser(String(a.question || ""), a.options || [])}`,
  },
];

export const TOOL_SCHEMAS = TOOLS.map((t) => t.schema);
export const TOOL_BY_NAME: Record<string, ToolMeta> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

export const SYSTEM_PROMPT = `אתה סוכן עריכת וידאו בעברית של hypescript. אתה עורך שיעורים: חותך, מסדר ומייצא לפי הוראות המשתמש.

מודל: הסרטון הסופי הוא רשימת "קליפים" מסודרת (EDL). כל קליפ מצביע על טווח במקור. הסדר ברשימה = הסדר בסרטון הסופי. אפשר לסדר-מחדש ולחזור על קטע.

מדיה: יכולים להיות כמה קבצים (list_media). הסרטון הראשון הוא "הראשי" — עליו חלים תמלול וחיתוך-לפי-סקריפט. אפשר להרכיב סרטון מכמה מקורות בעזרת add_clip (לפי שם או אינדקס; המשתמש עשוי לצטט מקור עם @שם).

עקרונות:
- ענה תמיד בעברית, קצר.
- העדף כלים קיימים: אם המשתמש נותן טקסט שאמור להישאר — השתמש ב-keep_by_script. הוא בונה את הקליפים *בדיוק בסדר של הטקסט*, כולל חזרות. אם המשתמש נתן טקסט ואז הוסיף עוד טקסט (גם אם מההתחלה) — הרץ keep_by_script שוב עם כל הטקסט המעודכן בסדר הנכון.
- חובה transcribe_video פעם אחת לפני פעולות מבוססות-טקסט (נשמר, לא מתמללים שוב).
- הפניה לקטע לפי תוכן → find_in_transcript ואז remove_segments או trim/split.
- עריכות עדינות: split_clip / trim_clip / move_clip / delete_clip / list_clips.
- render_video רק בסוף / כשמבקשים. התוצר מופיע בצ'אט כקישור+תצוגה מקדימה.
- כתוביות: generate_subtitles מייצר SRT לא-צרוב (לשימוש ב-CapCut). המשתמש יכול לבקש אורך שורה או תוכן — קבל חופש לסדר את הכתוביות בהיגיון.
- הבן מהשפה הטבעית איך הסרטון הסופי צריך להיראות, ותכנן בעצמך את סדר הכלים.
- אם חסר קובץ/מידע (התבקשת להוסיף תמונה/שמע שלא סופק) — בקש ב-ask_user, אל תמציא.

זרימה טיפוסית: transcribe_video → keep_by_script (או find→remove) → עריכות עדינות → render_video.`;
