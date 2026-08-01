"""ממשק שורת פקודה והרכבת ה-pipeline המלא.

זרימה: probe -> חילוץ אודיו -> תמלול -> [חיתוך-לפי-סקריפט] -> הסרת שתיקות
-> כתיבת SRT + לוג -> [render חיתוכים + burn] -> [אינטרו/אאוטרו].
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import tempfile
from dataclasses import dataclass
from typing import List, Optional

from . import __version__, editing, media, subtitles
from .models import KeepInterval
from .transcription import CLOUD_DEFAULT_MODEL, transcribe

log = logging.getLogger("hypescript")


# --------------------------------------------------------------------------- #
# הגדרות
# --------------------------------------------------------------------------- #
@dataclass
class Config:
    inputs: List[str]
    output: str
    srt_output: str
    log_output: str

    # מנוע
    engine: str
    model: str
    language: str
    device: str
    compute_type: str
    no_vad: bool

    # ענן
    cloud_provider: str
    cloud_base_url: Optional[str]
    api_key: Optional[str]
    cloud_chunk_sec: float

    # עריכה
    silence_threshold: float
    padding: float
    no_silence_removal: bool
    script: Optional[str]
    remove_fillers: bool
    fillers: Optional[str]

    # כתוביות
    max_chars: int
    max_lines: int
    burn_subs: bool
    no_srt: bool
    font: str
    font_size: Optional[int]

    # אינטרו/אאוטרו
    intro: Optional[str]
    outro: Optional[str]
    intro_duration: float
    outro_duration: float

    # כללי
    dry_run: bool
    crf: int
    preset: str


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="hypescript",
        description="עורך אוטומטי לסרטוני שיעורים בעברית: הסרת נשימות/שתיקות, "
        "כתוביות עברית מסונכרנות, וחיתוך אופציונלי לפי סקריפט.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument("input", nargs="+",
                   help="נתיב לקובץ וידאו אחד או יותר (כמה קבצים ישורשרו לציר-זמן אחד)")
    p.add_argument("-o", "--output", help="נתיב פלט הווידאו (ברירת מחדל: <שם>_edited.mp4)")
    p.add_argument("--srt-output", help="נתיב פלט ה-SRT (ברירת מחדל: <שם>.srt)")
    p.add_argument("--log-output", help="נתיב לוג החיתוכים JSON (ברירת מחדל: <שם>_cuts.json)")

    g = p.add_argument_group("מנוע תמלול")
    g.add_argument("--engine", choices=["local", "cloud"], default="cloud",
                   help="cloud=API תואם-OpenAI (ברירת מחדל); local=faster-whisper על המחשב")
    g.add_argument("--model", default=None,
                   help="מקומי: גודל מודל (tiny/base/small/medium/large-v3) או נתיב. "
                        "ענן: שם מודל. ברירות מחדל: medium (מקומי) / לפי הספק (ענן)")
    g.add_argument("--language", default="he", help="שפה (נכפית)")
    g.add_argument("--device", choices=["auto", "cpu", "cuda"], default="auto",
                   help="מקומי בלבד: זיהוי GPU אוטומטי, אחרת CPU")
    g.add_argument("--compute-type", default="auto",
                   help="מקומי בלבד: auto/int8/float16/float32")
    g.add_argument("--no-vad", action="store_true",
                   help="מקומי בלבד: כבה סינון VAD (לא מומלץ — VAD מונע מילות רפאים)")

    c = p.add_argument_group("מצב ענן")
    c.add_argument("--cloud-provider", choices=["groq", "openai", "custom"], default="groq")
    c.add_argument("--cloud-base-url", help="עקיפת כתובת ה-API (ל-custom)")
    c.add_argument("--api-key", help="מפתח API (או משתנה סביבה, ראה README)")
    c.add_argument("--cloud-chunk-sec", type=float, default=1200.0,
                   help="פיצול אוטומטי של אודיו ארוך מזה (שנ') לפני העלאה לענן")

    e = p.add_argument_group("עריכה")
    e.add_argument("--silence-threshold", type=float, default=0.4,
                   help="סף (שנ') שמעליו רווח בין מילים נחשב פאוזה ונחתך")
    e.add_argument("--padding", type=float, default=0.1,
                   help="ריפוד (שנ') שנשמר בכל צד של חיתוך")
    e.add_argument("--no-silence-removal", action="store_true",
                   help="אל תסיר שתיקות (שימושי אם רק רוצים כתוביות)")
    e.add_argument("--script", help="נתיב לקובץ טקסט עם הסקריפט ה'נקי' לחיתוך לפי תוכן")
    e.add_argument("--remove-fillers", action="store_true",
                   help="הסר מילות-מהסס וגמגומים (אה, אמ, המ...) אוטומטית")
    e.add_argument("--fillers",
                   help="רשימת מהססים מותאמת (מופרדת בפסיקים) במקום ברירת המחדל")

    s = p.add_argument_group("כתוביות")
    s.add_argument("--max-chars", type=int, default=42, help="מקסימום תווים בשורת כתובית")
    s.add_argument("--max-lines", type=int, default=2, help="מקסימום שורות בכתובית")
    s.add_argument("--burn-subs", action="store_true", help="צרוב את הכתוביות בווידאו")
    s.add_argument("--no-srt", action="store_true", help="אל תכתוב קובץ SRT")
    s.add_argument("--font", default="Arial", help="גופן לצריבה (חייב לתמוך בעברית)")
    s.add_argument("--font-size", type=int, help="גודל גופן לצריבה")

    io = p.add_argument_group("אינטרו/אאוטרו")
    io.add_argument("--intro", help="נתיב לפתיח (וידאו או תמונה)")
    io.add_argument("--outro", help="נתיב לסיומת (וידאו או תמונה)")
    io.add_argument("--intro-duration", type=float, default=4.0, help="משך פתיח-תמונה (שנ')")
    io.add_argument("--outro-duration", type=float, default=4.0, help="משך סיומת-תמונה (שנ')")

    o = p.add_argument_group("כללי")
    o.add_argument("--dry-run", action="store_true",
                   help="תמלל, חשב חיתוכים, כתוב SRT+לוג — בלי לרנדר וידאו")
    o.add_argument("--crf", type=int, default=20, help="איכות וידאו (נמוך=טוב יותר, 18-23 טיפוסי)")
    o.add_argument("--preset", default="medium", help="preset של x264 (איכות מול מהירות)")
    o.add_argument("-v", "--verbose", action="store_true", help="פלט מפורט (debug)")
    o.add_argument("--version", action="version", version=f"hypescript {__version__}")
    return p


def config_from_args(args: argparse.Namespace) -> Config:
    base, _ = os.path.splitext(args.input[0])
    model = args.model
    if model is None:
        model = "medium" if args.engine == "local" else CLOUD_DEFAULT_MODEL[args.cloud_provider]

    return Config(
        inputs=args.input,
        output=args.output or f"{base}_edited.mp4",
        srt_output=args.srt_output or f"{base}.srt",
        log_output=args.log_output or f"{base}_cuts.json",
        engine=args.engine,
        model=model,
        language=args.language,
        device=args.device,
        compute_type=args.compute_type,
        no_vad=args.no_vad,
        cloud_provider=args.cloud_provider,
        cloud_base_url=args.cloud_base_url,
        api_key=args.api_key,
        cloud_chunk_sec=args.cloud_chunk_sec,
        silence_threshold=args.silence_threshold,
        padding=args.padding,
        no_silence_removal=args.no_silence_removal,
        script=args.script,
        remove_fillers=args.remove_fillers,
        fillers=args.fillers,
        max_chars=args.max_chars,
        max_lines=args.max_lines,
        burn_subs=args.burn_subs,
        no_srt=args.no_srt,
        font=args.font,
        font_size=args.font_size,
        intro=args.intro,
        outro=args.outro,
        intro_duration=args.intro_duration,
        outro_duration=args.outro_duration,
        dry_run=args.dry_run,
        crf=args.crf,
        preset=args.preset,
    )


# --------------------------------------------------------------------------- #
# עזרי לוג
# --------------------------------------------------------------------------- #
def _fmt(sec: float) -> str:
    m, s = divmod(sec, 60)
    return f"{int(m):02d}:{s:05.2f}"


def write_cut_log(
    cfg: Config,
    duration: float,
    keeps: List[KeepInterval],
    removed: List,
) -> None:
    edited = editing.kept_duration(keeps)
    data = {
        "inputs": [os.path.abspath(p) for p in cfg.inputs],
        "engine": cfg.engine,
        "model": cfg.model,
        "language": cfg.language,
        "params": {
            "silence_threshold": cfg.silence_threshold,
            "padding": cfg.padding,
            "script_mode": bool(cfg.script),
            "silence_removal": not cfg.no_silence_removal,
        },
        "duration_original_sec": round(duration, 3),
        "duration_edited_sec": round(edited, 3),
        "removed_total_sec": round(duration - edited, 3),
        "num_cuts": len(removed),
        "kept_intervals": [{"start": round(iv.start, 3), "end": round(iv.end, 3)} for iv in keeps],
        "removed_intervals": [
            {"start": round(a, 3), "end": round(b, 3), "duration": round(b - a, 3)}
            for a, b in removed
        ],
    }
    with open(cfg.log_output, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
    log.info("נכתב לוג חיתוכים: %s", cfg.log_output)


# --------------------------------------------------------------------------- #
# הרכבה
# --------------------------------------------------------------------------- #
def _transcript_path(cfg: Config) -> str:
    base, _ = os.path.splitext(cfg.inputs[0])
    return f"{base}_transcript.txt"


def _write_transcript_report(cfg: Config, kept_words) -> None:
    """כותב את הטקסט הסופי שיישאר בסרטון — להגהה לפני/אחרי רינדור."""
    text = " ".join(w.text for w in kept_words).strip()
    with open(_transcript_path(cfg), "w", encoding="utf-8") as fh:
        fh.write(text + "\n")
    log.info("נכתב תמלול-סופי לקריאה: %s", _transcript_path(cfg))


def run(cfg: Config) -> int:
    media.check_ffmpeg()
    for p in cfg.inputs:
        if not os.path.isfile(p):
            raise RuntimeError(f"קובץ הקלט לא נמצא: {p}")

    tmpdir = tempfile.mkdtemp(prefix="hypescript_")
    try:
        # --- 0. שרשור כמה קבצים (אם צריך) ---
        if len(cfg.inputs) > 1:
            log.info("משרשר %d קבצי קלט לציר-זמן אחד...", len(cfg.inputs))
            source = media.concat_videos(
                cfg.inputs, os.path.join(tmpdir, "source.mp4"),
                crf=cfg.crf, preset=cfg.preset,
            )
        else:
            source = cfg.inputs[0]

        info = media.probe(source)
        duration = info["duration"]
        if duration <= 0:
            raise RuntimeError("לא הצלחתי לקרוא את משך הווידאו (probe).")
        log.info("מקור: משך %s | %dx%d @ %.2ffps",
                 _fmt(duration), info["width"], info["height"], info["fps"])

        # --- 1. חילוץ אודיו + תמלול ---
        audio_ext = ".mp3" if cfg.engine == "cloud" else ".wav"
        audio_path = os.path.join(tmpdir, f"audio{audio_ext}")
        log.info("מחלץ אודיו לתמלול...")
        media.extract_audio(source, audio_path, compressed=(cfg.engine == "cloud"))

        log.info("מתמלל (%s)... זה עשוי לקחת זמן.", cfg.engine)
        transcript = transcribe(audio_path, cfg)
        words = transcript.all_words()
        if not words:
            raise RuntimeError(
                "התמלול לא החזיר מילים עם timestamps. בדוק שהקובץ מכיל דיבור, "
                "ושהמנוע/המודל תומך ב-word timestamps."
            )
        log.info("התקבלו %d מילים מתומללות.", len(words))

        # --- 2. בחירת מילים לשמירה: סקריפט + הסרת מהססים (מסכה אחת מאוחדת) ---
        mask = [True] * len(words)
        if cfg.script:
            if not os.path.isfile(cfg.script):
                raise RuntimeError(f"קובץ הסקריפט לא נמצא: {cfg.script}")
            with open(cfg.script, "r", encoding="utf-8") as fh:
                script_text = fh.read()
            script_mask = editing.script_keep_mask(words, script_text)
            mask = [m and s for m, s in zip(mask, script_mask)]
        if cfg.remove_fillers:
            fillers = editing.parse_fillers(cfg.fillers)
            fmask = editing.filler_mask(words, fillers)
            mask = [m and not f for m, f in zip(mask, fmask)]

        kept_words = [w for w, m in zip(words, mask) if m]
        if not kept_words:
            raise RuntimeError("אחרי הסינון לא נשארו מילים. בדוק את הסקריפט/רשימת המהססים.")

        # --- 3. בניית קטעי keep (הסרת שתיקות + חיתוך מילים שהוסרו) ---
        if cfg.no_silence_removal and not cfg.script and not cfg.remove_fillers:
            keeps = editing.whole_video(duration)
        else:
            keeps = editing.build_keep_intervals(
                words, duration,
                threshold=cfg.silence_threshold, padding=cfg.padding,
                keep_mask=mask,
            )
        if not keeps:
            raise RuntimeError("לא נותרו קטעים לשמור.")

        # --- קובץ תמלול-סופי לקריאה/הגהה ---
        _write_transcript_report(cfg, kept_words)

        removed = editing.removed_intervals(keeps, duration)
        edited_dur = editing.kept_duration(keeps)
        log.info(
            "עריכה: %d קטעים נשמרים, %d חיתוכים, הוסרו %s (מ-%s ל-%s).",
            len(keeps), len(removed), _fmt(duration - edited_dur), _fmt(duration), _fmt(edited_dur),
        )

        # --- 4. לוג ---
        write_cut_log(cfg, duration, keeps, removed)

        # --- 5. כתוביות ---
        if not cfg.no_srt or cfg.burn_subs:
            cues = subtitles.build_cues(
                kept_words, keeps, max_chars=cfg.max_chars, max_lines=cfg.max_lines,
            )
            if not cfg.no_srt:
                subtitles.write_srt(cues, cfg.srt_output)
            if cfg.burn_subs:
                # תמיד כותבים SRT זמני לצריבה גם אם המשתמש ביקש --no-srt.
                burn_srt = cfg.srt_output if not cfg.no_srt else os.path.join(tmpdir, "burn.srt")
                if cfg.no_srt:
                    subtitles.write_srt(cues, burn_srt)
        else:
            burn_srt = None

        if cfg.dry_run:
            log.info("dry-run: דילגתי על רינדור הווידאו. SRT ולוג נכתבו.")
            _print_summary(cfg, duration, edited_dur, removed, rendered=False)
            return 0

        # --- 6. רינדור חיתוכים (+ צריבה אופציונלית) ---
        needs_cut = len(removed) > 0
        if not needs_cut and not cfg.burn_subs:
            log.info("אין חיתוכים ולא ביקשת צריבה — מדלג על רינדור.")
            edited_video = source
            produced_new = False
        else:
            edited_video = (
                cfg.output if not (cfg.intro or cfg.outro)
                else os.path.join(tmpdir, "edited.mp4")
            )
            log.info("מרנדר וידאו ערוך%s...", " + צריבת כתוביות" if cfg.burn_subs else "")
            media.render_cut(
                source, keeps, edited_video,
                srt_path=(burn_srt if cfg.burn_subs else None),
                font=cfg.font, font_size=cfg.font_size,
                crf=cfg.crf, preset=cfg.preset,
            )
            produced_new = True

        # --- 7. אינטרו / אאוטרו ---
        if cfg.intro or cfg.outro:
            for path, label in ((cfg.intro, "אינטרו"), (cfg.outro, "אאוטרו")):
                if path and not os.path.isfile(path):
                    raise RuntimeError(f"קובץ ה{label} לא נמצא: {path}")
            log.info("מוסיף אינטרו/אאוטרו...")
            media.concat_with_intro_outro(
                edited_video, cfg.output,
                intro=cfg.intro, outro=cfg.outro,
                intro_duration=cfg.intro_duration, outro_duration=cfg.outro_duration,
                crf=cfg.crf, preset=cfg.preset,
            )
            produced_new = True

        if not produced_new:
            log.info("לא נוצר וידאו חדש (הקלט כבר 'מוכן'). ראה SRT ולוג.")
        _print_summary(cfg, duration, edited_dur, removed, rendered=produced_new)
        return 0
    finally:
        import shutil
        shutil.rmtree(tmpdir, ignore_errors=True)


def _print_summary(cfg, duration, edited_dur, removed, *, rendered: bool) -> None:
    print("\n" + "=" * 60)
    print("  hypescript — סיכום")
    print("=" * 60)
    print(f"  משך מקורי : {_fmt(duration)}")
    print(f"  משך ערוך  : {_fmt(edited_dur)}  (הוסרו {_fmt(duration - edited_dur)})")
    print(f"  חיתוכים   : {len(removed)}")
    if rendered:
        print(f"  וידאו     : {cfg.output}")
    if not cfg.no_srt:
        print(f"  כתוביות   : {cfg.srt_output}")
    print(f"  תמלול-סופי: {_transcript_path(cfg)}")
    print(f"  לוג       : {cfg.log_output}")
    print("=" * 60 + "\n")


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #
def main(argv: Optional[List[str]] = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s  %(levelname)-7s  %(message)s",
        datefmt="%H:%M:%S",
    )

    try:
        cfg = config_from_args(args)
        return run(cfg)
    except KeyboardInterrupt:
        log.error("הופסק על ידי המשתמש.")
        return 130
    except RuntimeError as exc:
        log.error("%s", exc)
        return 1
    except Exception as exc:  # noqa: BLE001
        log.exception("שגיאה לא צפויה: %s", exc)
        return 2


if __name__ == "__main__":
    sys.exit(main())
