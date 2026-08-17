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

    let data: any = null;
    let lastError: Error | null = null;
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const local = new AbortController();
      const onAbort = () => local.abort();
      if (signal) {
        if (signal.aborted) throw new Error("התמלול בוטל.");
        signal.addEventListener("abort", onAbort, { once: true });
      }
      const to = setTimeout(() => local.abort(), 25000);

      try {
        if (attempt > 1) {
          onPhase?.(chunks.length > 1 ? `מתמלל שוב חלק ${i + 1}/${chunks.length}…` : "מתמלל שוב…");
          await new Promise((r) => setTimeout(r, 1200));
        }
        const resp = await fetch("/api/transcribe", { method: "POST", body: fd, signal: local.signal });
        const body = await resp.text();
        try { data = body ? JSON.parse(body) : null; } catch { data = null; }
        if (!resp.ok) throw new Error(data?.error || httpErrorHe(resp.status, body, blob.size));
        if (!data) throw new Error("שירות התמלול החזיר תשובה ריקה. נסה שוב.");
        if (resp.headers.get("X-Hypescript-Transcription-Quality") === "reduced") {
          onPhase?.("התמלול הושלם במנוע הגיבוי. האיכות עשויה להיות נמוכה יותר; Pro עם מכסה זמינה משתמש ב־ElevenLabs.");
        }
        lastError = null;
        break;
      } catch (e: any) {
        if (signal?.aborted) throw new Error("התמלול בוטל.");
        if (e?.name === "AbortError") {
          lastError = new Error("התמלול נתקע (timeout). נסה שוב או קובץ קצר יותר.");
        } else {
          lastError = e instanceof Error ? e : new Error(String(e));
        }
        if (attempt === maxAttempts) throw lastError;
      } finally {
        clearTimeout(to);
        if (signal) signal.removeEventListener("abort", onAbort);
      }
    }
    if (!data) throw (lastError || new Error("התמלול נכשל. נסה שוב."));
    parts.push(shiftWords(wordsFromProviderPayload(data), offset));
  }

  const merged = mergeWordChunks(parts);
  if (!merged.length) throw new Error("התמלול לא החזיר מילים.");
  return merged;
}
