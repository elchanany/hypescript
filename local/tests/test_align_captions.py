"""בדיקות פריטי ליבה — חייבות להישאר תואמות ל-web (RULES §3).

הבדיקות כאן מדגימות את אותם מקרים בדיוק כמו
``web/lib/align/globalAlign.test.ts`` ו-``web/lib/captions/segment.test.ts``.
"""

import unittest

from hypescript.align_global import align_tokens, summarize_alignment
from hypescript.captions import (
    CaptionToken,
    audit_captions,
    break_score,
    build_caption_cues,
    caption_tokens_from_script,
)
from hypescript.hebrew import (
    is_particle_variant,
    phonetic_fold,
    token_similarity,
    tokenize_hebrew,
)


def _align(asr_text: str, script_text: str):
    asr = tokenize_hebrew(asr_text)
    script = tokenize_hebrew(script_text)
    pairs = align_tokens(asr, script)
    return asr, script, pairs, summarize_alignment(pairs, len(script))


def _speak(text: str, start=0.0, word_sec=0.34, gap_sec=0.06):
    tokens, t = [], start
    for word in text.split():
        tokens.append(CaptionToken(word, t, t + word_sec))
        t += word_sec + gap_sec
    return tokens


class HebrewNormalizationTests(unittest.TestCase):
    def test_particle_variant(self):
        self.assertTrue(is_particle_variant("במקום", "ובמקום"))
        self.assertFalse(is_particle_variant("שלום", "חלום"))

    def test_phonetic_fold_merges_real_asr_errors(self):
        self.assertEqual(phonetic_fold("תפארת"), phonetic_fold("טיפרת"))
        self.assertEqual(phonetic_fold("כשר"), phonetic_fold("קשר"))

    def test_distinct_words_stay_distinct(self):
        a, = tokenize_hebrew("שריפה")
        b, = tokenize_hebrew("חורבן")
        self.assertLess(token_similarity(a, b), 0.5)


class GlobalAlignmentTests(unittest.TestCase):
    def test_finds_script_inside_longer_transcript(self):
        _, _, _, report = _align(
            "אה אז שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד אממ תודה",
            "שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד",
        )
        self.assertEqual(report.missing_script, [])
        self.assertEqual(report.coverage, 1.0)

    def test_spelling_drift_does_not_lose_a_word(self):
        _, _, _, report = _align(
            "להצלחת הגברת טיפרת עטר בת נתלי",
            "להצלחת הגברת תפארת עטר בת נתלי",
        )
        self.assertEqual(report.missing_script, [])

    def test_swallowed_particle_does_not_lose_a_word(self):
        _, _, _, report = _align(
            "ובמקום אחר נאמר קשה סילוקו של אדם",
            "במקום אחר נאמר קשה סילוקו של אדם",
        )
        self.assertEqual(report.missing_script, [])

    def test_missing_word_is_reported_not_swallowed(self):
        _, script, _, report = _align("קשה סילוקו של אדם", "קשה סילוקו של אדם כשר")
        self.assertEqual(len(report.missing_script), 1)
        self.assertEqual(script[report.missing_script[0]].raw, "כשר")

    def test_every_token_covered_exactly_once(self):
        asr, script, pairs, _ = _align("אחת שתיים שלוש ארבע חמש שש שבע", "שתיים שלוש חמש שבע")
        self.assertEqual(len({p.asr_index for p in pairs if p.asr_index is not None}), len(asr))
        self.assertEqual(len({p.script_index for p in pairs if p.script_index is not None}), len(script))

    def test_drops_asr_junk(self):
        asr, _, _, report = _align("שלום אה אממ וברכה", "שלום וברכה")
        self.assertEqual([asr[i].raw for i in report.dropped_asr], ["אה", "אממ"])

    def test_monotonic_with_repeated_phrases(self):
        _, _, pairs, report = _align(
            "קשה סילוקו של אדם כשר כשריפת בית אלהינו ובמקום אחר קשה סילוקו של אדם כשר כחורבן בית אלהינו",
            "קשה סילוקו של אדם כשר כשריפת בית אלהינו קשה סילוקו של אדם כשר כחורבן בית אלהינו",
        )
        self.assertEqual(report.missing_script, [])
        matched = [(p.asr_index, p.script_index) for p in pairs
                   if p.asr_index is not None and p.script_index is not None]
        for (prev_a, prev_s), (cur_a, cur_s) in zip(matched, matched[1:]):
            self.assertGreater(cur_a, prev_a)
            self.assertGreater(cur_s, prev_s)


