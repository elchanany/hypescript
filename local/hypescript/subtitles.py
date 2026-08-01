"""יצירת קובץ SRT מסונכרן, על ציר-הזמן של הסרטון *הערוך* (אחרי החיתוכים).

נקודה קריטית לדיוק: אחרי שמסירים קטעים, ציר-הזמן משתנה. הכתוביות חייבות
להשתמש בזמנים החדשים, אחרת הן יזוזו. כאן ממפים כל מילה מהזמן המקורי לזמן
הערוך לפי סכום משכי קטעי ה-keep שלפניה.

טיפול RTL: קובץ UTF-8, וכל שורה מתחילה ב-U+200F (RLM) כדי שפיסוק ומספרים
בקצוות לא יתהפכו.
"""

from __future__ import annotations

import logging
from typing import List, Tuple

from .models import KeepInterval, Word

log = logging.getLogger("hypescript")

RLM = "‏"  # Right-to-Left Mark

Cue = Tuple[float, float, str]  # (start_edited, end_edited, text)


# --------------------------------------------------------------------------- #
# מיפוי זמן מקורי -> זמן ערוך
# --------------------------------------------------------------------------- #
def map_to_edited(t: float, keeps: List[KeepInterval]) -> float:
    """ממפה נקודת זמן מהציר המקורי אל הציר הערוך (אחרי הסרת הקטעים)."""
    elapsed = 0.0
    for iv in keeps:
        if t < iv.start:
            return elapsed  # נפל בתוך קטע שהוסר -> מקובע לתחילת ה-keep הבא
        if t <= iv.end:
            return elapsed + (t - iv.start)
        elapsed += iv.duration
    return elapsed


# --------------------------------------------------------------------------- #
# בניית cues
# --------------------------------------------------------------------------- #
def build_cues(
    words: List[Word],
    keeps: List[KeepInterval],
    *,
    max_chars: int = 42,
    max_lines: int = 2,
    max_gap: float = 0.7,
    max_duration: float = 5.0,
) -> List[Cue]:
    """מקבץ מילים לכתוביות, ושובר לפי אורך תווים, פאוזות וגבולות חיתוך.

    ``max_gap`` נמדד על הציר *המקורי* — פער גדול פירושו פאוזה או חיתוך,
    ולכן פותחים כתובית חדשה (מתאים לשינוי סצנה אחרי חיתוך).
    """
    words = sorted(words, key=lambda w: w.start)
    cues: List[Cue] = []
    budget = max_chars * max_lines

    cur: List[Word] = []
    cur_chars = 0
    prev: Word | None = None

    def flush() -> None:
        if not cur:
            return
        start = map_to_edited(cur[0].start, keeps)
        end = map_to_edited(cur[-1].end, keeps)
        text = _format_cue_text([w.text for w in cur], max_chars, max_lines)
        cues.append((start, end, text))

    for w in words:
        if cur:
            gap = w.start - prev.end  # type: ignore[union-attr]
            new_chars = cur_chars + 1 + len(w.text)
            edited_span = map_to_edited(w.end, keeps) - map_to_edited(cur[0].start, keeps)
            if gap > max_gap or new_chars > budget or edited_span > max_duration:
                flush()
                cur, cur_chars = [], 0
        cur.append(w)
        cur_chars += len(w.text) if cur_chars == 0 else 1 + len(w.text)
        prev = w
        # שבירה מועדפת בסוף משפט (. ? !) כשכבר יש מספיק תוכן — קריא יותר.
        if _ends_sentence(w.text) and cur_chars >= max_chars // 2:
            flush()
            cur, cur_chars = [], 0
    flush()

    log.info("נוצרו %d כתוביות", len(cues))
    return cues


_SENTENCE_END = (".", "?", "!", "׃", "…")


def _ends_sentence(text: str) -> bool:
    return text.rstrip().endswith(_SENTENCE_END)


def _format_cue_text(word_texts: List[str], max_chars: int, max_lines: int) -> str:
    """שובר לשורות (greedy עד max_chars) ומוסיף RLM בתחילת כל שורה."""
    lines: List[str] = []
    cur = ""
    for wt in word_texts:
        candidate = f"{cur} {wt}".strip()
        if not cur or len(candidate) <= max_chars or len(lines) == max_lines - 1:
            cur = candidate
        else:
            lines.append(cur)
            cur = wt
    if cur:
        lines.append(cur)
    return "\n".join(RLM + ln for ln in lines)


# --------------------------------------------------------------------------- #
# כתיבת SRT
# --------------------------------------------------------------------------- #
def format_timestamp(seconds: float) -> str:
    """HH:MM:SS,mmm."""
    if seconds < 0:
        seconds = 0.0
    ms = int(round(seconds * 1000))
    h, ms = divmod(ms, 3_600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(cues: List[Cue], path: str) -> None:
    """כותב קובץ SRT ב-UTF-8. מוודא שכל כתובית נמשכת לפחות 0.5 שנ'."""
    with open(path, "w", encoding="utf-8") as fh:
        for i, (start, end, text) in enumerate(cues, start=1):
            if end <= start:
                end = start + 0.5
            fh.write(f"{i}\n")
            fh.write(f"{format_timestamp(start)} --> {format_timestamp(end)}\n")
            fh.write(f"{text}\n\n")
    log.info("נכתב SRT: %s", path)
