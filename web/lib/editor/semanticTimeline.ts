import { isSpeechWord, type Word } from "@/lib/models";
import { assembledStart, clipDur, clipEnabled, type Clip } from "./model";
import { isGapClip } from "./timelineOps";
import type { WordsBySource } from "./assembleTranscript";
import { avgDb, type EnergyProfile } from "@/lib/audio";

export type TimelineEvidenceKind = "speech" | "audio_event" | "gap" | "energy";
export type TimelineEvidenceSource = "transcript_word" | "provider_audio_event" | "explicit_timeline_gap" | "measured_rms_dbfs";

export interface TimelineEvidenceSpan {
  kind: TimelineEvidenceKind;
  start: number;
  end: number;
  text?: string;
  sourceId?: string;
  speakerId?: string;
  sourceStart?: number;
  sourceEnd?: number;
  db?: number;
  floorDb?: number;
  energyLevel?: "low" | "elevated";
  evidence: TimelineEvidenceSource;
  confidence: "direct" | "measured";
}

export interface TimelineEvidenceOpts {
  /** Merge adjacent speech tokens into readable spans, without crossing events/gaps. */
  maxSpeechGap?: number;
}

export interface TimelineEnergyOpts {
  windowSec?: number;
  lowMarginDb?: number;
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

/** Map RMS/dBFS measurements into assembled time without assigning sound semantics. */
export function buildTimelineEnergyEvidence(
  clips: Clip[],
  getProfile: (sourceId: string) => EnergyProfile | null | undefined,
  opts: TimelineEnergyOpts = {},
): TimelineEvidenceSpan[] {
  const active = clips.filter(clipEnabled);
  const windowSec = Math.max(0.1, opts.windowSec ?? 0.5);
  const lowMarginDb = opts.lowMarginDb ?? 6;
  const out: TimelineEvidenceSpan[] = [];
  for (let index = 0; index < active.length; index++) {
    const clip = active[index];
    if (isGapClip(clip)) continue;
    const profile = getProfile(clip.sourceId);
    if (!profile) continue;
    const base = assembledStart(active, index);
    for (let sourceStart = clip.start; sourceStart < clip.end - 1e-6; sourceStart += windowSec) {
      const sourceEnd = Math.min(clip.end, sourceStart + windowSec);
      const db = avgDb(profile, sourceStart, sourceEnd);
      const energyLevel = db < profile.floorDb + lowMarginDb ? "low" : "elevated";
      const span: TimelineEvidenceSpan = {
        kind: "energy",
        start: base + sourceStart - clip.start,
        end: base + sourceEnd - clip.start,
        sourceId: clip.sourceId,
        sourceStart,
        sourceEnd,
        db,
        floorDb: profile.floorDb,
        energyLevel,
        evidence: "measured_rms_dbfs",
        confidence: "measured",
      };
      const previous = out[out.length - 1];
      const contiguousSource = previous?.sourceEnd != null && Math.abs(previous.sourceEnd - sourceStart) < 1e-6;
      if (previous?.kind === "energy" && previous.sourceId === span.sourceId && previous.energyLevel === energyLevel && contiguousSource) {
        const previousDuration = previous.end - previous.start;
        const spanDuration = span.end - span.start;
        previous.db = (((previous.db ?? db) * previousDuration) + db * spanDuration) / (previousDuration + spanDuration);
        previous.end = span.end;
        previous.sourceEnd = sourceEnd;
      } else {
        out.push(span);
      }
    }
  }
  return out;
}

export function evidenceCounts(spans: TimelineEvidenceSpan[]) {
  return spans.reduce((counts, span) => {
    counts[span.kind] += 1;
    return counts;
  }, { speech: 0, audio_event: 0, gap: 0, energy: 0 } as Record<TimelineEvidenceKind, number>);
}
