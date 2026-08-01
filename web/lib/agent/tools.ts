// כלי הסוכן (רצים בצד-לקוח). כל כלי עוטף לוגיקה קיימת (ffmpeg.wasm, יישור-סקריפט,
// הסרת שתיקות) ומדווח סטטוס חי. לכל כלי מטא בעברית: שם, צבע, אייקון.

import { KeepInterval, Word, keptDuration } from "@/lib/models";
import { normalizeHebrew, scriptKeepMask } from "@/lib/align";
import { buildKeepIntervals, fillerMask, parseFillers, removedIntervals } from "@/lib/editing";
import { ToolSchema } from "./types";

// מצב משותף שהכלים קוראים/כותבים אליו לאורך השיחה.
export interface AgentContext {
  file: File | null;
  duration: number;
  words: Word[] | null;
  keeps: KeepInterval[] | null;
  lastRender: Blob | null;
  askUser: (question: string, options: string[]) => Promise<string>;
}

export type Reporter = (status: string) => void;

export interface ToolMeta {
  name: string;
  label: string; // עברית — מוצג למשתמש
  color: string;
  icon: string;
  schema: ToolSchema;
  run: (args: any, ctx: AgentContext, report: Reporter) => Promise<string>;
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}:${s.padStart(4, "0")}`;
}

// --- אחסון תמלול לפי טביעת-אצבע של הקובץ (שם+גודל+תאריך) ---
function txCacheKey(f: File): string {
  return `hs_tx_${f.name}_${f.size}_${(f as any).lastModified || 0}`;
}
function readTxCache(key: string): Word[] | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Word[]) : null;
  } catch { return null; }
}
function writeTxCache(key: string, words: Word[]) {
  try { localStorage.setItem(key, JSON.stringify(words)); } catch { /* quota — לא קריטי */ }
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

// איתור טווחי-זמן בתמלול לפי טקסט (מיפוי "נקודות ציון").
function findRanges(words: Word[], query: string, maxResults = 5) {
  const qTokens = query.split(/\s+/).map(normalizeHebrew).filter(Boolean);
  if (!qTokens.length) return [];
  const norm = words.map((w) => normalizeHebrew(w.text));
  const ranges: { start: number; end: number; text: string }[] = [];
  for (let i = 0; i < words.length && ranges.length < maxResults; i++) {
    if (norm[i] !== qTokens[0]) continue;
    let qi = 1, j = i + 1, gap = 0;
    while (qi < qTokens.length && j < words.length && gap <= 3) {
      if (norm[j] === qTokens[qi]) { qi++; gap = 0; } else { gap++; }
      j++;
    }
    if (qi === qTokens.length) {
      ranges.push({ start: words[i].start, end: words[j - 1].end, text: words.slice(i, j).map((w) => w.text).join(" ") });
      i = j;
    }
  }
  return ranges;
}

export const TOOLS: ToolMeta[] = [
  {
    name: "get_video_info",
    label: "בדיקת אורך הסרטון",
    color: "#3b82f6",
    icon: "⏱️",
    schema: {
      name: "get_video_info",
      description: "מחזיר את אורך הסרטון בשניות. השתמש כדי לדעת את משך הווידאו.",
      parameters: { type: "object", properties: {} },
    },
    run: async (_args, ctx) => {
      if (!ctx.file) return "שגיאה: לא נטען סרטון.";
      return `אורך הסרטון: ${ctx.duration.toFixed(2)} שניות (${fmt(ctx.duration)}).`;
    },
  },
  {
    name: "transcribe_video",
    label: "תמלול הסרטון",
    color: "#8b5cf6",
    icon: "📝",
    schema: {
      name: "transcribe_video",
      description:
        "מתמלל את הסרטון ובונה מפת נקודות-ציון (מילים עם חותמות זמן). חובה להריץ פעם אחת לפני כל פעולה מבוססת-טקסט (חיתוך לפי סקריפט, איתור בתמלול).",
      parameters: { type: "object", properties: {} },
    },
    run: async (_args, ctx, report) => {
      if (!ctx.file) return "שגיאה: לא נטען סרטון.";
      if (ctx.words) return `כבר תומלל (${ctx.words.length} מילים).`;
      // אחסון תמלול: לא מתמללים שוב את אותו סרטון.
      const cacheKey = txCacheKey(ctx.file);
      const cached = readTxCache(cacheKey);
      if (cached) {
        ctx.words = cached;
        if (!ctx.duration) ctx.duration = cached[cached.length - 1].end + 0.2;
        return `נטען תמלול שמור (${cached.length} מילים) — לא תומלל מחדש.`;
      }
      const { extractAudio } = await import("@/lib/ffmpeg");
      report("מחלץ אודיו…");
      const audio = await extractAudio(ctx.file);
      report("שולח לתמלול (Groq)…");
      const fd = new FormData();
      fd.append("file", audio, "audio.mp3");
      fd.append("provider", "groq");
      fd.append("model", "whisper-large-v3");
      fd.append("language", "he");
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
      const words: Word[] = (data.words || [])
        .filter((w: any) => w.start != null && w.end != null && (w.word || w.text))
        .map((w: any) => ({ text: String(w.word || w.text).trim(), start: +w.start, end: +w.end }));
      if (!words.length) throw new Error("התמלול לא החזיר מילים.");
      ctx.words = words;
      if (!ctx.duration) ctx.duration = words[words.length - 1].end + 0.2;
      writeTxCache(cacheKey, words);
      report("בונה מפת נקודות-ציון…");
      return `התמלול הושלם: ${words.length} מילים ממופות לפי זמן (נשמר לפעם הבאה). מוכן לחיתוך.`;
    },
  },
  {
    name: "find_in_transcript",
    label: "איתור בתמלול",
    color: "#14b8a6",
    icon: "🔍",
    schema: {
      name: "find_in_transcript",
      description:
        "מאתר היכן קטע טקסט נאמר בסרטון ומחזיר טווחי-זמן (start/end בשניות). השתמש כשהמשתמש מפנה לקטע לפי תוכן (\"החלק על X\").",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "הטקסט לחיפוש בתמלול" } },
        required: ["query"],
      },
    },
    run: async (args, ctx) => {
      if (!ctx.words) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      const ranges = findRanges(ctx.words, String(args.query || ""));
      if (!ranges.length) return `לא נמצא \"${args.query}\" בתמלול.`;
      return "נמצאו הטווחים:\n" + ranges.map((r) => `• ${r.start.toFixed(2)}–${r.end.toFixed(2)}s: \"${r.text}\"`).join("\n");
    },
  },
  {
    name: "keep_by_script",
    label: "חיתוך לפי סקריפט",
    color: "#f59e0b",
    icon: "✂️",
    schema: {
      name: "keep_by_script",
      description:
        "משאיר בסרטון רק את מה שתואם לטקסט שניתן, וחותך את השאר (חזרות, גמגומים, סטיות) + מסיר נשימות ומהססים. זו הדרך המועדפת כשהמשתמש נותן את הטקסט שאמור להישאר.",
      parameters: {
        type: "object",
        properties: {
          script: { type: "string", description: "הטקסט הנקי שאמור להישאר בסרטון" },
          remove_fillers: { type: "boolean", description: "להסיר מהססים (אה/אמ). ברירת מחדל true" },
        },
        required: ["script"],
      },
    },
    run: async (args, ctx, report) => {
      if (!ctx.words) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      report("מיישר את הסקריפט לתמלול…");
      let mask = scriptKeepMask(ctx.words, String(args.script || ""));
      if (args.remove_fillers !== false) {
        const fm = fillerMask(ctx.words, parseFillers());
        mask = mask.map((m, i) => m && !fm[i]);
      }
      const keeps = buildKeepIntervals(ctx.words, ctx.duration, 0.4, 0.1, mask);
      if (!keeps.length) return "לא נשארו קטעים — ייתכן שהסקריפט לא תואם לסרטון.";
      ctx.keeps = keeps;
      const removed = removedIntervals(keeps, ctx.duration);
      const edited = keptDuration(keeps);
      return `חושב חיתוך: ${keeps.length} קטעים נשמרים, ${removed.length} חיתוכים. משך ${fmt(ctx.duration)} → ${fmt(edited)}. הרץ render_video לייצוא.`;
    },
  },
  {
    name: "remove_segments",
    label: "הסרת קטעים",
    color: "#f59e0b",
    icon: "✂️",
    schema: {
      name: "remove_segments",
      description:
        "מסיר טווחי-זמן ספציפיים מהסרטון (שניות). השתמש אחרי find_in_transcript, או כשהמשתמש נותן זמנים מדויקים.",
      parameters: {
        type: "object",
        properties: {
          segments: {
            type: "array",
            description: "רשימת טווחים להסרה",
            items: {
              type: "object",
              properties: { start: { type: "number" }, end: { type: "number" } },
              required: ["start", "end"],
            },
          },
        },
        required: ["segments"],
      },
    },
    run: async (args, ctx) => {
      if (!ctx.duration) return "שגיאה: לא ידוע אורך הסרטון.";
      const segs: { start: number; end: number }[] = (args.segments || [])
        .map((s: any) => ({ start: Math.max(0, +s.start), end: Math.min(ctx.duration, +s.end) }))
        .filter((s: any) => s.end > s.start)
        .sort((a: any, b: any) => a.start - b.start);
      if (!segs.length) return "לא ניתנו טווחים תקינים.";
      const keeps: KeepInterval[] = [];
      let prev = 0;
      for (const s of segs) {
        if (s.start - prev > 0.05) keeps.push({ start: prev, end: s.start });
        prev = Math.max(prev, s.end);
      }
      if (ctx.duration - prev > 0.05) keeps.push({ start: prev, end: ctx.duration });
      ctx.keeps = keeps;
      const edited = keptDuration(keeps);
      return `יוסרו ${segs.length} קטעים. יישארו ${keeps.length} קטעים, משך ${fmt(edited)}. הרץ render_video לייצוא.`;
    },
  },
  {
    name: "render_video",
    label: "ייצוא הווידאו",
    color: "#22c55e",
    icon: "🎬",
    schema: {
      name: "render_video",
      description: "מרנדר ומייצא את הסרטון הערוך (לפי החיתוכים שחושבו) ומוריד אותו. הרץ אחרי keep_by_script או remove_segments.",
      parameters: { type: "object", properties: {} },
    },
    run: async (_args, ctx, report) => {
      if (!ctx.file) return "שגיאה: לא נטען סרטון.";
      if (!ctx.keeps || !ctx.keeps.length) return "שגיאה: אין חיתוכים. הרץ קודם keep_by_script או remove_segments.";
      const { renderCut } = await import("@/lib/ffmpeg");
      report("מרנדר בדפדפן…");
      const blob = await renderCut(ctx.file, ctx.keeps, (r) => report(`מרנדר… ${Math.round(r * 100)}%`));
      ctx.lastRender = blob;
      const base = ctx.file.name.replace(/\.[^.]+$/, "");
      download(blob, `${base}_edited.mp4`);
      return `הייצוא הושלם — הקובץ ${base}_edited.mp4 הורד.`;
    },
  },
  {
    name: "ask_user",
    label: "שאלה למשתמש",
    color: "#eab308",
    icon: "❓",
    schema: {
      name: "ask_user",
      description: "שואל את המשתמש שאלה עם אפשרויות בחירה, כשיש אי-בהירות או החלטה שדורשת אישור. מחזיר את הבחירה.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
        },
        required: ["question", "options"],
      },
    },
    run: async (args, ctx) => {
      const choice = await ctx.askUser(String(args.question || ""), args.options || []);
      return `המשתמש בחר: ${choice}`;
    },
  },
];

