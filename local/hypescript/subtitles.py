"""יצירת קובץ SRT מסונכרן, על ציר-הזמן של הסרטון *הערוך* (אחרי החיתוכים).

נקודה קריטית לדיוק: אחרי שמסירים קטעים, ציר-הזמן משתנה. הכתוביות חייבות
להשתמש בזמנים החדשים, אחרת הן יזוזו. כאן ממפים כל מילה מהזמן המקורי לזמן
הערוך לפי סכום משכי קטעי ה-keep שלפניה.

טיפול RTL: קובץ UTF-8, וכל שורה מתחילה ב-U+200F (RLM) כדי שפיסוק ומספרים
בקצוות לא יתהפכו.

ברירת מחדל (mode=progressive): חשיפה מצטברת לפי קצב הדיבור — מילה נוספת
מופיעה כשהיא נאמרת, עם שבירת ביטוי בפאוזה/פיסוק. לא בלוק מילים מראש.
"""

from __future__ import annotations

import logging
import re
from typing import List, Literal, Tuple

from .models import KeepInterval, Word, is_speech_word

log = logging.getLogger("hypescript")

RLM = "‏"  # Right-to-Left Mark

Cue = Tuple[float, float, str]  # (start_edited, end_edited, text)
CaptionMode = Literal["progressive", "phrase"]

_SENTENCE_END = (".", "?", "!", "׃", "…")
_PHRASE_END_RE = re.compile(r"[.?!…׃:,،;]$")


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


def _ends_sentence(text: str) -> bool:
    return text.rstrip().endswith(_SENTENCE_END)


def _ends_phrase(text: str) -> bool:
    return bool(_PHRASE_END_RE.search(text.rstrip()))


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


def _to_edited(words: List[Word], keeps: List[KeepInterval]) -> List[Tuple[str, float, float]]:
    out: List[Tuple[str, float, float]] = []
    for w in sorted((x for x in words if is_speech_word(x)), key=lambda x: x.start):
        out.append((w.text, map_to_edited(w.start, keeps), map_to_edited(w.end, keeps)))
    return out


def _split_phrases(
    words: List[Tuple[str, float, float]],
    max_chars: int,
    max_gap: float,
) -> List[List[Tuple[str, float, float]]]:
    phrases: List[List[Tuple[str, float, float]]] = []
    cur: List[Tuple[str, float, float]] = []
    chars = 0
    for text, start, end in words:
        gap = (start - cur[-1][2]) if cur else 0.0
        over = bool(cur) and chars + 1 + len(text) > max_chars
        if cur and (gap > max_gap or _ends_phrase(cur[-1][0]) or over):
            phrases.append(cur)
            cur, chars = [], 0
        cur.append((text, start, end))
        chars += (1 if chars else 0) + len(text)
    if cur:
        phrases.append(cur)
    return _rebalance_soft_orphans(phrases, max_chars, max_gap)


def _phrase_chars(words: List[Tuple[str, float, float]]) -> int:
    return sum(len(word[0]) for word in words) + max(0, len(words) - 1)


def _rebalance_soft_orphans(
    phrases: List[List[Tuple[str, float, float]]],
    max_chars: int,
    max_gap: float,
) -> List[List[Tuple[str, float, float]]]:
    """Balance a one-word budget orphan without crossing semantic boundaries."""
    out = [list(phrase) for phrase in phrases]
    for index in range(1, len(out)):
        previous, current = out[index - 1], out[index]
        if len(current) != 1 or len(previous) < 3:
            continue
        boundary_gap = current[0][1] - previous[-1][2]
        if boundary_gap > max_gap or _ends_phrase(previous[-1][0]):
            continue
        shorter_previous = previous[:-1]
        fuller_current = [previous[-1], *current]
        if (
            _phrase_chars(shorter_previous) <= max_chars
            and _phrase_chars(fuller_current) <= max_chars
        ):
            out[index - 1] = shorter_previous
            out[index] = fuller_current
    return out


def _seal(cues: List[Cue]) -> List[Cue]:
    if len(cues) < 2:
        return cues
    out = [(s, e, t) for s, e, t in cues]
    for i in range(len(out) - 1):
        s, e, t = out[i]
        ns = out[i + 1][0]
        gap = ns - e
        if gap < 0 or (0 < gap < 0.35):
            e = ns
        if e <= s:
            e = s + 0.12
        out[i] = (s, e, t)
    s, e, t = out[-1]
    if e <= s:
        out[-1] = (s, s + 0.25, t)
    return out


def _progressive(phrases: List[List[Tuple[str, float, float]]], max_chars: int, max_lines: int) -> List[Cue]:
    cues: List[Cue] = []
    for phrase in phrases:
        for i, (text, start, end) in enumerate(phrase):
            if i + 1 < len(phrase):
                e = max(start + 0.08, phrase[i + 1][1])
            else:
                e = max(start + 0.25, end + 0.12)
            texts = [w[0] for w in phrase[: i + 1]]
            cues.append((start, e, _format_cue_text(texts, max_chars, max_lines)))
    return _seal(cues)


def _phrase_blocks(phrases: List[List[Tuple[str, float, float]]], max_chars: int, max_lines: int) -> List[Cue]:
    cues: List[Cue] = []
    for phrase in phrases:
        start = phrase[0][1]
        end = max(start + 0.2, phrase[-1][2] + 0.08)
        texts = [w[0] for w in phrase]
        cues.append((start, end, _format_cue_text(texts, max_chars, max_lines)))
    return _seal(cues)


# --------------------------------------------------------------------------- #
# בניית cues
# --------------------------------------------------------------------------- #
def build_cues(
    words: List[Word],
    keeps: List[KeepInterval],
    *,
    max_chars: int = 28,
    max_lines: int = 2,
    max_gap: float = 0.45,
    max_duration: float = 5.0,
    mode: CaptionMode = "progressive",
) -> List[Cue]:
    """מקבץ מילים לכתוביות לפי קצב דיבור.

    ``mode="progressive"`` (ברירת מחדל): מילה נוספת מופיעה כשהיא נאמרת.
    ``mode="phrase"``: בלוק שלם לכל ביטוי (פאוזה/פיסוק/תקציב).
    ``max_gap`` נמדד על הציר *הערוך*.
    """
    edited = _to_edited(words, keeps)
    if not edited:
        return []

    budget = max_chars * max_lines
    phrases = _split_phrases(edited, budget, max_gap)

    if mode == "phrase":
        # פיצול נוסף לפי משך / סוף משפט (תאימות להתנהגות הישנה)
        refined: List[List[Tuple[str, float, float]]] = []
        for phrase in phrases:
            cur: List[Tuple[str, float, float]] = []
            chars = 0
            for text, start, end in phrase:
                if cur and end - cur[0][1] > max_duration:
                    refined.append(cur)
                    cur, chars = [], 0
                cur.append((text, start, end))
                chars += (1 if chars else 0) + len(text)
                if _ends_sentence(text) and chars >= max_chars // 2:
                    refined.append(cur)
                    cur, chars = [], 0
            if cur:
                refined.append(cur)
        phrases = refined
        cues = _phrase_blocks(phrases, max_chars, max_lines)
    else:
        cues = _progressive(phrases, max_chars, max_lines)

    log.info("נוצרו %d כתוביות (mode=%s)", len(cues), mode)
    return cues


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
