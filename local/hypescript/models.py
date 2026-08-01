"""מבני נתונים משותפים לכל שלבי ה-pipeline.

חשוב: שני מנועי התמלול (מקומי וענן) מחזירים את אותו ``Transcript`` בדיוק,
כך שכל השלבים שאחריו (הסרת שתיקות, כתוביות, הרכבה) לא יודעים ולא אכפת להם
מאיזה מנוע הגיע התמלול.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List


@dataclass
class Word:
    """מילה בודדת עם חותמות זמן (בשניות, על ציר הזמן המקורי של הווידאו)."""

    text: str
    start: float
    end: float


@dataclass
class Segment:
    """קטע דיבור (משפט/שורה) כפי שהחזיר מנוע התמלול, מכיל את המילים שלו."""

    text: str
    start: float
    end: float
    words: List[Word] = field(default_factory=list)


@dataclass
class Transcript:
    """תמלול מלא של קובץ."""

    language: str
    segments: List[Segment] = field(default_factory=list)

    def all_words(self) -> List[Word]:
        """כל המילים מכל הקטעים, ממוינות לפי זמן התחלה."""
        words: List[Word] = []
        for seg in self.segments:
            words.extend(seg.words)
        words.sort(key=lambda w: w.start)
        return words

    @property
    def text(self) -> str:
        return " ".join(seg.text.strip() for seg in self.segments).strip()


@dataclass
class KeepInterval:
    """קטע שנשמור בעריכה (על ציר הזמן המקורי)."""

    start: float
    end: float

    @property
    def duration(self) -> float:
        return max(0.0, self.end - self.start)
