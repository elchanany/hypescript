// שער קבלה דטרמיניסטי לפני ייצוא.
//
// עד כה בדיקת האיכות בדקה רק אינווריאנטות טכניות: חפיפת זמן-מקור, קליפים לא
// תקינים, מילה שנחתכה. היא *לא* בדקה את הדבר היחיד שהמשתמש באמת ביקש —
// שהסרטון מכיל בדיוק את הטקסט שהוא נתן. לכן היה אפשר לדווח "הצלחה" על פלט
// שחסרות בו מילים.
//
// כאן נבדקים ארבעה דברים יחד: כיסוי הסקריפט, אינווריאנטות הציר, איכות
// נקודות החיתוך (נמדד בגל-קול), ואיכות הכתוביות. הכישלון מפורט, לא בוליאני.

import { isSpeechWord, Word } from "@/lib/models";
import type { Clip } from "@/lib/editor/model";
import { makeToken, tokenizeHebrew } from "@/lib/align/hebrew";
import { alignTokens, summarizeAlignment } from "@/lib/align/globalAlign";
import { EnvelopeProfile, meanDb } from "@/lib/audio/features";
import { auditCaptions, CAPTION_POLICY, type CaptionCue, type CaptionPolicy } from "@/lib/captions/segment";

const RLM = /‏/g;

export interface AuditSubtitle { start: number; end: number; text: string }

export interface EditAuditInput {
  clips: Clip[];
  /** תמלול המקור לפי מזהה. */
  wordsBySource: (sourceId: string) => Word[] | null | undefined;
  /** הטקסט שהמשתמש ביקש שיישאר. בלעדיו לא נבדק כיסוי. */
  scriptText?: string | null;
  subtitles?: AuditSubtitle[] | null;
  /** גל-קול לפי מזהה מקור — בלעדיו איכות החיתוך אינה נמדדת. */
  envelopeBySource?: (sourceId: string) => EnvelopeProfile | null | undefined;
  captionPolicy?: CaptionPolicy;
  /** כמה dB מעל רצפת הרעש עדיין נחשב "חיתוך בשקט". */
  quietMarginDb?: number;
}

export interface ScriptCoverage {
  scriptWords: number;
  keptWords: number;
  matched: number;
  missing: Array<{ text: string; index: number }>;
  /** מילים שנשמעות בפלט ואינן בסקריפט. */
  extra: string[];
  coverage: number;
}

export interface BoundaryQuality {
  index: number;
  sourceOut: number;
  nextSourceIn: number;
  /** dB מעל רצפת הרעש בשני צדי הקאט; null כשאין מדידה. */
  outAboveFloorDb: number | null;
  inAboveFloorDb: number | null;
  clean: boolean;
}

export interface TimelineInvariants {
  clipCount: number;
  durationSec: number;
  repeatedSourceSec: number;
  invalidClips: number;
  clippedWords: string[];
}

export interface EditAudit {
  script: ScriptCoverage | null;
  timeline: TimelineInvariants;
  boundaries: BoundaryQuality[];
  captions: ReturnType<typeof auditCaptions> | null;
  failures: string[];
  warnings: string[];
  pass: boolean;
}

/** המילים שנשמרו בפועל, לפי סדר הציר. */
export function keptWordsOf(
  clips: Clip[],
  wordsBySource: EditAuditInput["wordsBySource"],
): Word[] {
  const out: Word[] = [];
  for (const clip of clips) {
    const words = wordsBySource(clip.sourceId) || [];
    for (const word of words) {
      if (!isSpeechWord(word)) continue;
      const middle = (word.start + word.end) / 2;
      if (middle >= clip.start && middle <= clip.end) out.push(word);
    }
  }
  return out;
}

function subtitleToCue(subtitle: AuditSubtitle, index: number): CaptionCue {
  const lines = subtitle.text.replace(RLM, "").split("\n").map((line) => line.trim()).filter(Boolean);
  return {
    start: subtitle.start,
    end: subtitle.end,
    lines: lines.length ? lines : [""],
    text: subtitle.text,
    tokenFrom: index,
    tokenTo: index + 1,
  };
}

