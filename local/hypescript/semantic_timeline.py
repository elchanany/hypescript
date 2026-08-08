"""Evidence-only semantic spans for transcript-backed timeline analysis.

This module deliberately preserves provider labels without inferring acoustic
semantics from missing transcript tokens. A cough, breath, or laugh is only
named when the transcription provider supplied that label.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Literal, Optional

from .models import Word, is_speech_word


EvidenceKind = Literal["speech", "audio_event", "gap"]
EvidenceSource = Literal[
    "transcript_word", "provider_audio_event", "explicit_timeline_gap"
]


@dataclass
class TimelineEvidenceSpan:
    kind: EvidenceKind
    start: float
    end: float
    evidence: EvidenceSource
    text: Optional[str] = None
    source_id: Optional[str] = None
    speaker_id: Optional[str] = None
    confidence: Literal["direct"] = "direct"


def evidence_from_words(
    words: Iterable[Word],
    *,
    source_start: float,
    source_end: float,
    timeline_start: float = 0.0,
    source_id: Optional[str] = None,
    max_speech_gap: float = 0.55,
) -> list[TimelineEvidenceSpan]:
    """Map provider transcript evidence from a source range to timeline time."""
    spans: list[TimelineEvidenceSpan] = []
    ordered = sorted(words, key=lambda word: (word.start, word.end))
    for word in ordered:
        start = max(source_start, word.start)
        end = min(source_end, word.end)
        if end <= start:
            continue
        if word.type == "audio_event":
            kind: EvidenceKind = "audio_event"
            evidence: EvidenceSource = "provider_audio_event"
        elif is_speech_word(word):
            kind = "speech"
            evidence = "transcript_word"
        else:
            continue
        span = TimelineEvidenceSpan(
            kind=kind,
            start=timeline_start + start - source_start,
            end=timeline_start + end - source_start,
            text=word.text,
            source_id=source_id,
            speaker_id=word.speaker_id,
            evidence=evidence,
        )
        previous = spans[-1] if spans else None
        if (
            kind == "speech"
            and previous is not None
            and previous.kind == "speech"
            and previous.source_id == source_id
            and previous.speaker_id == word.speaker_id
            and span.start - previous.end <= max_speech_gap
        ):
            previous.end = max(previous.end, span.end)
            previous.text = " ".join(filter(None, (previous.text, span.text)))
        else:
            spans.append(span)
    return spans


def explicit_gap(start: float, end: float) -> TimelineEvidenceSpan:
    """Represent a gap explicitly inserted into the edit timeline."""
    return TimelineEvidenceSpan(
        kind="gap",
        start=start,
        end=max(start, end),
        text="explicit edit gap",
        evidence="explicit_timeline_gap",
    )
