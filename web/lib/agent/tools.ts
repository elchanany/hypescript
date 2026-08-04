// כלי הסוכן (צד-לקוח). מודל EDL: הסוכן והמשתמש עורכים את אותה רשימת קליפים.
// כל פעולת עריכה = כלי, כך שהמשתמש רואה כל שינוי חי על הציר.

import { isSpeechWord, Word } from "@/lib/models";
import { normalizeHebrew } from "@/lib/align";
import { TRANSCRIBE_MODEL_PREF, TRANSCRIBE_PREF } from "@/lib/keys";
import {
  defaultModelFor,
  resolveTranscribeProvider,
  type TranscribeProviderId,
  type TranscribeProviderPref,
} from "@/lib/elevenlabs/prefs";
import { DEFAULT_STT_MODEL, DEFAULT_TTS_MODEL } from "@/lib/elevenlabs/constants";
import {
  addClip, assembledToSource, Clip, clipDur, firstVideo, MediaAsset, mediaById, moveClip, splitClip, totalDur, trimClip, uid,
} from "@/lib/editor/model";
import { Overlay, makeTextOverlay } from "@/lib/editor/overlay";
import { isGapClip, removeClipLeaveGap, removeClipRipple, closeGap } from "@/lib/editor/timelineOps";
import { CanvasSize, defaultCanvasFor } from "@/lib/editor/canvasCoords";
import { scriptToClips } from "@/lib/editor/scriptClips";
import { deleteClipRange, deleteClipsAt, intersectClipsWithSpeech, keepSourceRange } from "@/lib/editor/clipFilter";
import { edlToSubs, edlToSubsWithScript, parseSrt, Sub, subsToSrt } from "@/lib/editor/subtitlesEdl";
import { analyzeAudio, avgDb, findSilences } from "@/lib/audio";
import { ToolSchema } from "./types";

export interface AgentContext {
  media: MediaAsset[];
  duration: number; // משך המקור הראשי
  words: Word[] | null; // התמלול של המקור הראשי (תאימות)
  transcripts: Record<string, Word[]>; // תמלול לכל מקור לפי id (מולטי-וידאו)
  clips: Clip[] | null;
  subs: Sub[] | null;
  overlays: Overlay[];
  canvas: CanvasSize;
  lastRender: Blob | null;
  askUser: (question: string, options: string[]) => Promise<string>;
  // מוציא קובץ תוצר לצ'אט (קישור הורדה + תצוגה מקדימה).
  onOutput?: (blob: Blob, name: string, kind: "video" | "srt" | "image" | "audio") => void;
  // תמונות שהסוכן צילם — יצורפו להודעה הבאה כדי שיוכל "לראות" אותן (בספק תומך-ראייה).
  pendingImages?: string[];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

// התמלול של מקור מסוים (מהמפה, או של הראשי מ-words).
function transcriptOf(ctx: AgentContext, asset: MediaAsset): Word[] | null {
  return ctx.transcripts[asset.id] || (asset.id === mainVideo(ctx)?.id ? ctx.words : null) || null;
}

// המקור הראשי (הסרטון הראשון) — עליו מתמללים וחותכים לפי סקריפט כברירת מחדל.
const mainVideo = (ctx: AgentContext) => firstVideo(ctx.media);
// איתור מקור לפי אינדקס (1-based) או שם. חשוב: אם הערך מספרי טהור — קודם אינדקס,
// ולא חיפוש-שם (שמות הקבצים מכילים ספרות מתאריך, אחרת "3" היה תופס שם שגוי).
function resolveAsset(ctx: AgentContext, ref: string | number): MediaAsset | undefined {
  if (typeof ref === "number") return ctx.media[ref - 1];
  const s = String(ref).replace(/^@/, "").trim();
  if (/^\d+$/.test(s)) return ctx.media[parseInt(s, 10) - 1];
  const low = s.toLowerCase();
  return ctx.media.find((m) => m.name.toLowerCase().includes(low));
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

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) return "—";
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
};

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

async function fetchTranscribeConfigured(): Promise<{ elevenlabs: boolean; groq: boolean }> {
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    return {
      elevenlabs: !!cfg?.transcription?.elevenlabs,
      groq: !!cfg?.transcription?.groq,
    };
  } catch {
    return { elevenlabs: false, groq: false };
  }
}

function readTranscribePref(): TranscribeProviderPref {
  try {
    const v = localStorage.getItem(TRANSCRIBE_PREF) as TranscribeProviderPref | null;
    if (v === "elevenlabs" || v === "groq" || v === "auto") return v;
  } catch { /* ignore */ }
  return "auto";
}

function readTranscribeModelPref(): string {
  try { return (localStorage.getItem(TRANSCRIBE_MODEL_PREF) || "").trim(); } catch { return ""; }
}

