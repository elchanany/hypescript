import unittest

from hypescript.editing import build_keep_intervals
from hypescript.models import Word


class TightEditingTests(unittest.TestCase):
    def test_measured_quiet_valley_places_cut_inside_waveform_gap(self):
        db = [-12.0] * 100
        for index in range(70, 79):
            db[index] = -55.0
        keeps = build_keep_intervals(
            [Word("מילה", 1.0, 1.3), Word("הבאה", 1.7, 1.95)],
            2.0, threshold=0.14, padding=0.02,
            energy={"hop": 0.02, "db": db, "floor_db": -55.0},
            energy_threshold_db=-40.0, min_quiet=0.04,
        )
        self.assertEqual([(round(item.start, 2), round(item.end, 2)) for item in keeps], [
            (0.98, 1.42), (1.56, 1.97),
        ])

    def test_tight_defaults_shape_removes_short_non_speech_gap(self):
        keeps = build_keep_intervals(
            [
                Word("שלום", 1.0, 1.4),
                Word("וברכה", 1.63, 2.0),
            ],
            5.0,
            threshold=0.22,
            padding=0.04,
        )
        self.assertEqual([(round(item.start, 2), round(item.end, 2)) for item in keeps], [
            (0.96, 1.44),
            (1.59, 2.04),
        ])

    def test_explicit_audio_event_is_removed_and_forces_boundary(self):
        keeps = build_keep_intervals(
            [
                Word("שלום", 1.0, 1.4, type="word"),
                Word("(breath)", 1.42, 1.50, type="audio_event"),
                Word("וברכה", 1.52, 1.9, type="word"),
            ],
            5.0,
            threshold=0.22,
            padding=0.01,
        )
        self.assertEqual(len(keeps), 2)
        self.assertLess(keeps[0].end, keeps[1].start)

    def test_padding_never_produces_repeated_source_time(self):
        keeps = build_keep_intervals(
            [Word("א", 10.0, 10.2), Word("ב", 10.31, 10.5)],
            20.0,
            threshold=0.1,
            padding=0.1,
        )
        # Overlapping handles merge to one interval instead of replaying 10.21-10.30.
        self.assertEqual(len(keeps), 1)
        self.assertEqual((keeps[0].start, keeps[0].end), (9.9, 10.6))


if __name__ == "__main__":
    unittest.main()
