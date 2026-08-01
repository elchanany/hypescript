"""לוגיקת העריכה: מ-word timestamps אל רשימת קטעים לשמירה (KeepInterval).

שני מקורות לקביעה אילו מילים נשמרות:
  1. הסרת שתיקות/נשימות — רווח בין מילים ארוך מסף => פאוזה => נחתך.
  2. חיתוך-לפי-סקריפט (אופציונלי) — משאיר רק מילים שתואמות לסקריפט ה"נקי".
לאחר בחירת המילים, בונים קטעי keep עם padding בכל צד.
"""

from __future__ import annotations

import difflib
import logging
import re
from typing import List, Optional, Tuple

from .models import KeepInterval, Word

log = logging.getLogger("hypescript")


# --------------------------------------------------------------------------- #
# בניית קטעי keep מתוך רשימת מילים
# --------------------------------------------------------------------------- #
def build_keep_intervals(
    words: List[Word],
    duration: float,
    *,
    threshold: float,
    padding: float,
    keep_mask: Optional[List[bool]] = None,
) -> List[KeepInterval]:
    """בונה קטעים לשמירה מתוך המילים.

    שני מקורות לחיתוך, מטופלים באופן אחיד:
      * **פאוזה/נשימה** — רווח בין מילים סמוכות שנשמרות גדול מ-``threshold``.
      * **מילה שהוסרה** — כל מילה שסומנה להסרה (מהסקריפט או כמילת-מהסס)
        מכריחה גבול חיתוך בין שכנותיה, גם אם הרווח קצר. כך מהססים קצרים
        באמת נחתכים, ולא "שורדים" רק כי הפאוזה סביבם קטנה.

    בכל צד של קטע שנשמר מוסיפים ``padding``. שקט מוביל/מסיים מוסר אוטומטית.
    ``keep_mask`` (אם ניתן) מקביל ל-``words`` — ``True``=לשמור, ``False``=להסיר.
    """
    if not words:
        return []
    if keep_mask is None:
        keep_mask = [True] * len(words)

    pairs = sorted(zip(words, keep_mask), key=lambda p: p[0].start)
    intervals: List[KeepInterval] = []
    cur_start: Optional[float] = None
    cur_end: float = 0.0
    removed_since = False

    for w, keep in pairs:
        if not keep:
            removed_since = True
            continue
        if cur_start is None:
            cur_start, cur_end = max(0.0, w.start - padding), w.end
            removed_since = False
            continue
        gap = w.start - cur_end
        if removed_since or gap > threshold:
            intervals.append(KeepInterval(cur_start, min(duration, cur_end + padding)))
            cur_start, cur_end = max(0.0, w.start - padding), w.end
        else:
            cur_end = max(cur_end, w.end)
        removed_since = False

    if cur_start is not None:
        intervals.append(KeepInterval(cur_start, min(duration, cur_end + padding)))

    return _merge_overlaps(intervals)


def _merge_overlaps(intervals: List[KeepInterval]) -> List[KeepInterval]:
    """ממזג קטעים חופפים/נוגעים (יכול לקרות אם threshold < 2*padding)."""
    if not intervals:
        return []
    intervals = sorted(intervals, key=lambda iv: iv.start)
    merged = [intervals[0]]
    for iv in intervals[1:]:
        last = merged[-1]
        if iv.start <= last.end + 1e-6:
            merged[-1] = KeepInterval(last.start, max(last.end, iv.end))
        else:
            merged.append(iv)
    return [iv for iv in merged if iv.duration > 1e-3]


def whole_video(duration: float) -> List[KeepInterval]:
    """קטע יחיד המכסה את כל הסרטון (כשלא מבצעים הסרת שתיקות)."""
    return [KeepInterval(0.0, duration)]


def removed_intervals(keeps: List[KeepInterval], duration: float) -> List[Tuple[float, float]]:
    """מחשב את הקטעים שהוסרו (המשלים של keeps בתוך [0, duration])."""
    removed: List[Tuple[float, float]] = []
    prev = 0.0
    for iv in sorted(keeps, key=lambda x: x.start):
        if iv.start - prev > 1e-3:
            removed.append((prev, iv.start))
        prev = max(prev, iv.end)
    if duration - prev > 1e-3:
        removed.append((prev, duration))
    return removed


def kept_duration(keeps: List[KeepInterval]) -> float:
    return sum(iv.duration for iv in keeps)


# --------------------------------------------------------------------------- #
# חיתוך-לפי-סקריפט (fuzzy alignment)
# --------------------------------------------------------------------------- #
_NIQQUD = re.compile(r"[֑-ׇ]")  # ניקוד וטעמים
_NON_WORD = re.compile(r"[^א-ת0-9A-Za-z]+")
_FINALS = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}


def normalize_hebrew(text: str) -> str:
    """נרמול לצורך השוואה: הסרת ניקוד/פיסוק ואיחוד אותיות סופיות."""
    text = _NIQQUD.sub("", text)
    text = _NON_WORD.sub(" ", text)
    text = "".join(_FINALS.get(c, c) for c in text)
    return text.strip().lower()


# קטע 'replace' ארוך מזה (במילים מצד-התמלול) שגם ארוך משמעותית מצד-הסקריפט
# נחשב תוכן שיושר בטעות (למשל קטע שהוסר) ולכן ייחתך ולא יישמר.
_REPLACE_KEEP_MAX_WORDS = 8


