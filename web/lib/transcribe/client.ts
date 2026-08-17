// Shared client transcription: chunk long audio, POST each piece, merge words.

import { Word } from "@/lib/models";
import {
  mergeWordChunks,
  shiftWords,
  wordsFromProviderPayload,
} from "./chunking";

export interface TranscribeMediaOpts {
  file: File;
  durationSec: number;
  provider?: string;
  model?: string;
  language?: string;
  formExtras?: Record<string, string>;
  signal?: AbortSignal;
  onPhase?: (msg: string) => void;
  onProgress?: (r: number) => void;
}

/** הודעה קריאה לתשובות שלא הגיעו מהראוט שלנו ולכן אינן JSON. */
function httpErrorHe(status: number, body: string, chunkBytes: number): string {
  const mb = (chunkBytes / (1024 * 1024)).toFixed(1);
  if (status === 413 || /request entity too large/i.test(body)) {
    return `קטע האודיו יצא ${mb}MB — מעל מגבלת השרת. זו תקלה בחלוקה לקטעים, לא בקובץ שלך.`;
  }
  if (status === 504 || status === 408) return "שרת התמלול לא הספיק לענות. נסה שוב.";
  if (status === 502 || status === 503) return "שירות התמלול אינו זמין כרגע. נסה שוב בעוד רגע.";
  if (status === 401 || status === 403) return "אין הרשאה לשירות התמלול. התחבר מחדש ונסה שוב.";
  const snippet = body.replace(/\s+/g, " ").trim().slice(0, 120);
  return `התמלול נכשל (שגיאה ${status})${snippet ? `: ${snippet}` : "."}`;
}

export async function transcribeMediaFile(opts: TranscribeMediaOpts): Promise<Word[]> {
  const {
    file, durationSec,
    provider = "auto",
    model = "",
    language = "he",
    formExtras,
    signal,
    onPhase,
    onProgress,
  } = opts;

  const { extractAudioChunks } = await import("@/lib/ffmpeg");
  onPhase?.("מחלץ אודיו…");
  const chunks = await extractAudioChunks(file, durationSec, {
    onProgress,
    onChunk: (i, n) => {
      if (n > 1) onPhase?.(`מחלץ אודיו… חלק ${i + 1}/${n}`);
    },
  });

  const parts: Word[][] = [];
  for (let i = 0; i < chunks.length; i++) {
    const { blob, offset } = chunks[i];
    onPhase?.(chunks.length > 1 ? `מתמלל… חלק ${i + 1}/${chunks.length}` : "מתמלל…");
    onProgress?.(0);

    const fd = new FormData();
    fd.append("file", blob, "audio.mp3");
    fd.append("provider", provider);
    fd.append("model", model);
    fd.append("language", language);
    if (formExtras) {
      for (const [k, v] of Object.entries(formExtras)) fd.append(k, v);
    }

    const local = new AbortController();
    const onAbort = () => local.abort();
    if (signal) {
      if (signal.aborted) throw new Error("התמלול בוטל.");
      signal.addEventListener("abort", onAbort, { once: true });
    }
    const to = setTimeout(() => local.abort(), 180000);

    let data: any;
    try {
      const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: local.signal });
      // לא JSON.parse עיוור: תשובות שנוצרות לפני הראוט (413 מ-Vercel, 504
      // משער) הן טקסט רגיל, וניסיון לפרסר אותן הסתיר את השגיאה האמיתית.
      const body = await resp.text();
      try { data = body ? JSON.parse(body) : null; } catch { data = null; }
      if (!resp.ok) throw new Error(data?.error || httpErrorHe(resp.status, body, blob.size));
      if (!data) throw new Error("שירות התמלול החזיר תשובה ריקה. נסה שוב.");
      if (resp.headers.get("X-Hypescript-Transcription-Quality") === "reduced") {
        onPhase?.("התמלול הושלם במנוע הגיבוי. האיכות עשויה להיות נמוכה יותר; Pro עם מכסה זמינה משתמש ב־ElevenLabs.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        throw new Error(signal?.aborted ? "התמלול בוטל." : "התמלול נתקע (timeout). נסה שוב או קובץ קצר יותר.");
      }
      throw e;
    } finally {
      clearTimeout(to);
      if (signal) signal.removeEventListener("abort", onAbort);
    }
    parts.push(shiftWords(wordsFromProviderPayload(data), offset));
  }

  const merged = mergeWordChunks(parts);
  if (!merged.length) throw new Error("התמלול לא החזיר מילים.");
  return merged;
}