async function resolveSttChoice(
  providerArg?: string,
  modelArg?: string,
): Promise<{ provider: TranscribeProviderId; model: string }> {
  const configured = await fetchTranscribeConfigured();
  const prefRaw = String(providerArg || readTranscribePref() || "auto").toLowerCase();
  const pref: TranscribeProviderPref =
    prefRaw === "elevenlabs" || prefRaw === "groq" || prefRaw === "auto" ? prefRaw : "auto";
  const provider = resolveTranscribeProvider(pref, configured);
  if (!provider) {
    throw new Error(
      "אין ספק תמלול מוגדר. הוסף ELEVENLABS_API_KEY ו/או GROQ_API_KEY ב-Vercel או ב-web/.env.local.",
    );
  }
  const model =
    String(modelArg || "").trim() ||
    readTranscribeModelPref() ||
    defaultModelFor(provider) ||
    (provider === "elevenlabs" ? DEFAULT_STT_MODEL : "whisper-large-v3");
  return { provider, model };
}

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
    schema: {
      name: "transcribe_video",
      description:
        "מתמלל סרטון ובונה מפת נקודות-ציון (מילים+זמנים). ספקים: elevenlabs (Scribe — מומלץ, בתשלום; אירועי שמע/צחוק/דוברים) או groq (Whisper). " +
        "אפשר לבחור model במפורש (למשל scribe_v2 / whisper-large-v3). אם יש כמה סרטונים — תמלל כל אחד (עם source).",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string", description: "שם/אינדקס הסרטון לתמלול (ברירת מחדל: הראשי)" },
          provider: { type: "string", description: "elevenlabs | groq | auto (ברירת מחדל לפי הגדרות)" },
          model: { type: "string", description: "מודל תמלול (למשל scribe_v2 / scribe_v1 / whisper-large-v3)" },
          force: { type: "boolean", description: "true=התעלם מתמלול שמור ותמלל מחדש" },
          tag_audio_events: { type: "boolean", description: "ElevenLabs: סמן צחוק/מוזיקה וכו' (ברירת מחדל true)" },
          diarize: { type: "boolean", description: "ElevenLabs: הפרדת דוברים (ברירת מחדל true)" },
          num_speakers: { type: "number", description: "ElevenLabs: מספר דוברים ידוע (משפר הפרדה)" },
          keyterms: { type: "string", description: "ElevenLabs: מונחים חשובים מופרדים בפסיק (שמות/מונחים תורניים)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "שגיאה: לא נמצא סרטון לתמלול.";
      if (!a.force && ctx.transcripts[asset.id]) {
        const n = ctx.transcripts[asset.id].filter(isSpeechWord).length;
        return `"${asset.name}" כבר תומלל (${n} מילים). להחלפה: force=true.`;
      }
      const isMain = asset.id === mainVideo(ctx)?.id;
      const key = txKey(asset.file);
      if (!a.force) {
        const cached = txRead(key);
        if (cached) {
          ctx.transcripts[asset.id] = cached;
          if (isMain) { ctx.words = cached; if (!ctx.duration) ctx.duration = asset.duration; }
          return `נטען תמלול שמור ל-"${asset.name}" (${cached.filter(isSpeechWord).length} מילים).`;
        }
      }
      let extractAudio: typeof import("@/lib/ffmpeg").extractAudio;
      try { ({ extractAudio } = await import("@/lib/ffmpeg")); }
      catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) ואז הרץ תמלול שוב. אל תנסה שוב בלי רענון."); }

      const { provider, model } = await resolveSttChoice(a.provider, a.model);
      report(`מחלץ אודיו מ-${asset.name}…`);
      const audio = await extractAudio(asset.file);
      report(`שולח לתמלול (${provider} / ${model})…`);
      const fd = new FormData();
      fd.append("file", audio, "audio.mp3");
      fd.append("provider", provider);
      fd.append("model", model);
      fd.append("language", "he");
      if (provider === "elevenlabs") {
        if (a.tag_audio_events === false) fd.append("tag_audio_events", "false");
        if (a.diarize === false) fd.append("diarize", "false");
        if (a.num_speakers != null) fd.append("num_speakers", String(a.num_speakers));
        if (a.keyterms) fd.append("keyterms", String(a.keyterms));
      }
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 180000);
      let data: any;
      try {
        const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: ctrl.signal });
        data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "התמלול נכשל.");
      } catch (e: any) {
        throw new Error(e?.name === "AbortError" ? "התמלול נתקע (timeout). נסה שוב או קובץ קצר יותר." : (e?.message || "התמלול נכשל."));
      } finally { clearTimeout(to); }
      const words: Word[] = (data.words || [])
        .filter((w: any) => w.start != null && w.end != null && (w.word || w.text))
        .map((w: any) => {
          const text = String(w.word || w.text).trim();
          const out: Word = { text, start: +w.start, end: +w.end };
          const type = w.type as Word["type"] | undefined;
          if (type === "word" || type === "spacing" || type === "audio_event") out.type = type;
          else if (/^\[[^\]]+\]$/.test(text)) out.type = "audio_event";
          if (w.speaker_id) out.speakerId = String(w.speaker_id);
          return out;
        });
      if (!words.length) throw new Error("התמלול לא החזיר מילים.");
      ctx.transcripts[asset.id] = words;
      if (isMain) { ctx.words = words; if (!ctx.duration) ctx.duration = asset.duration; }
      txWrite(key, words);
      const speech = words.filter(isSpeechWord).length;
      const events = words.filter((w) => w.type === "audio_event").length;
      const speakers = new Set(words.map((w) => w.speakerId).filter(Boolean));
      const extras = [
        events ? `${events} אירועי-שמע` : "",
        speakers.size ? `${speakers.size} דוברים` : "",
      ].filter(Boolean).join(", ");
      return `תומלל "${asset.name}" ב-${provider}/${model}: ${speech} מילים${extras ? ` (+ ${extras})` : ""} (נשמר).`;
    },
  },
  {
    name: "find_in_transcript", label: "איתור בתמלול", color: "#14b8a6", icon: "🔍",
    schema: { name: "find_in_transcript", description: "מאתר היכן טקסט נאמר ומחזיר טווחי-זמן (שניות במקור).", parameters: { type: "object", properties: { query: { type: "string" }, source: { type: "string", description: "סרטון המקור (ברירת מחדל הראשי)" } }, required: ["query"] } },
    run: async (a, ctx) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "שגיאה: אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}".`;
      const r = findRanges(words, String(a.query || ""));
      return r.length ? "נמצא:\n" + r.map((x) => `• ${x.start.toFixed(2)}–${x.end.toFixed(2)}s: "${x.text}"`).join("\n") : `לא נמצא "${a.query}".`;
    },
  },
  {
    name: "get_transcript", label: "קריאת תמלול", color: "#14b8a6", icon: "📄",
    schema: { name: "get_transcript", description: "מחזיר את התמלול המלא עם חותמות זמן (בשניות) לכל שורה — כדי להבין תוכן ולדעת בדיוק מתי כל דבר נאמר, לצורך חיתוך מדויק. השתמש בזה כדי לקרוא מה נאמר ומתי.", parameters: { type: "object", properties: { source: { type: "string", description: "סרטון (ברירת מחדל הראשי)" } } } },
    run: async (a, ctx) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `"${asset.name}" עדיין לא תומלל.`;
      const events = words.filter((w) => w.type === "audio_event");
      const speech = words.filter(isSpeechWord);
      // מקבצים לשורות עם חותמת זמן [start–end], כך שהמודל רואה גם תוכן וגם תזמון מדויק.
      const lines: string[] = [];
      let cur: Word[] = [];
      const flush = () => { if (cur.length) { lines.push(`[${cur[0].start.toFixed(1)}–${cur[cur.length - 1].end.toFixed(1)}s] ${cur.map((w) => w.text).join(" ")}`); cur = []; } };
      for (const w of speech) { if (cur.length && (w.start - cur[cur.length - 1].end > 0.8 || cur.length >= 12)) flush(); cur.push(w); }
      flush();
      const eventLines = events.slice(0, 40).map((e) => `• ${e.start.toFixed(1)}–${e.end.toFixed(1)}s ${e.text}${e.speakerId ? ` (${e.speakerId})` : ""}`);
      return `תמלול "${asset.name}" (${speech.length} מילים, עם חותמות זמן בשניות):\n${lines.join("\n")}` +
        (eventLines.length ? `\n\nאירועי שמע (${events.length}):\n${eventLines.join("\n")}` : "");
    },
  },
  {
    name: "analyze_audio", label: "ניתוח אודיו", color: "#0891b2", icon: "🔊",
    schema: { name: "analyze_audio", description: "מנתח את עוצמת הסאונד (dB) ומסווג את הרווחים בין המילים: שקט/נשימה מול רעש (שיעול/כסא/רקע). כדי להחליט מה לחתוך לפי עוצמה, לא רק לפי טקסט.", parameters: { type: "object", properties: { source: { type: "string", description: "סרטון (ברירת מחדל הראשי)" } } } },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}".`;
      report("מנתח עוצמת סאונד…");
      const prof = await analyzeAudio(asset.file);
      const gaps: Array<[number, number]> = [];
      let prev = 0;
      for (const w of words) { if (w.start - prev > 0.25) gaps.push([prev, w.start]); prev = w.end; }
      if (asset.duration - prev > 0.25) gaps.push([prev, asset.duration]);
      const quiet = prof.floorDb + 6;
      const lines = gaps.slice(0, 40).map(([s, e]) => {
        const d = avgDb(prof, s, e);
        return `• ${s.toFixed(1)}–${e.toFixed(1)}s (${(e - s).toFixed(1)}s): ${d < quiet ? "שקט/נשימה" : "רעש/קול-רקע (אולי שיעול/כסא)"} [${d.toFixed(0)}dB]`;
      });
      return `ניתוח אודיו "${asset.name}" (רצפת רעש ${prof.floorDb.toFixed(0)}dB, שיא ${prof.peakDb.toFixed(0)}dB):\n${lines.join("\n")}\n(שקט=נשימה/שתיקה לחיתוך; עם עוצמה=ייתכן רעש. השתמש ב-remove_silence לחיתוך אוטומטי לפי עוצמה.)`;
    },
  },
  {
    name: "remove_silence", label: "הסרת שתיקות (עוצמה)", color: "#f59e0b", icon: "🤫",
    schema: {
      name: "remove_silence",
      description: "מסיר נשימות/שתיקות לפי עוצמת סאונד. חשוב: אם כבר יש קליפים מ-keep_by_script — ברירת המחדל היא within_existing=true (חותך שתיקות *בתוך* הבחירה בלבד, לא מחליף את כל ה-EDL בסרטון המלא). replace_all=true מחליף את כל הציר.",
      parameters: {
        type: "object",
        properties: {
          source: { type: "string" },
          threshold_db: { type: "number", description: "סף עוצמה (dB). ברירת מחדל: רצפת-רעש+8" },
          min_silence: { type: "number", description: "אורך שקט מינימלי לחיתוך (שנ'), ברירת מחדל 0.35" },
          padding: { type: "number", description: "ריפוד בכל צד (שנ'), ברירת מחדל 0.08" },
          within_existing: { type: "boolean", description: "true=חתוך רק בתוך הקליפים הקיימים (מומלץ אחרי keep_by_script)" },
          replace_all: { type: "boolean", description: "true=החלף את כל ה-EDL בקטעי דיבור מכל הסרטון (זהיר — מוחק בחירה קודמת)" },
        },
      },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset || asset.kind !== "video") return "אין סרטון.";
      report("מנתח עוצמת סאונד…");
      const prof = await analyzeAudio(asset.file);
      const padding = a.padding != null ? +a.padding : 0.08;
      const thr = a.threshold_db != null ? +a.threshold_db : prof.floorDb + 8;
      const sil = findSilences(prof, thr, a.min_silence != null ? +a.min_silence : 0.35);
      const dur = asset.duration;
      const raw: Array<[number, number]> = [];
      let prev = 0;
      for (const [s, e] of sil) { if (s - prev > 0.05) raw.push([prev, s]); prev = e; }
      if (dur - prev > 0.05) raw.push([prev, dur]);
      if (!raw.length) return "לא זוהו קטעי דיבור מעל הסף.";
      const padded = raw.map(([s, e]) => ({ start: Math.max(0, s - padding), end: Math.min(dur, e + padding) }));
      const speech: Clip[] = [{ id: uid(), sourceId: asset.id, start: padded[0].start, end: padded[0].end }];
      for (const k of padded.slice(1)) {
        const last = speech[speech.length - 1];
        if (k.start <= last.end + 1e-3) last.end = Math.max(last.end, k.end);
        else speech.push({ id: uid(), sourceId: asset.id, start: k.start, end: k.end });
      }
      const hasEdl = !!(ctx.clips && ctx.clips.length);
      const replaceAll = a.replace_all === true;
      const within = a.within_existing === true || (!replaceAll && hasEdl && a.within_existing !== false);
      let merged: Clip[];
      if (within && hasEdl) {
        merged = intersectClipsWithSpeech(ctx.clips!, speech, asset.id);
        if (!merged.length) return "לא נשאר דיבור בתוך הקליפים הקיימים. בדוק טווחים או הרץ עם replace_all=true בזהירות.";
        ctx.clips = merged;
        return `הוסרו שתיקות *בתוך הבחירה הקיימת* מ-"${asset.name}" (סף ${thr.toFixed(0)}dB). ${clipsSummary(merged)}`;
      }
      merged = speech;
      ctx.clips = merged;
      const removed = dur - merged.reduce((s, k) => s + (k.end - k.start), 0);
      return `הוסרו שתיקות/נשימות לפי עוצמה מ-"${asset.name}" (סף ${thr.toFixed(0)}dB): ${merged.length} קטעי דיבור, הוסרו ${removed.toFixed(1)}s. ${clipsSummary(merged)}`;
    },
  },
  {
    name: "capture_frame", label: "צילום פריים", color: "#06b6d4", icon: "📸",
    schema: {
      name: "capture_frame",
      description: "מצלם פריים בשנייה מדויקת — כדי לבדוק איך נראה הווידאו בנקודה מסוימת. מקור: סרטון ספציפי (source) או הציר הערוך (timeline=true). התמונה מוצגת בצ'אט, ואם הספק תומך בראייה — תוכל לנתח אותה בתור הבא.",
      parameters: { type: "object", properties: { at_seconds: { type: "number", description: "השנייה לצילום" }, source: { type: "string", description: "סרטון מקור (אופציונלי)" }, timeline: { type: "boolean", description: "true = השנייה על הציר הערוך (assembled), לא על המקור" } }, required: ["at_seconds"] },
    },
    run: async (a, ctx) => {
      let asset: MediaAsset | undefined;
      let srcTime = +a.at_seconds;
      if (a.timeline && ctx.clips?.length) {
        const { index, source } = assembledToSource(ctx.clips, +a.at_seconds);
        asset = index >= 0 ? mediaById(ctx.media, ctx.clips[index].sourceId) : undefined;
        srcTime = source;
      } else {
        asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      }
      if (!asset || asset.kind !== "video") return "אין סרטון לצילום.";
      const { extractFrame } = await import("@/lib/ffmpeg");
      const blob = await extractFrame(asset.file, srcTime);
      ctx.onOutput?.(blob, `frame_${srcTime.toFixed(1)}s.png`, "image");
      try { ctx.pendingImages?.push(await blobToDataUrl(blob)); } catch { /* ignore */ }
      return `צולם פריים מ-"${asset.name}" בשנייה ${srcTime.toFixed(1)} (מוצג בצ'אט). אם הספק תומך בראייה — אנתח אותו בתור הבא.`;
    },
  },
  {
    name: "keep_by_script", label: "חיתוך לפי סקריפט", color: "#f59e0b", icon: "✂️",
    schema: {
      name: "keep_by_script",
      description: "בונה קליפים מסרטון לפי טקסט, בדיוק בסדר הטקסט (כולל חזרות). לריבוי סרטונים: קרא פעם לכל סרטון עם source ו-append=true כדי להרכיב רצף אחד מכמה מקורות.",
      parameters: { type: "object", properties: { script: { type: "string", description: "הטקסט שאמור להישאר, בסדר הרצוי" }, source: { type: "string", description: "סרטון המקור (ברירת מחדל הראשי)" }, append: { type: "boolean", description: "להוסיף לרצף הקיים במקום להחליף (להרכבה מכמה סרטונים)" } }, required: ["script"] },
    },
    run: async (a, ctx, report) => {
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      if (!asset) return "שגיאה: אין סרטון.";
      const words = transcriptOf(ctx, asset);
      if (!words) return `צריך לתמלל קודם את "${asset.name}" (transcribe_video source="${asset.name}").`;
      report(`מיישר סקריפט ל-"${asset.name}"…`);
      const clips = scriptToClips(words, String(a.script || ""), asset.id);
      if (!clips.length) return `לא נמצאו התאמות ב-"${asset.name}".`;
      ctx.clips = a.append ? [...(ctx.clips || []), ...clips] : clips;
      return `${a.append ? "נוספו" : "נבנו"} קליפים מ-"${asset.name}". ${clipsSummary(ctx.clips)}`;
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
    schema: { name: "list_clips", description: "מחזיר את רשימת הקליפים הנוכחית (אינדקס 1-based, טווח מקור, משך). רווחים מסומנים כ-[רווח].", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      return ctx.clips!.map((c, i) => {
        const en = c.enabled === false ? " (מושבת)" : "";
        if (isGapClip(c)) return `${i + 1}. [רווח] ${clipDur(c).toFixed(2)}s`;
        const name = mediaById(ctx.media, c.sourceId)?.name || c.sourceId;
        return `${i + 1}. ${name} ${c.start.toFixed(2)}–${c.end.toFixed(2)}s (${clipDur(c).toFixed(2)}s)${en}`;
      }).join("\n");
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
    schema: {
      name: "trim_clip",
      description: "משנה את גבולות המקור של קליפ (start ו/או end בשניות במקור). אפשר להעביר רק end או רק start.",
      parameters: { type: "object", properties: { index: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      const asset = mediaById(ctx.media, c.sourceId);
      const maxDur = asset?.duration || ctx.duration || c.end;
      const start = a.start != null && a.start !== "" ? +a.start : c.start;
      const end = a.end != null && a.end !== "" ? +a.end : c.end;
      if (!Number.isFinite(start) || !Number.isFinite(end)) return "שגיאה: start/end לא תקינים.";
      ctx.clips = trimClip(ctx.clips!, c.id, start, end, maxDur);
      const after = ctx.clips!.find((x) => x.id === c.id);
      if (!after || !Number.isFinite(after.start) || !Number.isFinite(after.end)) return "שגיאה: הטרים נכשל (גבולות לא תקינים).";
      return `טורם קליפ ${a.index | 0} ל-${after.start.toFixed(2)}–${after.end.toFixed(2)}s. ${clipsSummary(ctx.clips!)}`;
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
    schema: {
      name: "delete_clip",
      description: "מוחק קליפ בודד. leave_gap=true משאיר רווח שחור/שקט. למחיקת רבים — delete_clips / keep_source_range (לא בלולאה).",
      parameters: { type: "object", properties: { index: { type: "number" }, leave_gap: { type: "boolean", description: "השאר רווח במקום הקליפ" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const c = ctx.clips![(a.index | 0) - 1]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) ctx.clips = closeGap(ctx.clips!, c.id);
      else if (a.leave_gap) ctx.clips = removeClipLeaveGap(ctx.clips!, c.id);
      else ctx.clips = removeClipRipple(ctx.clips!, c.id);
      return `עודכן. ${ctx.clips!.length ? clipsSummary(ctx.clips!) : "אין קליפים."}`;
    },
  },
  {
    name: "set_clip_enabled", label: "הפעל/השבת קטע", color: "#64748b", icon: "👁️",
    schema: {
      name: "set_clip_enabled",
      description: "מפעיל או משבית קליפ (מושבת = לא נכלל בנגן ובייצוא).",
      parameters: { type: "object", properties: { index: { type: "number" }, enabled: { type: "boolean" } }, required: ["index", "enabled"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const c = ctx.clips![i]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) return "לא ניתן להשבית רווח — מחק/סגור אותו.";
      ctx.clips = ctx.clips!.map((x, k) => (k === i ? { ...x, enabled: !!a.enabled } : x));
      return `קטע ${a.index}: ${a.enabled ? "פעיל" : "מושבת"}.`;
    },
  },
  {
    name: "set_clip_volume", label: "עוצמת קטע", color: "#64748b", icon: "🔊",
    schema: {
      name: "set_clip_volume",
      description: "קובע עוצמת שמע לקליפ (0..2, ברירת מחדל 1).",
      parameters: { type: "object", properties: { index: { type: "number" }, volume: { type: "number" } }, required: ["index", "volume"] },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const i = (a.index | 0) - 1; const c = ctx.clips![i]; if (!c) return "אינדקס לא תקין.";
      if (isGapClip(c)) return "לרווח אין עוצמה.";
      const volume = Math.max(0, Math.min(2, +a.volume));
      ctx.clips = ctx.clips!.map((x, k) => (k === i ? { ...x, volume } : x));
      return `עוצמת קטע ${a.index}: ${Math.round(volume * 100)}%.`;
    },
  },
  {
    name: "list_overlays", label: "רשימת שכבות", color: "#64748b", icon: "🧩",
    schema: { name: "list_overlays", description: "מחזיר את שכבות התמונה/טקסט על הקנבס.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const ovs = ctx.overlays || [];
      if (!ovs.length) return "אין שכבות.";
      return ovs.map((o, i) => {
        const label = o.kind === "text" ? (o.text || "טקסט") : (mediaById(ctx.media, o.assetId || "")?.name || "תמונה");
        return `${i + 1}. [${o.kind}] ${label} ${o.start.toFixed(1)}–${o.end.toFixed(1)}s @(${Math.round(o.transform.x)},${Math.round(o.transform.y)})`;
      }).join("\n");
    },
  },
  {
    name: "add_text_overlay", label: "הוספת טקסט", color: "#f59e0b", icon: "Ｔ",
    schema: {
      name: "add_text_overlay",
      description: "מוסיף שכבת טקסט על הקנבס בזמן ראש-הנגן (או start נתון).",
      parameters: { type: "object", properties: { text: { type: "string" }, start: { type: "number" }, end: { type: "number" } } },
    },
    run: async (a, ctx) => {
      const canvas = ctx.canvas || defaultCanvasFor();
      const start = a.start != null ? +a.start : 0;
      const end = a.end != null ? +a.end : Math.max(start + 4, totalDur(ctx.clips || []) || 4);
      const o = makeTextOverlay(canvas.width, canvas.height, ctx.overlays || [], String(a.text || "טקסט חדש"), start, end);
      ctx.overlays = [...(ctx.overlays || []), o];
      return `נוספה שכבת טקסט (${o.id}). סה״כ ${ctx.overlays.length} שכבות.`;
    },
  },
  {
    name: "delete_overlay", label: "מחיקת שכבה", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "delete_overlay",
      description: "מוחק שכבה לפי אינדקס 1-based מ-list_overlays.",
      parameters: { type: "object", properties: { index: { type: "number" } }, required: ["index"] },
    },
    run: async (a, ctx) => {
      const ovs = ctx.overlays || [];
      const i = (a.index | 0) - 1;
      if (!ovs[i]) return "אינדקס שכבה לא תקין.";
      ctx.overlays = ovs.filter((_, k) => k !== i);
      return `שכבה נמחקה. נותרו ${ctx.overlays.length}.`;
    },
  },
  {
    name: "update_overlay", label: "עדכון שכבה", color: "#f59e0b", icon: "✏️",
    schema: {
      name: "update_overlay",
      description: "מעדכן שכבה (טקסט/זמן/מיקום/גודל/סיבוב/שקיפות).",
      parameters: {
        type: "object",
        properties: {
          index: { type: "number" }, text: { type: "string" }, start: { type: "number" }, end: { type: "number" },
          x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" },
          rotation: { type: "number" }, opacity: { type: "number" },
        },
        required: ["index"],
      },
    },
    run: async (a, ctx) => {
      const ovs = ctx.overlays || [];
      const i = (a.index | 0) - 1;
      const o = ovs[i]; if (!o) return "אינדקס שכבה לא תקין.";
      const t = { ...o.transform };
      if (a.x != null) t.x = +a.x;
      if (a.y != null) t.y = +a.y;
      if (a.w != null) t.w = Math.max(8, +a.w);
      if (a.h != null) t.h = Math.max(8, +a.h);
      if (a.rotation != null) t.rotation = +a.rotation;
      if (a.opacity != null) t.opacity = Math.max(0, Math.min(1, +a.opacity));
      const patch: Partial<Overlay> = { transform: t };
      if (a.text != null) patch.text = String(a.text);
      if (a.start != null) patch.start = Math.max(0, +a.start);
      if (a.end != null) patch.end = Math.max((patch.start ?? o.start) + 0.05, +a.end);
      ctx.overlays = ovs.map((x, k) => (k === i ? { ...x, ...patch, transform: t } : x));
      return `שכבה ${a.index} עודכנה.`;
    },
  },
  {
    name: "delete_clips", label: "מחיקת קליפים", color: "#ef4444", icon: "🗑️",
    schema: {
      name: "delete_clips",
      description: "מוחק כמה קליפים בבת אחת. העבר indices=[16,17,18] או from_index+to_index (כולל). חובה במקום לולאת delete_clip.",
      parameters: {
        type: "object",
        properties: {
          indices: { type: "array", items: { type: "number" }, description: "אינדקסים 1-based למחיקה" },
          from_index: { type: "number", description: "תחילת טווח (1-based, כולל)" },
          to_index: { type: "number", description: "סוף טווח (1-based, כולל)" },
        },
      },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const before = ctx.clips!.length;
      if (Array.isArray(a.indices) && a.indices.length) {
        ctx.clips = deleteClipsAt(ctx.clips!, a.indices.map((x: any) => +x));
      } else if (a.from_index != null && a.to_index != null) {
        ctx.clips = deleteClipRange(ctx.clips!, +a.from_index, +a.to_index);
      } else {
        return "שגיאה: העבר indices או from_index+to_index.";
      }
      const n = before - ctx.clips!.length;
      return n ? `נמחקו ${n} קליפים. ${ctx.clips!.length ? clipsSummary(ctx.clips!) : "אין קליפים."}` : "לא נמחק כלום (אינדקסים לא תקינים?).";
    },
  },
  {
    name: "keep_source_range", label: "שמירת טווח מקור", color: "#f59e0b", icon: "🎯",
    schema: {
      name: "keep_source_range",
      description: "משאיר רק קליפים שחופפים לטווח זמן במקור [start,end] ומקצץ גבולות. שימושי אחרי remove_silence על כל הסרטון — במקום למחוק עשרות קליפים.",
      parameters: {
        type: "object",
        properties: {
          start: { type: "number", description: "התחלה בשניות במקור" },
          end: { type: "number", description: "סוף בשניות במקור" },
          source: { type: "string", description: "מקור (ברירת מחדל הראשי)" },
        },
        required: ["start", "end"],
      },
    },
    run: async (a, ctx) => {
      const err = requireClips(ctx); if (err) return err;
      const asset = a.source ? resolveAsset(ctx, a.source) : mainVideo(ctx);
      const start = +a.start; const end = +a.end;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "שגיאה: טווח לא תקין.";
      ctx.clips = keepSourceRange(ctx.clips!, start, end, asset?.id);
      return ctx.clips.length
        ? `נשמר טווח ${start.toFixed(1)}–${end.toFixed(1)}s. ${clipsSummary(ctx.clips)}`
        : "לא נשאר קליפ בטווח.";
    },
  },
  {
    name: "clear_clips", label: "ניקוי כל הקליפים", color: "#ef4444", icon: "🧹",
    schema: { name: "clear_clips", description: "מוחק את כל הקליפים בבת אחת (לאתחול EDL).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      const n = ctx.clips?.length || 0;
      ctx.clips = [];
      return `נוקו ${n} קליפים.`;
    },
  },
  {
    name: "render_video", label: "ייצוא הווידאו", color: "#22c55e", icon: "🎬",
    schema: { name: "render_video", description: "מרנדר ומייצא את הסרטון הסופי לפי הקליפים (בסדר). הרץ בסוף.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx, report) => {
      if (!ctx.media.length) return "שגיאה: לא נטען סרטון.";
      const err = requireClips(ctx); if (err) return err;
      let renderEDL: typeof import("@/lib/ffmpeg").renderEDL;
      try { ({ renderEDL } = await import("@/lib/ffmpeg")); }
      catch { throw new Error("נפרסה גרסה חדשה של האפליקציה — רענן את הדף (Ctrl+Shift+R) והרץ ייצוא שוב."); }
      const secs = ctx.clips!.reduce((s, c) => s + (c.end - c.start), 0);
      report(secs > 90 ? `מרנדר ${Math.round(secs)}s בדפדפן — ייקח זמן…` : "מרנדר בדפדפן…");
      const blob = await renderEDL(
        ctx.media, ctx.clips!,
        (r) => report(`מרנדר… ${Math.min(100, Math.round(r * 100))}%`),
        undefined,
        { overlays: ctx.overlays || [], canvas: ctx.canvas || defaultCanvasFor() },
      );
      ctx.lastRender = blob;
      const base = (mainVideo(ctx)?.name || "video").replace(/\.[^.]+$/, "");
      ctx.onOutput?.(blob, `${base}_edited.mp4`, "video");
      return `הייצוא הושלם — קישור להורדה ותצוגה מקדימה בצ'אט.`;
    },
  },
  {
    name: "generate_subtitles", label: "יצירת כתוביות", color: "#8b5cf6", icon: "💬",
    schema: {
      name: "generate_subtitles",
      description: "מייצר כתוביות על הציר. אם המשתמש נתן טקסט נקי — חובה להעביר אותו ב-script כדי לתקן שיבושי ASR (לא להשאיר מילים משובשות כמו 'טיפרת'/'קשר'). בלי script משתמש בתמלול הגולמי.",
      parameters: {
        type: "object",
        properties: {
          max_chars: { type: "number", description: "מקס תווים בשורה (ברירת מחדל 42)" },
          script: { type: "string", description: "טקסט נקי מהמשתמש — מומלץ מאוד; מתקן כתיב ומחליף זבל ASR" },
        },
      },
    },
    run: async (a, ctx) => {
      if (!ctx.words && !Object.keys(ctx.transcripts || {}).length) return "שגיאה: צריך לתמלל קודם (transcribe_video).";
      const main = mainVideo(ctx);
      const clips = ctx.clips?.length ? ctx.clips : main ? [{ id: uid(), sourceId: main.id, start: 0, end: ctx.duration || main.duration }] : [];
      if (!clips.length) return "אין תוכן ליצירת כתוביות.";
      const getWords = (sid: string) => ctx.transcripts[sid] ?? (sid === main?.id ? ctx.words : null);
      const max = (a.max_chars | 0) || 42;
      const script = String(a.script || "").trim();
      ctx.subs = script
        ? edlToSubsWithScript(clips, getWords, script, max)
        : edlToSubs(clips, getWords, max);
      return script
        ? `נוצרו ${ctx.subs.length} כתוביות לפי הסקריפט הנקי (תזמון מהתמלול, טקסט מתוקן). בדוק list_subtitles ותקן אם צריך.`
        : `נוצרו ${ctx.subs.length} כתוביות מהתמלול הגולמי. אם יש טקסט נקי מהמשתמש — הרץ שוב עם script=... כדי לתקן שיבושי ASR.`;
    },
  },
  {
    name: "list_subtitles", label: "רשימת כתוביות", color: "#8b5cf6", icon: "📃",
    schema: { name: "list_subtitles", description: "מחזיר את הכתוביות (אינדקס 1-based, זמן, טקסט).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => ctx.subs?.length ? ctx.subs.map((s, i) => `${i + 1}. [${s.start.toFixed(1)}–${s.end.toFixed(1)}] ${s.text}`).join("\n") : "אין כתוביות. הרץ generate_subtitles.",
  },
  {
    name: "edit_subtitle", label: "עריכת כתובית", color: "#a855f7", icon: "✏️",
    schema: { name: "edit_subtitle", description: "משנה את הטקסט של כתובית מסוימת (לקיצור/תיקון/ניסוח).", parameters: { type: "object", properties: { index: { type: "number", description: "מספר הכתובית (1-based)" }, text: { type: "string" } }, required: ["index", "text"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      ctx.subs = ctx.subs.map((s, k) => (k === i ? { ...s, text: String(a.text) } : s));
      return `כתובית ${i + 1} עודכנה: "${a.text}"`;
    },
  },
  {
    name: "retime_subtitle", label: "תזמון כתובית", color: "#a855f7", icon: "⏲️",
    schema: { name: "retime_subtitle", description: "משנה את זמני ההופעה של כתובית (start/end בשניות על הציר הסופי).", parameters: { type: "object", properties: { index: { type: "number" }, start: { type: "number" }, end: { type: "number" } }, required: ["index", "start", "end"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      ctx.subs = ctx.subs.map((s, k) => (k === i ? { ...s, start: +a.start, end: Math.max(+a.start + 0.2, +a.end) } : s));
      return `תוזמנה כתובית ${i + 1}.`;
    },
  },
  {
    name: "delete_subtitle", label: "מחיקת כתובית", color: "#ef4444", icon: "🗑️",
    schema: { name: "delete_subtitle", description: "מוחק כתובית.", parameters: { type: "object", properties: { index: { type: "number" } }, required: ["index"] } },
    run: async (a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות.";
      const i = (a.index | 0) - 1; if (!ctx.subs[i]) return "אינדקס לא תקין.";
      ctx.subs = ctx.subs.filter((_, k) => k !== i);
      return `נמחקה כתובית ${i + 1}. נשארו ${ctx.subs.length}.`;
    },
  },
  {
    name: "clear_subtitles", label: "מחיקת כל הכתוביות", color: "#ef4444", icon: "🧹",
    schema: { name: "clear_subtitles", description: "מוחק את כל הכתוביות בבת אחת (השתמש בזה במקום למחוק אחת-אחת).", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => { const n = ctx.subs?.length || 0; ctx.subs = []; return `נמחקו כל ${n} הכתוביות.`; },
  },
  {
    name: "export_srt", label: "ייצוא SRT", color: "#8b5cf6", icon: "⬇️",
    schema: { name: "export_srt", description: "מייצא את הכתוביות הנוכחיות כקובץ SRT (לא צרוב) — קישור בצ'אט.", parameters: { type: "object", properties: {} } },
    run: async (_a, ctx) => {
      if (!ctx.subs?.length) return "אין כתוביות. הרץ generate_subtitles.";
      const name = (mainVideo(ctx)?.name.replace(/\.[^.]+$/, "") || "subs") + ".srt";
      ctx.onOutput?.(new Blob([subsToSrt(ctx.subs)], { type: "text/plain;charset=utf-8" }), name, "srt");
      return `יוצא SRT (${ctx.subs.length} כתוביות) — קישור להורדה בצ'אט.`;
    },
  },
  {
    name: "import_srt", label: "ייבוא SRT", color: "#8b5cf6", icon: "📥",
    schema: { name: "import_srt", description: "טוען כתוביות מתוכן SRT שהמשתמש הדביק.", parameters: { type: "object", properties: { content: { type: "string", description: "תוכן קובץ ה-SRT" } }, required: ["content"] } },
    run: async (a, ctx) => {
      const subs = parseSrt(String(a.content || ""));
      if (!subs.length) return "לא זוהו כתוביות בתוכן.";
      ctx.subs = subs;
      return `יובאו ${subs.length} כתוביות. אפשר לערוך/לייצא.`;
    },
  },
  {
    name: "list_stt_models", label: "מודלי תמלול", color: "#8b5cf6", icon: "🧬",
    schema: {
      name: "list_stt_models",
      description: "מציג מודלי תמלול זמינים (ElevenLabs Scribe וכו') ואת ברירת המחדל הנוכחית. השתמש כשהמשתמש מבקש מודל אחר או לשאול מה אפשרי.",
      parameters: { type: "object", properties: {} },
    },
    run: async () => {
      const configured = await fetchTranscribeConfigured();
      const pref = readTranscribePref();
      const resolved = resolveTranscribeProvider(pref, configured);
      const modelPref = readTranscribeModelPref();
      let stt: Array<{ id: string; name: string; descriptionHe?: string; description?: string }> = [];
      try {
        const data = await fetch("/api/elevenlabs/models").then((r) => r.json());
        stt = data.stt || [];
      } catch { /* ignore */ }
      const lines = stt.map((m) => `• ${m.id} — ${m.name}${m.descriptionHe || m.description ? `: ${m.descriptionHe || m.description}` : ""}`);
      return [
        `העדפת תמלול: ${pref}${resolved ? ` → בפועל ${resolved}` : " (אין מפתח)"}`,
        `מודל מועדף: ${modelPref || "(ברירת מחדל לספק)"}`,
        `Groq: ${configured.groq ? "מוכן" : "חסר מפתח"} · ElevenLabs: ${configured.elevenlabs ? "מוכן" : "חסר מפתח"}`,
        "",
        "מודלי STT (ElevenLabs):",
        lines.length ? lines.join("\n") : "• scribe_v2 (ברירת מחדל)\n• scribe_v1",
        "",
        "Groq: whisper-large-v3",
        "לבחירה: transcribe_video(provider=..., model=...) או שנה בהגדרות.",
      ].join("\n");
    },
  },
  {
    name: "list_voices", label: "קולות קריינות", color: "#a855f7", icon: "🎙️",
    schema: {
      name: "list_voices",
      description: "מציג קולות ElevenLabs זמינים (שם, voice_id, קטגוריה, תיאור) כדי שהמשתמש/הסוכן יבחרו קול לקריינות. דורש ELEVENLABS_API_KEY.",
      parameters: {
        type: "object",
        properties: {
          search: { type: "string", description: "סינון לפי שם/תיאור" },
          limit: { type: "number", description: "כמה קולות להציג (ברירת מחדל 20)" },
        },
      },
    },
    run: async (a) => {
      const qs = new URLSearchParams({ page_size: String(Math.min(50, Math.max(1, +(a.limit || 20)))) });
      if (a.search) qs.set("search", String(a.search));
      const resp = await fetch(`/api/elevenlabs/voices?${qs}`);
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "נכשל בטעינת קולות.");
      const voices = data.voices || [];
      if (!voices.length) return "לא נמצאו קולות. ודא שיש ELEVENLABS_API_KEY ושהמפתח כולל Voices: Read.";
      return `קולות ElevenLabs (${voices.length}${data.has_more ? "+" : ""}):\n` +
        voices.map((v: any, i: number) => {
          const labels = v.labels && typeof v.labels === "object"
            ? Object.entries(v.labels).map(([k, val]) => `${k}=${val}`).join(", ")
            : "";
          return `${i + 1}. ${v.name} · id=${v.voice_id}${v.category ? ` · ${v.category}` : ""}${labels ? ` · ${labels}` : ""}${v.description ? `\n   ${String(v.description).slice(0, 120)}` : ""}`;
        }).join("\n") +
        "\n\nלקריינות: generate_narration(text=..., voice_id=...).";
    },
  },
  {
    name: "generate_narration", label: "יצירת קריינות", color: "#a855f7", icon: "🗣️",
    schema: {
      name: "generate_narration",
      description:
        "יוצר קריינות מדויקת בעברית מטקסט דרך ElevenLabs TTS. " +
        "אם אין voice_id — קרא קודם list_voices והצג למשתמש אפשרויות (ask_user), או בחר קול מתאים. " +
        "מודלים: eleven_v3 (רגשי, תגיות [laughs]/[whispers]), eleven_multilingual_v2 (ארוך/יציב), eleven_flash_v2_5 (מהיר).",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "הטקסט לקריינות" },
          voice_id: { type: "string", description: "מזהה הקול מ-list_voices" },
          model_id: { type: "string", description: "מודל TTS (ברירת מחדל eleven_v3)" },
          language_code: { type: "string", description: "קוד שפה (ברירת מחדל he)" },
          stability: { type: "number" },
          similarity_boost: { type: "number" },
          style: { type: "number" },
        },
        required: ["text", "voice_id"],
      },
    },
    run: async (a, ctx, report) => {
      const text = String(a.text || "").trim();
      const voiceId = String(a.voice_id || "").trim();
      if (!text) return "שגיאה: חסר טקסט.";
      if (!voiceId) return "שגיאה: חסר voice_id. הרץ list_voices ובחר קול.";
      report("יוצר קריינות ב-ElevenLabs…");
      const resp = await fetch("/api/elevenlabs/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice_id: voiceId,
          model_id: a.model_id || DEFAULT_TTS_MODEL,
          language_code: a.language_code || "he",
          stability: a.stability,
          similarity_boost: a.similarity_boost,
          style: a.style,
        }),
      });
      if (!resp.ok) {
        let err = "יצירת הקריינות נכשלה.";
        try { err = (await resp.json()).error || err; } catch { /* ignore */ }
        throw new Error(err);
      }
      const blob = await resp.blob();
      const modelId = resp.headers.get("X-Model-Id") || a.model_id || DEFAULT_TTS_MODEL;
      const name = `narration_${voiceId.slice(0, 8)}.mp3`;
      const file = new File([blob], name, { type: blob.type || "audio/mpeg" });
      const url = URL.createObjectURL(file);
      // משך משוער — נטען אסינכרונית אם אפשר
      let duration = 0;
      try {
        duration = await new Promise<number>((resolve, reject) => {
          const audio = new Audio();
          audio.preload = "metadata";
          audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
          audio.onerror = () => reject(new Error("meta"));
          audio.src = url;
        });
      } catch { /* ignore */ }
      const asset = {
        id: uid("a"),
        name,
        kind: "audio" as const,
        file,
        duration: duration || Math.max(1, text.length / 12),
        url,
      };
      ctx.media.push(asset);
      ctx.onOutput?.(blob, name, "audio");
      download(blob, name);
      return `נוצרה קריינות (${(blob.size / 1024).toFixed(0)}KB, מודל ${modelId}, voice=${voiceId}) ונוספה למדיה כפריט #${ctx.media.length}. אפשר להוסיף לציר עם add_clip.`;
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

מודל: הסרטון הסופי הוא רשימת "קליפים" מסודרת (EDL). כל קליפ מצביע על טווח במקור. הסדר ברשימה = הסדר בסרטון הסופי.

מדיה: יכולים להיות כמה סרטונים (list_media). להרכבה מכמה מקורות — תמלל כל אחד (transcribe_video+source), ואז keep_by_script עם append=true או add_clip.

═══ תמלול וקריינות (ElevenLabs / Groq) ═══
- ספקי תמלול: elevenlabs (Scribe — מומלץ לדיוק בעברית, חותמות-מילה, צחוק/אירועי שמע, הפרדת דוברים) או groq (Whisper).
- ברירת מחדל: לפי הגדרות (auto מעדיף ElevenLabs אם המפתח קיים). המשתמש יכול לבקש מודל ספציפי — העבר model= (למשל scribe_v2 / scribe_v1 / whisper-large-v3) או provider=.
- list_stt_models: מה זמין ומה ברירת המחדל. אל תקבע מודל שלא קיים.
- לתמלול תורני: אפשר keyterms עם שמות/מונחים. אל תפעיל no_verbatim כשרוצים לשמור צחוק/נשימות כאירועים.
- get_transcript מציג גם אירועי שמע אם יש (מ-ElevenLabs).
- קריינות: list_voices → הצג למשתמש ובחר (ask_user אם לא ברור) → generate_narration(text, voice_id). מודלי TTS: eleven_v3 (רגשי+תגיות), eleven_multilingual_v2 (ארוך), eleven_flash_v2_5 (מהיר).
- המפתח ELEVENLABS_API_KEY בשרת בלבד — לעולם אל תבקש מהמשתמש להדביק מפתח בצ'אט.

═══ חוקי ברזל (אל תשבור) ═══
1. ענה בעברית, קצר. משפט-שניים ואז פעולה. אסור כתיבת מסות התלבטות.
2. אל תמחק קליפים בלולאה. אם צריך להסיר רבים: delete_clips (indices או from_index+to_index) או keep_source_range או clear_clips. מעל 3 מחיקות בודדות = אתה עושה את זה לא נכון.
3. remove_silence אחרי keep_by_script: תמיד within_existing (ברירת מחדל כשיש EDL). אסור replace_all אחרי בחירה לפי סקריפט — זה מוחק את העבודה.
4. סדר מומלץ כשיש טקסט מהמשתמש: transcribe_video → keep_by_script(script=הטקסט הנקי) → remove_silence (within_existing) → generate_subtitles(script=אותו טקסט נקי) → list_subtitles ובדיקה → render בסוף.
5. תמלול ASR משובש לעיתים (שמות, מילים נדירות). הטקסט שהמשתמש כתב הוא מקור האמת לכתוביות ולחיתוך. לעולם אל תשאיר בכתוביות מילים מוזרות/משובשות מה-ASR אם יש סקריפט נקי — העבר script ל-generate_subtitles.
6. אחרי get_transcript / list_subtitles: אם אתה רואה שיבושי כתיב או מילים חסרות-היגיון מול הסקריפט — תקן (generate_subtitles עם script, או edit_subtitle). אל תתעלם.
7. שגיאת "Loading chunk … failed": בקש מהמשתמש לרענן את הדף (Ctrl+Shift+R). אל תנסה שוב ושוב בלי רענון.
8. אל תקרא את אותו תמלול פעמיים. אל תריץ list_clips אחרי כל פעולה קטנה. תכנן פעם אחת ובצע.
9. אם keep_by_script מחזיר קליפ "קופץ" לזמן רחוק/לא רלוונטי — תקן עם keep_source_range או trim_clip / delete_clips, לא עם עשרות מחיקות.
10. חסר נכס (תמונה/סאונד שהמשתמש אמר שיביא אחר כך) — ask_user או ציין שתחכה; אל תמציא ואל תיתקע.
11. קריינות/תמלול בתשלום: אל תריץ generate_narration או תמלול חוזר מיותר בלי צורך. אם חסר מפתח — הסבר להגדיר ELEVENLABS_API_KEY בהגדרות/Vercel.

כלים חשובים:
- keep_by_script: כשיש טקסט שישאר. בונה לפי סדר הטקסט.
- remove_silence: נשימות/שתיקות לפי עוצמה. within_existing כשיש כבר EDL.
- keep_source_range(start,end): השאר רק טווח מקור (במקום למחוק 70 קליפים).
- delete_clips / clear_clips: מחיקות המוניות.
- trim_clip: אפשר רק start או רק end.
- generate_subtitles עם script=טקסט נקי מהמשתמש.
- clear_subtitles למחיקת כל הכתוביות (לא בלולאה).
- list_voices / generate_narration / list_stt_models / transcribe_video(provider,model).
- render_video רק בסוף / כשמבקשים.

זרימה טיפוסית: transcribe → keep_by_script → remove_silence(within) → generate_subtitles(script) → render.`;

// תוספת הנחיה לפי מצב הסוכן. באחריות ה-runtime לא להעביר כלים כלל ב-ask/plan,
// כך שגם אם המודל "ירצה" לשנות — אין לו במה. ההנחיה מיישרת את ההתנהגות.
export const MODE_PROMPTS: Record<import("./types").AgentMode, string> = {
  ask: `\n\nמצב נוכחי: ASK (קריאה בלבד). אין לך כלים במצב זה ואינך יכול לשנות את הפרויקט. ענה על שאלות, הסבר את הפרויקט/התמלול/הציר, והצע צעדים. אם המשתמש מבקש לבצע עריכה — הסבר בקצרה מה צריך לעשות והצע לעבור למצב Act.`,
  plan: `\n\nמצב נוכחי: PLAN (תכנון בלבד). אין לך כלים ואינך משנה דבר. החזר תוכנית עריכה קצרה וברורה: מה יישאר, מה יימחק, אילו קטעים/כתוביות/נכסים יושפעו, משך צפוי, ואילו החלטות דורשות אישור. אל תטען שביצעת — רק תכנן. בסיום הצע למשתמש לאשר ולעבור ל-Act.`,
  act: ``,
};
