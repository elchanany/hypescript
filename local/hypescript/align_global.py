"""יישור גלובלי מונוטוני בין תמלול ASR לסקריפט — פורט של
``web/lib/align/globalAlign.ts``.

הגישה הקודמת הייתה חיפוש חמדני שדילג בשקט על מילת סקריפט שלא נמצאה. כאן
Needleman–Wunsch עם עונשי-פער א-סימטריים: דילוג על מילת ASR זול (המשתמש
באמת מוחק קטעים), דילוג על מילת סקריפט יקר מאוד. זיווג מתחת לסף הדמיון
*אסור* ולא רק יקר — אחרת מילה שלא נאמרה כלל הייתה "נמצאת" והדוח היה משקר.

RULES §3: כל שינוי כאן חייב להתעדכן גם ב-``web/lib/align/globalAlign.ts``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence, Tuple

from .hebrew import FLOOR, HebrewToken, token_similarity

NEG = -1e9
#: זיווג אסור — שלילי מספיק כדי לא להיבחר, סופי כדי לא לייצר NaN
FORBIDDEN = -1e5


@dataclass
class AlignOptions:
    asr_gap_open: float = -0.55
    asr_gap_extend: float = -0.03
    script_gap_open: float = -3.2
    script_gap_extend: float = -1.6
    min_similarity: float = FLOOR
    full_matrix_budget: int = 4_000_000


@dataclass
class AlignPair:
    asr_index: Optional[int]
    script_index: Optional[int]
    similarity: float = 0.0


@dataclass
class AlignmentReport:
    pairs: List[AlignPair] = field(default_factory=list)
    matched_script: List[int] = field(default_factory=list)
    #: מילות סקריפט שלא נמצאו בתמלול — זה מה שהיה "נעלם" בשקט
    missing_script: List[int] = field(default_factory=list)
    #: מילות ASR שנאמרו ואינן בסקריפט
    dropped_asr: List[int] = field(default_factory=list)
    coverage: float = 1.0
    mean_similarity: float = 0.0


def _pair_score(similarity: float, min_similarity: float) -> float:
    if similarity < min_similarity:
        return FORBIDDEN
    return (similarity - min_similarity) / (1.0 - min_similarity) * 1.8 - 0.2


def _align_block(
    asr: Sequence[HebrewToken],
    script: Sequence[HebrewToken],
    asr_offset: int,
    script_offset: int,
    opts: AlignOptions,
) -> List[AlignPair]:
    n, m = len(asr), len(script)
    if not n and not m:
        return []
    if not n:
        return [AlignPair(None, script_offset + j) for j in range(m)]
    if not m:
        return [AlignPair(asr_offset + i, None) for i in range(n)]

    width = m + 1
    size = (n + 1) * width
    mat_m = [NEG] * size
    mat_x = [NEG] * size
    mat_y = [NEG] * size
    trace_m = [0] * size
    trace_x = [0] * size
    trace_y = [0] * size

    mat_m[0] = 0.0
    for i in range(1, n + 1):
        k = i * width
        mat_x[k] = opts.asr_gap_open + (i - 1) * opts.asr_gap_extend
        trace_x[k] = 0 if i == 1 else 1
    for j in range(1, m + 1):
        mat_y[j] = opts.script_gap_open + (j - 1) * opts.script_gap_extend
        trace_y[j] = 0 if j == 1 else 2

    for i in range(1, n + 1):
        asr_token = asr[i - 1]
        row = i * width
        prev_row = row - width
        for j in range(1, m + 1):
            k = row + j
            diag = prev_row + j - 1
            score = _pair_score(token_similarity(asr_token, script[j - 1]), opts.min_similarity)

            best, origin = mat_m[diag], 0
            if mat_x[diag] > best:
                best, origin = mat_x[diag], 1
            if mat_y[diag] > best:
                best, origin = mat_y[diag], 2
            mat_m[k] = best + score
            trace_m[k] = origin

            up = prev_row + j
            x_open = max(mat_m[up], mat_y[up]) + opts.asr_gap_open
            x_extend = mat_x[up] + opts.asr_gap_extend
            if x_extend >= x_open:
                mat_x[k], trace_x[k] = x_extend, 1
            else:
                mat_x[k] = x_open
                trace_x[k] = 0 if mat_m[up] >= mat_y[up] else 2

            left = row + j - 1
            y_open = max(mat_m[left], mat_x[left]) + opts.script_gap_open
            y_extend = mat_y[left] + opts.script_gap_extend
            if y_extend >= y_open:
                mat_y[k], trace_y[k] = y_extend, 2
            else:
                mat_y[k] = y_open
                trace_y[k] = 0 if mat_m[left] >= mat_x[left] else 1

    out: List[AlignPair] = []
    i, j = n, m
    end = n * width + m
    state, best = 0, mat_m[end]
    if mat_x[end] > best:
        state, best = 1, mat_x[end]
    if mat_y[end] > best:
        state = 2

    while i > 0 or j > 0:
        k = i * width + j
        if state == 0:
            out.append(AlignPair(asr_offset + i - 1, script_offset + j - 1,
                                 token_similarity(asr[i - 1], script[j - 1])))
            state = trace_m[k]
            i -= 1
            j -= 1
        elif state == 1:
            out.append(AlignPair(asr_offset + i - 1, None))
            state = trace_x[k]
            i -= 1
        else:
            out.append(AlignPair(None, script_offset + j - 1))
            state = trace_y[k]
            j -= 1
        if i == 0 and j == 0:
            break
        if i == 0:
            state = 2
        elif j == 0:
            state = 1
    out.reverse()
    return out


def find_unique_anchors(
    asr: Sequence[HebrewToken],
    script: Sequence[HebrewToken],
    min_length: int = 4,
) -> List[Tuple[int, int]]:
    """עוגנים = מילים שמופיעות פעם אחת בלבד בשני הצדדים."""

    def index(tokens: Sequence[HebrewToken]) -> Dict[str, List[int]]:
        out: Dict[str, List[int]] = {}
        for position, token in enumerate(tokens):
            if len(token.base) < min_length:
                continue
            out.setdefault(token.base, []).append(position)
        return out

    asr_map, script_map = index(asr), index(script)
    candidates: List[Tuple[int, int]] = []
    for base, hits in asr_map.items():
        if len(hits) != 1:
            continue
        script_hits = script_map.get(base)
        if not script_hits or len(script_hits) != 1:
            continue
        candidates.append((hits[0], script_hits[0]))
    candidates.sort()
    return _longest_increasing(candidates)


def _longest_increasing(items: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    if len(items) < 2:
        return items
    import bisect

    tails: List[int] = []
    tail_index: List[int] = []
    previous = [-1] * len(items)
    for i, (_, script_index) in enumerate(items):
        slot = bisect.bisect_left(tails, script_index)
        if slot == len(tails):
            tails.append(script_index)
            tail_index.append(i)
        else:
            tails[slot] = script_index
            tail_index[slot] = i
        previous[i] = tail_index[slot - 1] if slot > 0 else -1
    out: List[Tuple[int, int]] = []
    cursor = tail_index[-1]
    while cursor >= 0:
        out.append(items[cursor])
        cursor = previous[cursor]
    out.reverse()
    return out


def align_tokens(
    asr: Sequence[HebrewToken],
    script: Sequence[HebrewToken],
    options: Optional[AlignOptions] = None,
) -> List[AlignPair]:
    """מיישר ומחזיר כיסוי מלא: כל טוקן מופיע בדיוק פעם אחת בתוצאה."""
    opts = options or AlignOptions()
    if not asr or not script:
        return _align_block(asr, script, 0, 0, opts)
    if len(asr) * len(script) <= opts.full_matrix_budget:
        return _align_block(asr, script, 0, 0, opts)

    anchors = find_unique_anchors(asr, script)
    if not anchors:
        return _align_banded(asr, script, opts, 0, 0)

    out: List[AlignPair] = []
    asr_cursor = script_cursor = 0
    for anchor_asr, anchor_script in anchors:
        if anchor_asr < asr_cursor or anchor_script < script_cursor:
            continue
        out.extend(_align_banded(
            asr[asr_cursor:anchor_asr], script[script_cursor:anchor_script],
            opts, asr_cursor, script_cursor,
        ))
        out.append(AlignPair(anchor_asr, anchor_script, 1.0))
        asr_cursor, script_cursor = anchor_asr + 1, anchor_script + 1
    out.extend(_align_banded(asr[asr_cursor:], script[script_cursor:], opts, asr_cursor, script_cursor))
    return out


def _align_banded(
    asr: Sequence[HebrewToken],
    script: Sequence[HebrewToken],
    opts: AlignOptions,
    asr_offset: int,
    script_offset: int,
) -> List[AlignPair]:
    if len(asr) * len(script) <= opts.full_matrix_budget:
        return _align_block(asr, script, asr_offset, script_offset, opts)
    script_mid = len(script) // 2
    ratio = len(asr) / max(1, len(script))
    guess = round(script_mid * ratio)
    radius = max(64, round(len(asr) * 0.1))
    lower = max(1, guess - radius)
    upper = min(len(asr) - 1, guess + radius)

    cut, best = guess, float("-inf")
    pivot = script[script_mid]
    for i in range(lower, upper + 1):
        score = token_similarity(asr[i], pivot) - abs(i - guess) / max(1, radius) * 0.3
        if score > best:
            best, cut = score, i
    return (
        _align_banded(asr[:cut], script[:script_mid], opts, asr_offset, script_offset)
        + _align_banded(asr[cut:], script[script_mid:], opts, asr_offset + cut, script_offset + script_mid)
    )


def summarize_alignment(pairs: Sequence[AlignPair], script_length: int) -> AlignmentReport:
    matched: List[int] = []
    missing: List[int] = []
    dropped: List[int] = []
    similarity_sum = 0.0
    for pair in pairs:
        if pair.asr_index is not None and pair.script_index is not None:
            matched.append(pair.script_index)
            similarity_sum += pair.similarity
        elif pair.script_index is not None:
            missing.append(pair.script_index)
        elif pair.asr_index is not None:
            dropped.append(pair.asr_index)
    return AlignmentReport(
        pairs=list(pairs),
        matched_script=matched,
        missing_script=missing,
        dropped_asr=dropped,
        coverage=(len(matched) / script_length) if script_length else 1.0,
        mean_similarity=(similarity_sum / len(matched)) if matched else 0.0,
    )
