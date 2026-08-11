"""נרמול טוקנים עברי + מדד דמיון — פורט מדויק של ``web/lib/align/hebrew.ts``.

תמלול אוטומטי בעברית טועה באופן שיטתי, לא אקראי: אותיות שימוש נבלעות
(``ובמקום`` ↔ ``במקום``), כתיב מלא/חסר משתנה, ועיצורים הומופוניים מתחלפים
(``כשר`` ↔ ``קשר``, ``תפארת`` ↔ ``טיפרת``). השוואת מחרוזות מדויקת נכשלת בכל
אחד מאלה, והמילה נעלמת מהפלט. כאן מחשבים דמיון מדורג במקום שוויון בינארי.

RULES §3: כל שינוי כאן חייב להתעדכן גם ב-``web/lib/align/hebrew.ts``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional

NIQQUD = re.compile(r"[֑-ׇ]")
GERESH = re.compile(r"[׳״'\"`´’‘“”]")
NON_WORD = re.compile(r"[^א-ת0-9A-Za-z]+")

FINALS = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}

#: אותיות שימוש שעלולות להיבלע או להתווסף בתמלול
PARTICLES = frozenset("והבכלמש")

#: הכי קצר שנשאר אחרי הסרת אות שימוש
MIN_STEM_LEN = 3

SENTENCE_END = re.compile(r"[.!?…׃][\"'”’)\]]*$")
CLAUSE_END = re.compile(r"[,;:־–—][\"'”’)\]]*$")

EXACT = 1.0
PARTICLE = 0.93
PHONETIC = 0.87
FLOOR = 0.62


@dataclass(frozen=True)
class HebrewToken:
    raw: str
    base: str
    stem: str
    phonetic: str
    ends_sentence: bool
    ends_clause: bool


def fold_finals(text: str) -> str:
    return "".join(FINALS.get(ch, ch) for ch in text)


def normalize_base(text: str) -> str:
    stripped = NON_WORD.sub(" ", GERESH.sub("", NIQQUD.sub("", str(text or "")))).strip().lower()
    return fold_finals(stripped)


def strip_particles(base: str) -> str:
    out = base
    for _ in range(2):
        if not out or out[0] not in PARTICLES:
            break
        rest = out[1:]
        if len(rest) < MIN_STEM_LEN:
            break
        out = rest
    return out


def phonetic_fold(base: str) -> str:
    """קיפול פונטי: כ→ק, ט→ת, ש→ס, השמטת א/ע/ה פנימיות ואמות קריאה.

    כך ``תפארת``/``טיפרת`` ו-``כשר``/``קשר`` מתלכדים — שתי טעויות התמלול
    שנצפו בפועל.
    """
    if not base:
        return ""
    out: List[str] = []
    for index, original in enumerate(base):
        ch = original
        first = index == 0
        if ch == "כ":      # כ
            ch = "ק"       # ק
        elif ch == "ט":    # ט
            ch = "ת"       # ת
        elif ch == "ש":    # ש
            ch = "ס"       # ס
        if not first and ch in ("א", "ע", "ה"):  # א ע ה
            continue
        if not first and ch in ("י", "ו") and len(base) > 3:  # י ו
            continue
        if out and out[-1] == ch:
            continue
        out.append(ch)
    return "".join(out) or base


def make_token(raw: str, precomputed_base: Optional[str] = None) -> HebrewToken:
    base = normalize_base(raw) if precomputed_base is None else precomputed_base
    trimmed = raw.rstrip()
    return HebrewToken(
        raw=raw,
        base=base,
        stem=strip_particles(base),
        phonetic=phonetic_fold(base),
        ends_sentence=bool(SENTENCE_END.search(trimmed)),
        ends_clause=bool(CLAUSE_END.search(trimmed)),
    )


def tokenize_hebrew(text: str) -> List[HebrewToken]:
    out: List[HebrewToken] = []
    for piece in str(text or "").split():
        raw = piece.strip()
        if not raw:
            continue
        base = normalize_base(raw)
        if not base:
            continue
        out.append(make_token(raw, base))
    return out


def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)
    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ca != cb)))
        previous = current
    return previous[len(b)]


def levenshtein_ratio(a: str, b: str) -> float:
    longest = max(len(a), len(b))
    if not longest:
        return 1.0
    return 1.0 - levenshtein(a, b) / longest


def is_particle_variant(a: str, b: str) -> bool:
    short_side, long_side = (a, b) if len(a) <= len(b) else (b, a)
    if len(short_side) < MIN_STEM_LEN:
        return False
    delta = len(long_side) - len(short_side)
    if delta < 1 or delta > 2:
        return False
    if not long_side.endswith(short_side):
        return False
    return all(ch in PARTICLES for ch in long_side[:delta])


def token_similarity(a: HebrewToken, b: HebrewToken) -> float:
    """דמיון 0..1. הסולם מדורג כדי שהיישור יעדיף התאמה טובה כשיש כמה."""
    if a.base == b.base:
        return EXACT
    if is_particle_variant(a.base, b.base):
        return PARTICLE
    if a.stem and a.stem == b.stem:
        return PARTICLE - 0.02
    if a.phonetic and a.phonetic == b.phonetic:
        return PHONETIC
    ratio = levenshtein_ratio(a.base, b.base)
    if ratio >= 0.8:
        return 0.6 + ratio * 0.25
    phonetic_ratio = levenshtein_ratio(a.phonetic, b.phonetic)
    if phonetic_ratio >= 0.85:
        return 0.58 + phonetic_ratio * 0.2
    return ratio * 0.5


def normalize_hebrew(text: str) -> str:
    """תואם לאחור — השם שהקוד הקיים משתמש בו."""
    return normalize_base(text)