def script_keep_mask(
    words: List[Word],
    script_text: str,
    *,
    replace_keep_max_words: int = _REPLACE_KEEP_MAX_WORDS,
) -> List[bool]:
    """כמו :func:`filter_words_by_script` אבל מחזיר מסכה בוליאנית מקבילה ל-``words``.

    זה הצורה המועדפת: מאפשר לשלב את החיתוך-לפי-סקריפט עם מסננים אחרים
    (למשל הסרת מהססים) לפני בניית הקטעים.
    """
    mask = [False] * len(words)
    indexed = [(i, normalize_hebrew(w.text)) for i, w in enumerate(words)]
    indexed = [(i, n) for i, n in indexed if n]
    transcript_tokens = [n for _, n in indexed]

    script_tokens = [normalize_hebrew(t) for t in script_text.split()]
    script_tokens = [t for t in script_tokens if t]

    if not transcript_tokens or not script_tokens:
        log.warning("סקריפט או תמלול ריקים לאחר נרמול — מדלג על חיתוך-לפי-סקריפט.")
        return [True] * len(words)

    matcher = difflib.SequenceMatcher(a=transcript_tokens, b=script_tokens, autojunk=False)
    for tag, a1, a2, b1, b2 in matcher.get_opcodes():
        keep_block = False
        if tag == "equal":
            keep_block = True
        elif tag == "replace":
            t_len, s_len = a2 - a1, b2 - b1
            keep_block = t_len <= replace_keep_max_words and t_len <= s_len * 2 + 2
        if keep_block:
            for k in range(a1, a2):
                mask[indexed[k][0]] = True

    kept = sum(mask)
    ratio = kept / max(1, len(words))
    log.info("חיתוך-לפי-סקריפט: נשמרו %d/%d מילים (%.0f%%)", kept, len(words), ratio * 100)
    if ratio < 0.3:
        log.warning(
            "פחות מ-30%% מהמילים תואמות לסקריפט — ודא שהסקריפט תואם לתוכן הסרטון "
            "(שפה, סדר, איות). אפשר גם שהתמלול לא מדויק — נסה מודל גדול יותר."
        )
    return mask


def filter_words_by_script(
    words: List[Word],
    script_text: str,
    *,
    replace_keep_max_words: int = _REPLACE_KEEP_MAX_WORDS,
) -> List[Word]:
    """משאיר רק מילים מהתמלול שתואמות לסקריפט ה"נקי", לפי alignment עמיד לשגיאות ASR.

    זה הלב של הכלי: הסקריפט מגדיר *בדיוק* מה צריך להישאר, וכל השאר (חזרות,
    גמגומים, קטעים לא-רלוונטיים) נחתך.

    האלגוריתם עובד על ``opcodes`` של יישור רצפים ומסווג כל בלוק:
      * ``equal``   — התמלול והסקריפט זהים  -> נשמר.
      * ``replace`` — התמלול שונה מהסקריפט (בד"כ שגיאת תמלול על אותה מילה
                      מדוברת) -> נשמר, *אלא אם* הצד המתומלל ארוך וחריג, מה
                      שמעיד על יישור-שגוי של קטע שצריך להיחתך.
      * ``delete``  — מילים בתמלול שאין להן מקבילה בסקריפט (תוכן שהוסר) -> נחתך.
      * ``insert``  — מילים בסקריפט שלא נאמרו -> אין מה לשמור.

    שמירת בלוקי ``replace`` (ולא רק ``equal``) היא שמונעת חיתוך קצוץ באמצע
    משפט בגלל מילה בודדת שתומללה לא-מדויק — קריטי לדיוק ולרציפות.

    (עטיפה נוחה מעל :func:`script_keep_mask`.)
    """
    mask = script_keep_mask(words, script_text, replace_keep_max_words=replace_keep_max_words)
    return [w for w, keep in zip(words, mask) if keep]


# --------------------------------------------------------------------------- #
# הסרת מילות-מהסס וגמגומים
# --------------------------------------------------------------------------- #
# ברירת מחדל שמרנית: רק הברות היסוס טהורות (לא מילים לגיטימיות כמו "נו"/"כאילו").
DEFAULT_FILLERS = {
    normalize_hebrew(w)
    for w in ["אה", "אהה", "אא", "אמ", "אממ", "אהם", "המ", "המם", "אהמ", "עם", "מממ", "ננ"]
}


def parse_fillers(spec: Optional[str]) -> set:
    """מפרש רשימת מהססים מהמשתמש (מופרדת בפסיקים), או מחזיר את ברירת המחדל."""
    if not spec:
        return set(DEFAULT_FILLERS)
    return {normalize_hebrew(t) for t in spec.split(",") if normalize_hebrew(t)}


def filler_mask(words: List[Word], fillers: set) -> List[bool]:
    """מחזיר מסכה: ``True`` = המילה היא מהסס/גמגום שיש להסיר."""
    mask = [normalize_hebrew(w.text) in fillers for w in words]
    n = sum(mask)
    if n:
        log.info("הסרת מהססים: זוהו %d מילות-מהסס/גמגום להסרה.", n)
    return mask