export const TOOL_SCHEMAS = TOOLS.map((t) => t.schema);
export const TOOL_BY_NAME: Record<string, ToolMeta> = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

export const SYSTEM_PROMPT = `אתה סוכן עריכת וידאו בעברית של hypescript. אתה עורך שיעורים מוקלטים: מסיר נשימות/שתיקות/מהססים, וחותך לפי הוראות המשתמש.

עקרונות:
- ענה תמיד בעברית, קצר וברור.
- העדף כלים קיימים על פני הרבה פעולות קטנות: אם המשתמש נותן טקסט שאמור להישאר — השתמש ב-keep_by_script (הוא כבר עושה הכל: יישור, הסרת שתיקות ומהססים).
- חובה להריץ transcribe_video פעם אחת לפני כל פעולה מבוססת-טקסט.
- כשהמשתמש מפנה לקטע לפי תוכן ("החלק על X") — השתמש ב-find_in_transcript כדי למצוא את הזמנים, ואז remove_segments.
- אחרי שחישבת חיתוכים, הרץ render_video רק אם המשתמש ביקש לייצא, או שאל אותו (ask_user) אם לייצא.
- כשיש אי-בהירות אמיתית — השתמש ב-ask_user במקום לנחש.
- אל תמציא זמנים; קבל אותם מהכלים.
- הבן מהשפה הטבעית מה המשתמש רוצה ואיך הסרטון הסופי צריך להיראות, ותכנן בעצמך באילו כלים ובאיזה סדר להשתמש.
- אם חסר לך משהו כדי לבצע (למשל התבקשת להוסיף תמונה/סרטון/קובץ שמע שלא סופק) — בקש אותו מהמשתמש ב-ask_user, אל תמציא.
- התמלול נשמר: אם כבר תמללת סרטון, אל תתמלל אותו שוב.

זרימה טיפוסית: transcribe_video → keep_by_script או (find_in_transcript → remove_segments) → render_video.`;
