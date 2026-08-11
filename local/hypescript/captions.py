"""חלוקת כתוביות לפי מבנה משפט — פורט של ``web/lib/captions/segment.ts``.

הגישה הקודמת שברה חמדנית לפי תקציב תווים, ולכן נפלה באמצע צירוף
(``בית / אלהינו``, ``רבי / יוחנן``) ולא הגבילה קצב קריאה. כאן: כל מילה
מופיעה בכתובית אחת בדיוק (אין חזרות), החלוקה נבחרת בתכנות דינמי, ונקודות
השבירה מדורגות לפי דקדוק עברי.

RULES §3: כל שינוי כאן חייב להתעדכן גם ב-``web/lib/captions/segment.ts``.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from typing import List, Optional, Sequence, Tuple

RLM = "‏"

SENTENCE_END = re.compile(r"[.!?…׃][\"'”’)\]]*$")
CLAUSE_END = re.compile(r"[,;:–—][\"'”’)\]]*$")
OPEN_QUOTE = re.compile(r"^[\"'“‘(\[]")
CLOSE_QUOTE = re.compile(r"^[\"'”’)\]]")
BARE = re.compile(r"[^א-ת0-9A-Za-z]")
SUBORDINATE = re.compile(r"^(כש|ש)[א-ת]{2,}")

#: מילים שאסור לשבור *אחריהן* — הן נשענות על המילה שאחריהן
BIND_NEXT = frozenset("""
של את על אל עם מן אצל בין לפי כמו לפני אחרי תחת מול בלי בתוך מתוך בשביל בעבור
כלפי לגבי אודות כל כמה איזה אותו אותה אותם שני שתי שלוש ארבע חמש
בית בן בת בני בנות ראש אנשי בעל בעלת דברי חכמי תורת מסכת פרשת יום ליל ערב
כבוד ספר סדר שם לעילוי רבי רב הרב מרן הגאון מורנו הרבנית מרת הגר
""".split())

#: מילים שכדאי לשבור *לפניהן* — הן פותחות פסוקית חדשה
BREAK_BEFORE = frozenset("""
אבל אלא אך או כי אז אם כאשר לכן ולכן מפני משום כדי בגלל למרות אמנם ואילו
שהרי הרי וכן אפילו כלומר ובכן נמצא לפיכך ואז ולפיכך וכך כך
""".split())


@dataclass
class CaptionToken:
    text: str
    start: float
    end: float


@dataclass
class CaptionCue:
    start: float
    end: float
    lines: List[str]
    text: str
    token_from: int
    token_to: int


@dataclass(frozen=True)
class CaptionPolicy:
    #: "ארבע חמש מילים בפעימה"
    target_words: int = 5
    min_words: int = 2
    max_words: int = 8
    max_chars_per_line: int = 24
    max_lines: int = 2
    min_duration_sec: float = 1.0
    max_duration_sec: float = 5.0
    min_gap_sec: float = 0.06
    #: תווים לשנייה — מעל זה אי אפשר להספיק לקרוא
    max_cps: float = 17.0
    tail_sec: float = 0.14


DEFAULT_POLICY = CaptionPolicy()


def _bare(text: str) -> str:
    return BARE.sub("", text)


def break_score(tokens: Sequence[CaptionToken], index: int) -> float:
    """ציון איכות לשבירה *אחרי* הטוקן index, 0..100."""
    if index >= len(tokens):
        return 0.0
    current = tokens[index]
    if index + 1 >= len(tokens):
        return 100.0
    nxt = tokens[index + 1]

    score = 10.0
    current_text = current.text.rstrip()
    if SENTENCE_END.search(current_text):
        score = 100.0
    elif CLAUSE_END.search(current_text):
        score = 72.0

    gap = nxt.start - current.end
    if gap >= 0.7:
        score = max(score, 70.0)
    elif gap >= 0.4:
        score = max(score, 54.0)
    elif gap >= 0.25:
        score = max(score, 38.0)
    elif gap >= 0.15:
        score = max(score, 22.0)

    next_bare = _bare(nxt.text)
    if next_bare in BREAK_BEFORE:
        score = max(score, 44.0)
    if SUBORDINATE.match(next_bare):
        score = max(score, 30.0)

    current_bare = _bare(current_text)
    if current_bare in BIND_NEXT:
        score -= 70.0
    if len(current_bare) <= 1:
        score -= 45.0
    if current_bare.isdigit():
        score -= 35.0
    if current_text and OPEN_QUOTE.match(current_text[-1]):
        score -= 60.0
    if CLOSE_QUOTE.match(nxt.text):
        score -= 55.0
    if SENTENCE_END.search(nxt.text.rstrip()) and len(_bare(nxt.text)) <= 3:
        score -= 25.0

    return max(0.0, min(100.0, score))


def _char_count(tokens: Sequence[CaptionToken], start: int, end: int) -> int:
    return sum(len(tokens[i].text) + (1 if i > start else 0) for i in range(start, end))


def _cue_cost(tokens: Sequence[CaptionToken], start: int, end: int, policy: CaptionPolicy) -> float:
    words = end - start
    chars = _char_count(tokens, start, end)
    duration = max(0.001, tokens[end - 1].end + policy.tail_sec - tokens[start].start)
    capacity = policy.max_chars_per_line * policy.max_lines
    is_last = end == len(tokens)

    cost = (words - policy.target_words) ** 2 * 1.7
    if words < policy.min_words:
        cost += 14.0 if is_last else 45.0
    if chars > capacity:
        cost += (chars - capacity) * 5
    if duration < policy.min_duration_sec:
        cost += (policy.min_duration_sec - duration) * 10
    if duration > policy.max_duration_sec:
        cost += (duration - policy.max_duration_sec) * 22
    cps = chars / duration
    if cps > policy.max_cps:
        cost += (cps - policy.max_cps) * 7
    cost += (100.0 - break_score(tokens, end - 1)) * 0.6
    return cost


def segment_tokens(
    tokens: Sequence[CaptionToken],
    policy: CaptionPolicy = DEFAULT_POLICY,
) -> List[Tuple[int, int]]:
    """חלוקה אופטימלית בתכנות דינמי. כל טוקן שייך לכתובית אחת בלבד."""
    n = len(tokens)
    if not n:
        return []
    best = [float("inf")] * (n + 1)
    origin = [-1] * (n + 1)
    best[0] = 0.0
    for end in range(1, n + 1):
        for start in range(max(0, end - policy.max_words), end):
            if best[start] == float("inf"):
                continue
            candidate = best[start] + _cue_cost(tokens, start, end, policy)
            if candidate < best[end]:
                best[end] = candidate
                origin[end] = start
    spans: List[Tuple[int, int]] = []
    cursor = n
    while cursor > 0:
        start = origin[cursor]
        if start < 0:
            spans.append((0, cursor))
            break
        spans.append((start, cursor))
        cursor = start
    spans.reverse()
    return spans


def split_lines(
    tokens: Sequence[CaptionToken],
    start: int,
    end: int,
    policy: CaptionPolicy = DEFAULT_POLICY,
) -> List[str]:
    words = [tokens[i].text for i in range(start, end)]
    single = " ".join(words)
    if policy.max_lines < 2 or len(single) <= policy.max_chars_per_line or len(words) < 2:
        return [single]

    best_split, best_cost = -1, float("inf")
    for split in range(1, len(words)):
        first = " ".join(words[:split])
        second = " ".join(words[split:])
        longest = max(len(first), len(second))
        cost = abs(len(first) - len(second))
        if longest > policy.max_chars_per_line:
            cost += (longest - policy.max_chars_per_line) * 6
        cost += (100.0 - break_score(tokens, start + split - 1)) * 0.35
        if cost < best_cost:
            best_cost, best_split = cost, split
    if best_split < 0:
        return [single]
    return [" ".join(words[:best_split]), " ".join(words[best_split:])]


def build_caption_cues(
    tokens: Sequence[CaptionToken],
    policy: CaptionPolicy = DEFAULT_POLICY,
    limit_sec: Optional[float] = None,
) -> List[CaptionCue]:
    clean = sorted(
        (CaptionToken(t.text.strip(), t.start, max(t.start + 0.02, t.end))
         for t in tokens if t.text and t.text.strip()),
        key=lambda t: t.start,
    )
    if not clean:
        return []

    cues: List[CaptionCue] = []
    for start, end in segment_tokens(clean, policy):
        lines = split_lines(clean, start, end, policy)
        cues.append(CaptionCue(
            start=clean[start].start,
            end=clean[end - 1].end + policy.tail_sec,
            lines=lines,
            text="\n".join(RLM + line for line in lines),
            token_from=start,
            token_to=end,
        ))

    for i, cue in enumerate(cues):
        nxt = cues[i + 1] if i + 1 < len(cues) else None
        ceiling = (nxt.start - policy.min_gap_sec) if nxt else (
            limit_sec if limit_sec is not None else cue.end + policy.tail_sec)
        if cue.end > ceiling:
            cue.end = ceiling
        if cue.end - cue.start < policy.min_duration_sec:
            cue.end = min(max(cue.end, cue.start + policy.min_duration_sec), ceiling)
        if cue.end <= cue.start:
            cue.end = cue.start + 0.2
    return cues


@dataclass
class CaptionAudit:
    count: int = 0
    #: זוגות כתוביות עוקבות שחוזרות על מילים — חייב להיות 0
    repeated_word_pairs: int = 0
    too_fast: List[int] = field(default_factory=list)
    too_short: List[int] = field(default_factory=list)
    orphans: List[int] = field(default_factory=list)
    overlaps: List[int] = field(default_factory=list)
    long_lines: List[int] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return (self.repeated_word_pairs == 0 and not self.overlaps
                and not self.too_fast and not self.long_lines)


def audit_captions(cues: Sequence[CaptionCue], policy: CaptionPolicy = DEFAULT_POLICY) -> CaptionAudit:
    audit = CaptionAudit(count=len(cues))

    def plain(cue: CaptionCue) -> List[str]:
        return [w for w in (_bare(part) for part in " ".join(cue.lines).split()) if w]

    for index, cue in enumerate(cues):
        words = plain(cue)
        duration = cue.end - cue.start
        chars = len(" ".join(cue.lines))
        if duration > 0 and chars / duration > policy.max_cps * 1.15:
            audit.too_fast.append(index + 1)
        if duration < policy.min_duration_sec * 0.6:
            audit.too_short.append(index + 1)
        if len(words) == 1 and not SENTENCE_END.search(" ".join(cue.lines).rstrip()):
            audit.orphans.append(index + 1)
        if any(len(line) > policy.max_chars_per_line * 1.2 for line in cue.lines):
            audit.long_lines.append(index + 1)
        if index + 1 < len(cues):
            nxt = cues[index + 1]
            if nxt.start < cue.end - 1e-6:
                audit.overlaps.append(index + 1)
            next_words = plain(nxt)
            cumulative = bool(words) and all(
                k < len(next_words) and next_words[k] == word for k, word in enumerate(words))
            significant = [w for w in words if len(w) > 2]
            shared = sum(1 for w in significant if w in next_words)
            heavy = bool(significant) and shared / len(significant) >= 0.5
            if cumulative or heavy:
                audit.repeated_word_pairs += 1
    return audit


def caption_tokens_from_script(
    words: Sequence[CaptionToken],
    script_text: str,
) -> Tuple[List[CaptionToken], List[int], int, float]:
    """ממזג תמלול מתוזמן עם סקריפט נקי — פורט של ``captionTokensFromScript``.

    מחזיר ``(tokens, interpolated, dropped, coverage)``. התוצאה מכילה בדיוק את
    מילות הסקריפט, בסדרן; אף מילה אינה נשמטת.
    """
    from .align_global import align_tokens, summarize_alignment
    from .hebrew import make_token, tokenize_hebrew

    timed = sorted((w for w in words if w.text and w.text.strip()), key=lambda w: w.start)
    script_tokens = tokenize_hebrew(script_text)
    if not timed or not script_tokens:
        return [replace(w) for w in timed], [], 0, (1.0 if not script_tokens else 0.0)

    pairs = align_tokens([make_token(w.text) for w in timed], script_tokens)
    report = summarize_alignment(pairs, len(script_tokens))

    starts: List[Optional[float]] = [None] * len(script_tokens)
    ends: List[Optional[float]] = [None] * len(script_tokens)
    for pair in pairs:
        if pair.asr_index is None or pair.script_index is None:
            continue
        starts[pair.script_index] = timed[pair.asr_index].start
        ends[pair.script_index] = timed[pair.asr_index].end

    min_token = 0.08
    interpolated: List[int] = []
    index = 0
    while index < len(script_tokens):
        if starts[index] is not None:
            index += 1
            continue
        run_end = index
        while run_end < len(script_tokens) and starts[run_end] is None:
            run_end += 1
        before = ends[index - 1] if index > 0 else None
        after = starts[run_end] if run_end < len(script_tokens) else None
        count = run_end - index
        if before is not None:
            begin = before
        elif after is not None:
            begin = max(0.0, after - count * 0.28)
        else:
            begin = timed[0].start
        finish = after if after is not None else (
            before + count * 0.28 if before is not None else timed[-1].end)
        step = max(min_token, (finish - begin) / max(1, count))
        for k in range(count):
            starts[index + k] = begin + step * k
            ends[index + k] = begin + step * (k + 1)
            interpolated.append(index + k)
        index = run_end

    out: List[CaptionToken] = []
    previous_end = float("-inf")
    for i, token in enumerate(script_tokens):
        start = starts[i] if starts[i] is not None else previous_end
        end = ends[i] if ends[i] is not None else start + min_token
        start = max(start, previous_end) if previous_end != float("-inf") else start
        if end < start + min_token:
            end = start + min_token
        out.append(CaptionToken(token.raw, start, end))
        previous_end = end

    return out, interpolated, len(report.dropped_asr), report.coverage
