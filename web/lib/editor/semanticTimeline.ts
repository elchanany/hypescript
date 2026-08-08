import { isSpeechWord, type Word } from "@/lib/models";
import { assembledStart, clipDur, clipEnabled, type Clip } from "./model";
import { isGapClip } from "./timelineOps";
import type { WordsBySource } from "./assembleTranscript";

export type TimelineEvidenceKind = "speech" | "audio_event" | "gap";
export type TimelineEvidenceSource = "transcript_word" | "provider_audio_event" | "explicit_timeline_gap";

export interface TimelineEvidenceSpan {
  kind: TimelineEvidenceKind;
  start: number;
  end: number;
  text?: string;
  sourceId?: string;
  speakerId?: string;
  evidence: TimelineEvidenceSource;
  confidence: "direct";
}

export interface TimelineEvidenceOpts {
  /** Merge adjacent speech tokens into readable spans, without crossing events/gaps. */
  maxSpeechGap?: number;
}

function tokenSpan(word: Word, clip: Clip, base: number): TimelineEvidenceSpan | null {
  const sourceStart = Math.max(clip.start, word.start);
  const sourceEnd = Math.min(clip.end, word.end);
  if (sourceEnd <= sourceStart) return null;
  const common = {
    start: base + (sourceStart - clip.start),
    end: base + (sourceEnd - clip.start),
    text: word.text,
    sourceId: clip.sourceId,
    speakerId: word.speakerId,
    confidence: "direct" as const,
  };
  if (word.type === "audio_event") {
    return { ...common, kind: "audio_event", evidence: "provider_audio_event" };
  }
  if (isSpeechWord(word)) return { ...common, kind: "speech", evidence: "transcript_word" };
  return null;
}

/**
 * Builds an evidence-only timeline. Audio-event labels are kept verbatim from the
 * provider; explicit edit gaps are represented as gaps. Absence of transcript
 * tokens is deliberately not classified as silence, breath, cough, or laughter.
 */
export function buildTimelineEvidence(
  clips: Clip[],
  getWords: WordsBySource,
  opts: TimelineEvidenceOpts = {},
): TimelineEvidenceSpan[] {
  const active = clips.filter(clipEnabled);
  const raw: TimelineEvidenceSpan[] = [];
  for (let i = 0; i < active.length; i++) {
    const clip = active[i];
    const base = assembledStart(active, i);
    if (isGapClip(clip)) {
      raw.push({
        kind: "gap",
        start: base,
        end: base + clipDur(clip),
        text: "פער עריכה מפורש",
        evidence: "explicit_timeline_gap",
        confidence: "direct",
      });
      continue;
    }
    const words = [...(getWords(clip.sourceId) || [])]
      .filter((word) => word.end > clip.start && word.start < clip.end)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    for (const word of words) {
      const span = tokenSpan(word, clip, base);
      if (span) raw.push(span);
    }
  }
  raw.sort((a, b) => a.start - b.start || a.end - b.end || a.kind.localeCompare(b.kind));

  const maxSpeechGap = opts.maxSpeechGap ?? 0.55;
  const merged: TimelineEvidenceSpan[] = [];
  for (const span of raw) {
    const prev = merged[merged.length - 1];
    if (
      span.kind === "speech" && prev?.kind === "speech"
      && span.sourceId === prev.sourceId && span.speakerId === prev.speakerId
      && span.start - prev.end <= maxSpeechGap
    ) {
      prev.end = Math.max(prev.end, span.end);
      prev.text = [prev.text, span.text].filter(Boolean).join(" ");
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

export function evidenceCounts(spans: TimelineEvidenceSpan[]) {
  return spans.reduce((counts, span) => {
    counts[span.kind] += 1;
    return counts;
  }, { speech: 0, audio_event: 0, gap: 0 } as Record<TimelineEvidenceKind, number>);
}