export function auditEdit(input: EditAuditInput): EditAudit {
  const quietMargin = input.quietMarginDb ?? 12;
  const failures: string[] = [];
  const warnings: string[] = [];
  const clips = input.clips || [];

  // ─── אינווריאנטות הציר ─────────────────────────────────────────────────
  let repeatedSourceSec = 0;
  let invalidClips = 0;
  let previous: Clip | null = null;
  for (const clip of clips) {
    if (!Number.isFinite(clip.start) || !Number.isFinite(clip.end) || clip.end <= clip.start) invalidClips++;
    if (previous && previous.sourceId === clip.sourceId && (previous.trackId || "") === (clip.trackId || "")
      && clip.start < previous.end - 1e-6) {
      repeatedSourceSec += Math.max(0, Math.min(previous.end, clip.end) - clip.start);
    }
    previous = clip;
  }
  const clippedWords: string[] = [];
  for (const clip of clips) {
    for (const word of (input.wordsBySource(clip.sourceId) || [])) {
      if (!isSpeechWord(word)) continue;
      const middle = (word.start + word.end) / 2;
      if (middle < clip.start || middle > clip.end) continue;
      if (word.start < clip.start - 0.045 || word.end > clip.end + 0.045) clippedWords.push(word.text);
    }
  }
  const timeline: TimelineInvariants = {
    clipCount: clips.length,
    durationSec: clips.reduce((sum, c) => sum + Math.max(0, c.end - c.start), 0),
    repeatedSourceSec,
    invalidClips,
    clippedWords,
  };
  if (invalidClips) failures.push(`${invalidClips} קליפים לא תקינים.`);
  if (repeatedSourceSec > 1e-6) failures.push(`חזרה על ${repeatedSourceSec.toFixed(3)}s זמן-מקור — הצופה ישמע הברה פעמיים.`);
  if (clippedWords.length) {
    failures.push(`${clippedWords.length} מילים נחתכות באמצע: ${clippedWords.slice(0, 6).join(", ")}.`);
  }

  // ─── כיסוי הסקריפט ──────────────────────────────────────────────────────
  const kept = keptWordsOf(clips, input.wordsBySource);
  let script: ScriptCoverage | null = null;
  const scriptText = (input.scriptText || "").trim();
  if (scriptText) {
    const scriptTokens = tokenizeHebrew(scriptText);
    const keptTokens = kept.map((w) => makeToken(w.text));
    const report = summarizeAlignment(
      alignTokens(keptTokens, scriptTokens),
      scriptTokens.length,
      { asr: keptTokens, script: scriptTokens },
    );
    script = {
      scriptWords: scriptTokens.length,
      keptWords: keptTokens.length,
      matched: report.matchedScript.length,
      missing: report.missingScript.map((i) => ({ text: scriptTokens[i]?.raw ?? "", index: i })),
      extra: report.droppedAsr.map((i) => keptTokens[i]?.raw ?? "").filter(Boolean),
      coverage: report.coverage,
    };
    if (script.missing.length) {
      failures.push(
        `חסרות ${script.missing.length} מילים מהטקסט שביקשת: ${script.missing.slice(0, 8).map((m) => m.text).join(", ")}.`,
      );
    }
    if (script.extra.length > Math.max(2, scriptTokens.length * 0.05)) {
      warnings.push(`נשמעות ${script.extra.length} מילים שאינן בטקסט: ${script.extra.slice(0, 6).join(", ")}.`);
    }
  }

  // ─── איכות נקודות החיתוך ────────────────────────────────────────────────
  const boundaries: BoundaryQuality[] = [];
  for (let i = 0; i < clips.length - 1; i++) {
    const current = clips[i];
    const next = clips[i + 1];
    if (next.sourceId !== current.sourceId) continue;
    const envelope = input.envelopeBySource?.(current.sourceId) ?? null;
    let outAboveFloorDb: number | null = null;
    let inAboveFloorDb: number | null = null;
    if (envelope) {
      const floor = envelope.globalFloorDb;
      // הצד הנזרק של כל קאט חייב להיות שקט; הצד הנשמר הוא דיבור וזה תקין
      outAboveFloorDb = meanDb(envelope, current.end, Math.min(envelope.duration, current.end + 0.07)) - floor;
      inAboveFloorDb = meanDb(envelope, Math.max(0, next.start - 0.07), next.start) - floor;
    }
    const clean = outAboveFloorDb == null
      || (outAboveFloorDb <= quietMargin && (inAboveFloorDb ?? 0) <= quietMargin);
    boundaries.push({
      index: i + 1,
      sourceOut: current.end,
      nextSourceIn: next.start,
      outAboveFloorDb,
      inAboveFloorDb,
      clean,
    });
  }
  const noisyCuts = boundaries.filter((b) => !b.clean);
  if (noisyCuts.length) {
    warnings.push(
      `${noisyCuts.length} מעברים אינם נופלים בשקט מלא (${noisyCuts.slice(0, 4).map((b) => `#${b.index}`).join(", ")}) — ייתכן קאט שנשמע חד.`,
    );
  }

  // ─── כתוביות ────────────────────────────────────────────────────────────
  let captions: EditAudit["captions"] = null;
  if (input.subtitles?.length) {
    captions = auditCaptions(input.subtitles.map(subtitleToCue), input.captionPolicy ?? CAPTION_POLICY);
    if (captions.repeatedWordPairs) {
      failures.push(`${captions.repeatedWordPairs} כתוביות חוזרות על מילים מהכתובית הקודמת.`);
    }
    if (captions.overlaps.length) failures.push(`כתוביות חופפות בזמן: ${captions.overlaps.slice(0, 6).join(", ")}.`);
    if (captions.tooFast.length) warnings.push(`כתוביות מהירות מכדי לקרוא: ${captions.tooFast.slice(0, 6).join(", ")}.`);
    if (captions.longLines.length) warnings.push(`שורות ארוכות מדי: ${captions.longLines.slice(0, 6).join(", ")}.`);
    if (captions.orphans.length) warnings.push(`כתוביות של מילה בודדת: ${captions.orphans.slice(0, 6).join(", ")}.`);
  }

  if (!clips.length) failures.push("אין קליפים בציר.");

  return { script, timeline, boundaries, captions, failures, warnings, pass: failures.length === 0 };
}

