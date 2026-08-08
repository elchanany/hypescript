"""Evidence-only semantic spans for transcript-backed timeline analysis.

This module deliberately preserves provider labels without inferring acoustic
semantics from missing transcript tokens. A cough, breath, or laugh is only
named when the transcription provider supplied that label.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable, Literal, Optional, Sequence

from .models import Word, is_speech_word


EvidenceKind = Literal["speech", "audio_event", "gap", "energy"]
EvidenceSource = Literal[
    "transcript_word", "provider_audio_event", "explicit_timeline_gap", "measured_rms_dbfs"
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
    source_start: Optional[float] = None
    source_end: Optional[float] = None
    db: Optional[float] = None
    floor_db: Optional[float] = None
    energy_level: Optional[Literal["low", "elevated"]] = None
    confidence: Literal["direct", "measured"] = "direct"


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


def energy_evidence_from_db(
    db_values: Sequence[float],
    *,
    hop: float,
    floor_db: float,
    source_start: float,
    source_end: float,
    timeline_start: float = 0.0,
    source_id: Optional[str] = None,
    window_sec: float = 0.5,
    low_margin_db: float = 6.0,
) -> list[TimelineEvidenceSpan]:
    """Map measured RMS/dBFS windows to a timeline; no sound type is inferred."""
    if hop <= 0 or source_end <= source_start:
        return []
    window_sec = max(0.1, window_sec)
    spans: list[TimelineEvidenceSpan] = []
    cursor = source_start
    while cursor < source_end - 1e-9:
        end = min(source_end, cursor + window_sec)
        first = max(0, int(cursor // hop))
        last = min(len(db_values), math.ceil(end / hop)) if len(db_values) else 0
        values = db_values[first:last]
        db = sum(values) / len(values) if values else floor_db
        level: Literal["low", "elevated"] = "low" if db < floor_db + low_margin_db else "elevated"
        span = TimelineEvidenceSpan(
            kind="energy",
            start=timeline_start + cursor - source_start,
            end=timeline_start + end - source_start,
            source_id=source_id,
            source_start=cursor,
            source_end=end,
            db=db,
            floor_db=floor_db,
            energy_level=level,
            evidence="measured_rms_dbfs",
            confidence="measured",
        )
        previous = spans[-1] if spans else None
        if previous and previous.energy_level == level and abs((previous.source_end or 0) - cursor) < 1e-9:
            previous_duration = previous.end - previous.start
            duration = span.end - span.start
            previous.db = ((previous.db or db) * previous_duration + db * duration) / (previous_duration + duration)
            previous.end = span.end
            previous.source_end = end
        else:
            spans.append(span)
        cursor = end
    return spans
