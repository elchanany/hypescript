import unittest

from hypescript.models import KeepInterval, Word
from hypescript.subtitles import build_cues


class HebrewCaptionGroupingTests(unittest.TestCase):
    def words(self, texts):
        return [Word(text, index * 0.3, index * 0.3 + 0.2) for index, text in enumerate(texts)]

    def clean_text(self, cue):
        return cue[2].replace("\u200f", "")

    def test_balances_budget_created_one_word_orphan(self):
        cues = build_cues(
            self.words(["אחד", "שתיים", "שלושה", "ארבעה"]),
            [KeepInterval(0, 2)],
            max_chars=20,
            max_lines=1,
            mode="phrase",
        )
        self.assertEqual([self.clean_text(cue) for cue in cues], ["אחד שתיים", "שלושה ארבעה"])

    def test_preserves_pause_boundary(self):
        words = self.words(["אחד", "שתיים", "שלושה", "ארבעה"])
        words[-1].start = 2.0
        words[-1].end = 2.2
        cues = build_cues(
            words,
            [KeepInterval(0, 3)],
            max_chars=20,
            max_lines=1,
            mode="phrase",
        )
        self.assertEqual(self.clean_text(cues[-1]), "ארבעה")


if __name__ == "__main__":
    unittest.main()