/** דוח קריא לצ'אט — קצר כשהכל תקין, מפורט כשלא. */
export function formatAudit(audit: EditAudit): string {
  const lines: string[] = [];
  lines.push(`ציר: ${audit.timeline.clipCount} קליפים, ${audit.timeline.durationSec.toFixed(1)}s.`);
  if (audit.script) {
    lines.push(
      `כיסוי הטקסט: ${audit.script.matched}/${audit.script.scriptWords} מילים (${(audit.script.coverage * 100).toFixed(1)}%).`,
    );
  }
  const measured = audit.boundaries.filter((b) => b.outAboveFloorDb != null);
  if (measured.length) {
    const cleanCount = measured.filter((b) => b.clean).length;
    lines.push(`מעברים: ${cleanCount}/${measured.length} נופלים בשקט מדוד.`);
  } else if (audit.boundaries.length) {
    lines.push(`מעברים: ${audit.boundaries.length} (בלי מדידת גל-קול).`);
  }
  if (audit.captions) {
    lines.push(
      `כתוביות: ${audit.captions.count}, חזרות מילים ${audit.captions.repeatedWordPairs}, חפיפות ${audit.captions.overlaps.length}.`,
    );
  }
  if (audit.failures.length) lines.push("", "כשלים:", ...audit.failures.map((f) => `• ${f}`));
  if (audit.warnings.length) lines.push("", "אזהרות:", ...audit.warnings.map((w) => `• ${w}`));
  if (audit.pass && !audit.warnings.length) lines.push("", "עבר את כל הבדיקות.");
  return lines.join("\n");
}
