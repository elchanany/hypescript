import unittest

from hypescript.models import Word
from hypescript.semantic_timeline import energy_evidence_from_db, evidence_from_words, explicit_gap


class SemanticTimelineTests(unittest.TestCase):
    def test_maps_only_direct_provider_evidence(self):
        spans = evidence_from_words(
            [
                Word("שלום", 10.1, 10.4, "word", "A"),
                Word("עולם", 10.5, 10.8, "word", "A"),
                Word("[cough]", 11.0, 11.25, "audio_event"),
                Word(" ", 11.3, 11.4, "spacing"),
            ],
            source_start=10,
            source_end=12,
            timeline_start=2,
            source_id="media-1",
        )
        self.assertEqual([span.kind for span in spans], ["speech", "audio_event"])
        self.assertEqual(spans[0].text, "שלום עולם")
        self.assertAlmostEqual(spans[0].start, 2.1)
        self.assertEqual(spans[1].evidence, "provider_audio_event")
        self.assertFalse(any("breath" in (span.text or "") for span in spans))

    def test_missing_transcript_is_not_a_gap(self):
        self.assertEqual(
            evidence_from_words([], source_start=0, source_end=4),
            [],
        )
        gap = explicit_gap(4, 4.5)
        self.assertEqual((gap.kind, gap.evidence), ("gap", "explicit_timeline_gap"))

    def test_energy_is_measured_without_semantic_inference(self):
        spans = energy_evidence_from_db(
            [-60, -60, -30, -30],
            hop=0.5,
            floor_db=-60,
            source_start=0,
            source_end=2,
            source_id="media-1",
            window_sec=0.5,
        )
        self.assertEqual([span.energy_level for span in spans], ["low", "elevated"])
        self.assertTrue(all(span.evidence == "measured_rms_dbfs" for span in spans))
        self.assertTrue(all(span.text is None for span in spans))


if __name__ == "__main__":
    unittest.main()
