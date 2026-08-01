"""עטיפות ל-FFmpeg / FFprobe: probe, חילוץ אודיו, חיתוך+הרכבה, אינטרו/אאוטרו.

כל החיתוכים נעשים עם re-encode דרך ``filter_complex`` (trim+concat) כדי לקבל
חיתוך מדויק ברמת המילה. concat בלי re-encode היה נשבר על גבולות שאינם keyframe.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile
from typing import List, Optional

from .models import KeepInterval

log = logging.getLogger("hypescript")


# --------------------------------------------------------------------------- #
# איתור הכלים
# --------------------------------------------------------------------------- #
def _find_exe(name: str) -> str:
    path = shutil.which(name)
    if not path:
        raise RuntimeError(
            f"'{name}' לא נמצא ב-PATH. התקן FFmpeg (ראה README) וודא שהוא נגיש מהטרמינל."
        )
    return path


def ffmpeg_path() -> str:
    return _find_exe("ffmpeg")


def ffprobe_path() -> str:
    return _find_exe("ffprobe")


def check_ffmpeg() -> None:
    """מוודא ש-ffmpeg ו-ffprobe קיימים; זורק שגיאה ברורה אם לא."""
    ffmpeg_path()
    ffprobe_path()


# --------------------------------------------------------------------------- #
# הרצה
# --------------------------------------------------------------------------- #
def _run(cmd: List[str], cwd: Optional[str] = None) -> None:
    """מריץ פקודה ומאפשר ל-FFmpeg להדפיס התקדמות למסך. זורק על כשל."""
    log.debug("מריץ: %s", " ".join(cmd))
    try:
        subprocess.run(cmd, cwd=cwd, check=True)
    except subprocess.CalledProcessError as exc:
        raise RuntimeError(f"FFmpeg נכשל (קוד {exc.returncode}). ראה את הפלט למעלה.") from exc


# --------------------------------------------------------------------------- #
# Probe
# --------------------------------------------------------------------------- #
def probe(path: str) -> dict:
    """מחזיר {duration, width, height, fps, sample_rate, channels, has_audio}."""
    cmd = [
        ffprobe_path(),
        "-v", "error",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    if out.returncode != 0:
        raise RuntimeError(f"ffprobe נכשל על '{path}': {out.stderr.strip()}")
    data = json.loads(out.stdout)

    info = {
        "duration": float(data.get("format", {}).get("duration", 0.0) or 0.0),
        "width": 1920,
        "height": 1080,
        "fps": 30.0,
        "sample_rate": 48000,
        "channels": 2,
        "has_audio": False,
    }
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video" and "width" in stream:
            info["width"] = int(stream["width"])
            info["height"] = int(stream["height"])
            info["fps"] = _parse_fps(stream.get("r_frame_rate", "30/1"))
        elif stream.get("codec_type") == "audio":
            info["has_audio"] = True
            info["sample_rate"] = int(stream.get("sample_rate", 48000) or 48000)
            info["channels"] = int(stream.get("channels", 2) or 2)
    return info


def _parse_fps(rate: str) -> float:
    try:
        if "/" in rate:
            num, den = rate.split("/")
            den = float(den)
            return float(num) / den if den else 30.0
        return float(rate)
    except (ValueError, ZeroDivisionError):
        return 30.0


# --------------------------------------------------------------------------- #
# חילוץ אודיו לתמלול
# --------------------------------------------------------------------------- #
def split_audio(audio_path: str, chunk_sec: float, out_dir: str) -> List[tuple]:
    """מפצל קובץ אודיו לחלקים באורך ``chunk_sec``. מחזיר [(נתיב, offset_שניות)].

    משמש למצב ענן כשהאודיו ארוך מדי למגבלת הגודל של ה-API. הפיצול ב-re-encode
    (ולא copy) כדי לשמור על דיוק חותמות-הזמן בקצוות.
    """
    duration = probe(audio_path)["duration"]
    if duration <= chunk_sec:
        return [(audio_path, 0.0)]

    import math

    n = int(math.ceil(duration / chunk_sec))
    ext = os.path.splitext(audio_path)[1] or ".mp3"
    chunks: List[tuple] = []
    for i in range(n):
        start = i * chunk_sec
        out = os.path.join(out_dir, f"chunk_{i:03d}{ext}")
        cmd = [ffmpeg_path(), "-y", "-ss", f"{start:.3f}", "-t", f"{chunk_sec:.3f}",
               "-i", audio_path, "-ac", "1", "-ar", "16000",
               "-c:a", "libmp3lame", "-b:a", "64k", out]
        _run(cmd)
        chunks.append((out, start))
    log.info("האודיו פוצל ל-%d חלקים (בגלל אורך/גודל).", n)
    return chunks


def extract_audio(input_path: str, out_path: str, *, compressed: bool) -> str:
    """מחלץ אודיו mono 16kHz.

    compressed=True  -> mp3 קטן (למצב ענן, כדי לעמוד במגבלות גודל ההעלאה).
    compressed=False -> wav pcm (למצב מקומי, ללא הפסד).
    """
    cmd = [ffmpeg_path(), "-y", "-i", input_path, "-vn", "-ac", "1", "-ar", "16000"]
    if compressed:
        cmd += ["-c:a", "libmp3lame", "-b:a", "64k"]
    else:
        cmd += ["-c:a", "pcm_s16le"]
    cmd += [out_path]
    _run(cmd)
    return out_path


# --------------------------------------------------------------------------- #
# חיתוך + הרכבה מחדש
# --------------------------------------------------------------------------- #
def render_cut(
    input_path: str,
    keeps: List[KeepInterval],
    output_path: str,
    *,
    srt_path: Optional[str] = None,
    font: str = "Arial",
    font_size: Optional[int] = None,
    crf: int = 20,
    preset: str = "medium",
) -> None:
    """חותך את קטעי ה-keep ומרכיב אותם מחדש לקובץ אחד.

    אם ``srt_path`` ניתן — הכתוביות נצרבות (burn-in) דרך libass.
    """
    if not keeps:
        raise RuntimeError("אין קטעים לשמור — התמלול ריק?")

    work = tempfile.mkdtemp(prefix="hypescript_cut_")
    try:
        lines: List[str] = []
        concat_inputs: List[str] = []
        for i, iv in enumerate(keeps):
            lines.append(
                f"[0:v]trim=start={iv.start:.3f}:end={iv.end:.3f},"
                f"setpts=PTS-STARTPTS[v{i}];"
            )
            lines.append(
                f"[0:a]atrim=start={iv.start:.3f}:end={iv.end:.3f},"
                f"asetpts=PTS-STARTPTS[a{i}];"
            )
            concat_inputs.append(f"[v{i}][a{i}]")

        n = len(keeps)
        lines.append(f"{''.join(concat_inputs)}concat=n={n}:v=1:a=1[cv][ca];")

        vlabel = "[cv]"
        if srt_path:
            # מעתיקים את ה-SRT אל תיקיית העבודה בשם קבוע כדי לעקוף את בעיית
            # escaping של נתיבים (עם ':' ו-'\') בפילטר subtitles ב-Windows.
            shutil.copyfile(srt_path, os.path.join(work, "subs.srt"))
            style = f"FontName={font},Alignment=2"
            if font_size:
                style += f",Fontsize={font_size}"
            lines.append(f"[cv]subtitles=subs.srt:force_style='{style}'[vs];")
            vlabel = "[vs]"

        filter_text = "\n".join(lines).rstrip(";\n")
        filter_file = os.path.join(work, "filter.txt")
        with open(filter_file, "w", encoding="utf-8") as fh:
            fh.write(filter_text)

        cmd = [
            ffmpeg_path(), "-y",
            "-i", os.path.abspath(input_path),
            "-filter_complex_script", "filter.txt",
            "-map", vlabel, "-map", "[ca]",
            "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            os.path.abspath(output_path),
        ]
        _run(cmd, cwd=work)
    finally:
        shutil.rmtree(work, ignore_errors=True)


# --------------------------------------------------------------------------- #
# אינטרו / אאוטרו
# --------------------------------------------------------------------------- #
def concat_with_intro_outro(
    main_path: str,
    output_path: str,
    *,
    intro: Optional[str] = None,
    outro: Optional[str] = None,
    intro_duration: float = 4.0,
    outro_duration: float = 4.0,
    crf: int = 20,
    preset: str = "medium",
) -> None:
    """משרשר אינטרו + הסרטון הערוך + אאוטרו לקובץ אחד.

    כל חלק מנורמל לרזולוציה/fps/אודיו של הסרטון הראשי דרך פילטר concat
    (מטפל בקבצי תמונה וגם וידאו, וברזולוציות שונות).
    """
    target = probe(main_path)
    w, h, fps = target["width"], target["height"], target["fps"]
    ar = 44100

    parts = []
    if intro:
        parts.append({"path": intro, "is_image": _is_image(intro), "duration": intro_duration})
    parts.append({"path": main_path, "is_image": False, "duration": 0.0})
    if outro:
        parts.append({"path": outro, "is_image": _is_image(outro), "duration": outro_duration})

    work = tempfile.mkdtemp(prefix="hypescript_io_")
    try:
        cmd = [ffmpeg_path(), "-y"]
        filt: List[str] = []
        idx = 0
        vlabels: List[str] = []
        alabels: List[str] = []

        for part in parts:
            if part["is_image"]:
                cmd += ["-loop", "1", "-t", f'{part["duration"]}', "-i", os.path.abspath(part["path"])]
                vin = idx; idx += 1
                cmd += ["-f", "lavfi", "-t", f'{part["duration"]}',
                        "-i", f"anullsrc=channel_layout=stereo:sample_rate={ar}"]
                ain = idx; idx += 1
            else:
                cmd += ["-i", os.path.abspath(part["path"])]
                vin = ain = idx; idx += 1

            k = len(vlabels)
            filt.append(
                f"[{vin}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
                f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps},format=yuv420p[v{k}];"
            )
            filt.append(
                f"[{ain}:a]aformat=sample_rates={ar}:channel_layouts=stereo,"
                f"asetpts=PTS-STARTPTS[a{k}];"
            )
            vlabels.append(f"[v{k}]")
            alabels.append(f"[a{k}]")

        inter = "".join(v + a for v, a in zip(vlabels, alabels))
        filt.append(f"{inter}concat=n={len(parts)}:v=1:a=1[outv][outa]")

        filter_file = os.path.join(work, "filter.txt")
        with open(filter_file, "w", encoding="utf-8") as fh:
            fh.write("\n".join(filt))

        cmd += [
            "-filter_complex_script", filter_file,
            "-map", "[outv]", "-map", "[outa]",
            "-c:v", "libx264", "-preset", preset, "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            os.path.abspath(output_path),
        ]
        _run(cmd)
    finally:
        shutil.rmtree(work, ignore_errors=True)


_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".bmp", ".webp", ".gif", ".tif", ".tiff"}


def _is_image(path: str) -> bool:
    return os.path.splitext(path)[1].lower() in _IMAGE_EXTS


# --------------------------------------------------------------------------- #
# שרשור כמה סרטוני קלט לציר-זמן אחד
# --------------------------------------------------------------------------- #
def concat_videos(paths: List[str], output_path: str, *, crf: int = 20, preset: str = "medium") -> str:
    """משרשר כמה סרטונים לקובץ אחד (למצב 'כמה קבצים -> וידאו אחד').

    אם כל הקבצים זהים בפרמטרים (רזולוציה/fps) — משרשר בלי re-encode לשמירת
    איכות מלאה. אחרת מנרמל ומרנדר פעם אחת.
    """
    if len(paths) == 1:
        return paths[0]

    infos = [probe(p) for p in paths]
    same = all(
        (i["width"], i["height"], round(i["fps"], 2))
        == (infos[0]["width"], infos[0]["height"], round(infos[0]["fps"], 2))
        for i in infos
    )
    if same:
        log.info("כל הקבצים באותו פורמט — משרשר ללא re-encode (איכות מלאה).")
        try:
            _concat_copy(paths, output_path)
            return output_path
        except RuntimeError:
            log.info("שרשור-copy נכשל — עובר לרינדור מנורמל.")

    log.info("קבצים בפורמטים שונים — מנרמל ומשרשר.")
    target = max(infos, key=lambda i: i["width"] * i["height"])
    _concat_reencode(paths, output_path, target["width"], target["height"],
                     target["fps"], crf=crf, preset=preset)
    return output_path


def _concat_copy(paths: List[str], output_path: str) -> None:
    work = tempfile.mkdtemp(prefix="hypescript_cc_")
    try:
        list_path = os.path.join(work, "list.txt")
        with open(list_path, "w", encoding="utf-8") as fh:
            for p in paths:
                safe = os.path.abspath(p).replace("\\", "/").replace("'", "'\\''")
                fh.write(f"file '{safe}'\n")
        _run([ffmpeg_path(), "-y", "-f", "concat", "-safe", "0",
              "-i", list_path, "-c", "copy", "-movflags", "+faststart",
              os.path.abspath(output_path)])
    finally:
        shutil.rmtree(work, ignore_errors=True)


def _concat_reencode(paths: List[str], output_path: str, w: int, h: int, fps: float,
                     *, crf: int, preset: str) -> None:
    work = tempfile.mkdtemp(prefix="hypescript_cr_")
    try:
        cmd = [ffmpeg_path(), "-y"]
        for p in paths:
            cmd += ["-i", os.path.abspath(p)]
        filt: List[str] = []
        labels: List[str] = []
        for idx in range(len(paths)):
            filt.append(
                f"[{idx}:v]scale={w}:{h}:force_original_aspect_ratio=decrease,"
                f"pad={w}:{h}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={fps},format=yuv420p[v{idx}];"
            )
            filt.append(
                f"[{idx}:a]aformat=sample_rates=44100:channel_layouts=stereo,"
                f"asetpts=PTS-STARTPTS[a{idx}];"
            )
            labels.append(f"[v{idx}][a{idx}]")
        filt.append(f"{''.join(labels)}concat=n={len(paths)}:v=1:a=1[outv][outa]")
        filter_file = os.path.join(work, "filter.txt")
        with open(filter_file, "w", encoding="utf-8") as fh:
            fh.write("\n".join(filt))
        cmd += ["-filter_complex_script", filter_file, "-map", "[outv]", "-map", "[outa]",
                "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
                os.path.abspath(output_path)]
        _run(cmd)
    finally:
        shutil.rmtree(work, ignore_errors=True)