LESSON = "שלום וברכה השיעור הזה נמסר בכולל הקדיש והחסד. הנצחת השיעור היום תהיה לעילוי נשמת משה בן רחל."


class CaptionSegmentationTests(unittest.TestCase):
    def setUp(self):
        self.cues = build_caption_cues(_speak(LESSON))

    def test_no_repeated_words_between_cues(self):
        self.assertEqual(audit_captions(self.cues).repeated_word_pairs, 0)

    def test_every_word_appears_exactly_once(self):
        rendered = " ".join(" ".join(cue.lines) for cue in self.cues).split()
        self.assertEqual(rendered, LESSON.split())

    def test_four_to_six_words_per_cue(self):
        counts = [cue.token_to - cue.token_from for cue in self.cues]
        average = sum(counts) / len(counts)
        self.assertGreaterEqual(average, 3.5)
        self.assertLessEqual(average, 6.5)

    def test_no_overlaps_and_readable_speed(self):
        audit = audit_captions(self.cues)
        self.assertEqual(audit.overlaps, [])
        self.assertEqual(audit.too_fast, [])
        self.assertTrue(audit.passed)

    def test_rtl_marker_on_every_line(self):
        for cue in self.cues:
            for line in cue.text.split("\n"):
                self.assertTrue(line.startswith("‏"))

    def test_does_not_break_construct_pairs(self):
        tokens = _speak("כשריפת בית אלהינו נשאלת השאלה")
        self.assertLess(break_score(tokens, 1), break_score(tokens, 2))

    def test_does_not_break_after_honorific(self):
        tokens = _speak("אמר רבי יוחנן משום רבי שמעון")
        self.assertLess(break_score(tokens, 1), 20)

    def test_detects_progressive_reveal_as_a_defect(self):
        from hypescript.captions import CaptionCue
        progressive = [
            CaptionCue(0.0, 0.5, ["שלום"], "שלום", 0, 1),
            CaptionCue(0.5, 1.0, ["שלום וברכה"], "שלום וברכה", 0, 2),
            CaptionCue(1.0, 1.6, ["שלום וברכה השיעור"], "שלום וברכה השיעור", 0, 3),
        ]
        audit = audit_captions(progressive)
        self.assertEqual(audit.repeated_word_pairs, 2)
        self.assertFalse(audit.passed)


class ScriptSpellingTests(unittest.TestCase):
    def test_replaces_asr_error_with_user_spelling(self):
        asr = _speak("להצלחת הגברת טיפרת עטר בת נתלי")
        tokens, interpolated, _, _ = caption_tokens_from_script(
            asr, "להצלחת הגברת תפארת עטר בת נתלי")
        self.assertEqual([t.text for t in tokens],
                         ["להצלחת", "הגברת", "תפארת", "עטר", "בת", "נתלי"])
        self.assertEqual(interpolated, [])
        self.assertAlmostEqual(tokens[2].start, asr[2].start, places=5)

    def test_drops_asr_junk_not_in_script(self):
        tokens, _, dropped, _ = caption_tokens_from_script(_speak("שלום אה אממ וברכה"), "שלום וברכה")
        self.assertEqual([t.text for t in tokens], ["שלום", "וברכה"])
        self.assertEqual(dropped, 2)

    def test_interpolates_a_missing_script_word(self):
        tokens, interpolated, _, _ = caption_tokens_from_script(
            _speak("קשה סילוקו של אדם"), "קשה סילוקו של אדם כשר")
        self.assertEqual([t.text for t in tokens], ["קשה", "סילוקו", "של", "אדם", "כשר"])
        self.assertEqual(interpolated, [4])

    def test_times_stay_monotonic(self):
        tokens, _, _, _ = caption_tokens_from_script(
            _speak("אחת שתיים שלוש ארבע חמש"), "אחת שתיים חדשה שלוש ארבע חמש")
        for previous, current in zip(tokens, tokens[1:]):
            self.assertGreaterEqual(current.start, previous.start)
            self.assertGreater(current.end, current.start)


if __name__ == "__main__":
    unittest.main()
