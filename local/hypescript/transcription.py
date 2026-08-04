"""מנועי תמלול: מקומי (faster-whisper) וענן (API תואם-OpenAI, ברירת מחדל Groq).

שני המנועים מחזירים ``Transcript`` זהה עם word-level timestamps מדויקים.
היבוא של כל תלות נעשה בעצלתיים (lazy) כדי שמשתמשי-ענן לא יצטרכו להתקין
את faster-whisper, ולהפך.
"""

from __future__ import annotations

import logging
import os
from typing import List, Optional

from .models import Segment, Transcript, Word

log = logging.getLogger("hypescript")

# נקודות קצה תואמות-OpenAI. אפשר להוסיף/לעקוף עם --cloud-base-url.
CLOUD_PROVIDERS = {
    "groq": "https://api.groq.com/openai/v1",
    "openai": "https://api.openai.com/v1",
}

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"

# מודל ברירת מחדל לכל ספק ענן.
CLOUD_DEFAULT_MODEL = {
    "groq": "whisper-large-v3",
    "openai": "whisper-1",
    "custom": "whisper-large-v3",
    "elevenlabs": "scribe_v2",
}


# --------------------------------------------------------------------------- #
# מקומי: faster-whisper
# --------------------------------------------------------------------------- #
def resolve_device(device: str) -> str:
    """מזהה GPU (CUDA) אוטומטית דרך CTranslate2 (בלי לחייב torch). אחרת CPU."""
    if device != "auto":
        return device
    try:
        import ctranslate2

        if ctranslate2.get_cuda_device_count() > 0:
            return "cuda"
    except Exception:  # noqa: BLE001 - זיהוי best-effort
        pass
    return "cpu"


def resolve_compute_type(compute_type: str, device: str) -> str:
    if compute_type != "auto":
        return compute_type
    return "float16" if device == "cuda" else "int8"


def transcribe_local(
    audio_path: str,
    *,
    model: str,
    language: str,
    device: str = "auto",
    compute_type: str = "auto",
    vad_filter: bool = True,
) -> Transcript:
    """מתמלל מקומית עם faster-whisper, כולל word timestamps.

    ``vad_filter`` (Silero VAD) מומלץ: הוא מדלג על אזורי שקט/רעש ובכך מונע
    'מילות רפאים' שווizper לפעמים ממציא בשתיקות — קריטי לדיוק החיתוכים.
    """
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper לא מותקן. הרץ:  pip install faster-whisper\n"
            "לחלופין השתמש במצב ענן:  --engine cloud"
        ) from exc

    device = resolve_device(device)
    compute_type = resolve_compute_type(compute_type, device)
    log.info("תמלול מקומי: model=%s device=%s compute=%s", model, device, compute_type)

    whisper = WhisperModel(model, device=device, compute_type=compute_type)
    segments_gen, info = whisper.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
        vad_filter=vad_filter,
        vad_parameters={"min_silence_duration_ms": 300} if vad_filter else None,
        condition_on_previous_text=False,  # מפחית הזיות/גלישת טקסט בעברית
    )

    segments: List[Segment] = []
    for seg in segments_gen:
        words: List[Word] = []
        for w in seg.words or []:
            if w.start is None or w.end is None:
                continue
            text = w.word.strip()
            if text:
                words.append(Word(text=text, start=float(w.start), end=float(w.end)))
        segments.append(
            Segment(text=seg.text.strip(), start=float(seg.start), end=float(seg.end), words=words)
        )

    detected = getattr(info, "language", language) or language
    log.info("תמלול הושלם: %d קטעים, שפה=%s", len(segments), detected)
    return Transcript(language=detected, segments=segments)


# --------------------------------------------------------------------------- #
# ענן: API תואם-OpenAI (Groq / OpenAI / custom)
# --------------------------------------------------------------------------- #
def resolve_api_key(explicit: Optional[str], provider: str) -> str:
    """סדר עדיפויות: --api-key -> HYPESCRIPT_API_KEY -> מפתח ספציפי לספק -> .env."""
    if explicit:
        return explicit
    _load_dotenv()
    for name in ("HYPESCRIPT_API_KEY", f"{provider.upper()}_API_KEY"):
        val = os.environ.get(name)
        if val:
            return val.strip()
    raise RuntimeError(
        "לא נמצא מפתח API למצב ענן. הגדר משתנה סביבה, למשל:\n"
        "  PowerShell:  $env:GROQ_API_KEY = \"gsk_...\"\n"
        "או העבר  --api-key gsk_...  (ראה README, סעיף 'מצב ענן')."
    )


def _load_dotenv() -> None:
    """טעינה מינימלית של קובץ .env מהתיקייה הנוכחית (ללא תלות חיצונית)."""
    path = os.path.join(os.getcwd(), ".env")
    if not os.path.isfile(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
    except OSError:
        pass


def transcribe_cloud(
    audio_path: str,
    *,
    model: str,
    language: str,
    provider: str = "groq",
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
    timeout: int = 600,
    chunk_sec: float = 1200.0,
    max_retries: int = 3,
) -> Transcript:
    """מתמלל בענן (Groq/OpenAI תואם-OpenAI, או ElevenLabs Scribe).

    כולל שני שכבות עמידות:
      * **פיצול אוטומטי** של אודיו ארוך מ-``chunk_sec`` (כדי לא לחרוג ממגבלת
        הגודל של ה-API), ומיזוג התוצאות עם היסט-זמן.
      * **retry עם backoff** על שגיאות רשת/שרת רגעיות (5xx / 429 / timeout).
    """
    try:
        import requests  # noqa: F401
    except ImportError as exc:
        raise RuntimeError("החבילה 'requests' חסרה. הרץ:  pip install requests") from exc

    if provider == "elevenlabs":
        return _transcribe_elevenlabs(
            audio_path,
            model=model,
            language=language,
            api_key=api_key,
            timeout=timeout,
            chunk_sec=chunk_sec,
            max_retries=max_retries,
        )

    key = resolve_api_key(api_key, provider)
    root = base_url or CLOUD_PROVIDERS.get(provider)
    if not root:
        raise RuntimeError(f"ספק ענן לא מוכר: {provider}. השתמש ב---cloud-base-url.")
    url = root.rstrip("/") + "/audio/transcriptions"
    log.info("תמלול ענן: provider=%s model=%s", provider, model)

    from . import media

    tmp_dir = os.path.dirname(audio_path) or "."
    chunks = media.split_audio(audio_path, chunk_sec, tmp_dir)

    all_words: List[Word] = []
    full_text_parts: List[str] = []
    detected = language
    for chunk_path, offset in chunks:
        payload = _post_transcription(url, key, chunk_path, model, language, timeout, max_retries)
        part = _cloud_payload_to_transcript(payload, language)
        detected = part.language or detected
        if part.text:
            full_text_parts.append(part.text)
        for w in part.all_words():
            all_words.append(
                Word(
                    text=w.text,
                    start=w.start + offset,
                    end=w.end + offset,
                    type=w.type,
                    speaker_id=w.speaker_id,
                )
            )

    if not all_words:
        return Transcript(language=detected, segments=[])
    segment = Segment(
        text=" ".join(full_text_parts).strip(),
        start=all_words[0].start,
        end=all_words[-1].end,
        words=all_words,
    )
    log.info("תמלול ענן הושלם: %d מילים (%d חלקים)", len(all_words), len(chunks))
    return Transcript(language=detected, segments=[segment])


def _transcribe_elevenlabs(
    audio_path: str,
    *,
    model: str,
    language: str,
    api_key: Optional[str],
    timeout: int,
    chunk_sec: float,
    max_retries: int,
) -> Transcript:
    """תמלול דרך ElevenLabs Speech-to-Text (Scribe)."""
    key = resolve_api_key(api_key, "elevenlabs")
    log.info("תמלול ElevenLabs: model=%s", model)

    from . import media

    tmp_dir = os.path.dirname(audio_path) or "."
    chunks = media.split_audio(audio_path, chunk_sec, tmp_dir)

    all_words: List[Word] = []
    full_text_parts: List[str] = []
    detected = language
    for chunk_path, offset in chunks:
        payload = _post_elevenlabs_stt(key, chunk_path, model, language, timeout, max_retries)
        part = _elevenlabs_payload_to_transcript(payload, language)
        detected = part.language or detected
        if part.text:
            full_text_parts.append(part.text)
        for w in part.all_words():
            all_words.append(
                Word(
                    text=w.text,
                    start=w.start + offset,
                    end=w.end + offset,
                    type=w.type,
                    speaker_id=w.speaker_id,
                )
            )

    if not all_words:
        return Transcript(language=detected, segments=[])
    segment = Segment(
        text=" ".join(full_text_parts).strip(),
        start=all_words[0].start,
        end=all_words[-1].end,
        words=all_words,
    )
    log.info("תמלול ElevenLabs הושלם: %d טוקנים (%d חלקים)", len(all_words), len(chunks))
    return Transcript(language=detected, segments=[segment])


def _post_elevenlabs_stt(key, audio_path, model, language, timeout, max_retries) -> dict:
    import time

    import requests

    last_err = ""
    for attempt in range(1, max_retries + 1):
        try:
            with open(audio_path, "rb") as fh:
                files = {"file": (os.path.basename(audio_path), fh, "audio/mpeg")}
                data = {
                    "model_id": model,
                    "language_code": language,
                    "tag_audio_events": "true",
                    "diarize": "true",
                    "timestamps_granularity": "word",
                }
                resp = requests.post(
                    ELEVENLABS_STT_URL,
                    headers={"xi-api-key": key},
                    files=files,
                    data=data,
                    timeout=timeout,
                )
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504):
                last_err = f"{resp.status_code}: {resp.text[:200]}"
            else:
                raise RuntimeError(f"שגיאת ElevenLabs ({resp.status_code}): {resp.text[:500]}")
        except requests.RequestException as exc:
            last_err = str(exc)

        if attempt < max_retries:
            wait = 2 ** attempt
            log.warning(
                "ElevenLabs נכשל (ניסיון %d/%d): %s — מנסה שוב בעוד %ds",
                attempt,
                max_retries,
                last_err,
                wait,
            )
            time.sleep(wait)

    raise RuntimeError(f"ElevenLabs נכשל אחרי {max_retries} ניסיונות. אחרון: {last_err}")


def _elevenlabs_payload_to_transcript(payload: dict, language: str) -> Transcript:
    raw_words = payload.get("words") or []
    words: List[Word] = []
    for w in raw_words:
        text = (w.get("text") or w.get("word") or "").strip()
        if not text or w.get("start") is None or w.get("end") is None:
            continue
        wtype = w.get("type")
        if wtype not in ("word", "spacing", "audio_event"):
            wtype = "audio_event" if text.startswith("[") and text.endswith("]") else "word"
        words.append(
            Word(
                text=text,
                start=float(w["start"]),
                end=float(w["end"]),
                type=wtype,
                speaker_id=w.get("speaker_id"),
            )
        )
    if not words:
        return Transcript(language=payload.get("language_code") or language, segments=[])
    full_text = (payload.get("text") or "").strip()
    segments = [Segment(text=full_text, start=words[0].start, end=words[-1].end, words=words)]
    return Transcript(language=payload.get("language_code") or language, segments=segments)


def _post_transcription(url, key, audio_path, model, language, timeout, max_retries) -> dict:
    """קריאה בודדת ל-API עם retry ו-backoff. מחזיר את ה-JSON."""
    import time

    import requests

    last_err = ""
    for attempt in range(1, max_retries + 1):
        try:
            with open(audio_path, "rb") as fh:
                files = {"file": (os.path.basename(audio_path), fh, "audio/mpeg")}
                # timestamp_granularities[] פעמיים -> גם מילים וגם קטעים.
                data = [
                    ("model", model),
                    ("language", language),
                    ("response_format", "verbose_json"),
                    ("timestamp_granularities[]", "word"),
                    ("timestamp_granularities[]", "segment"),
                ]
                resp = requests.post(
                    url,
                    headers={"Authorization": f"Bearer {key}"},
                    files=files,
                    data=data,
                    timeout=timeout,
                )
            if resp.status_code == 200:
                return resp.json()
            # שגיאות רגעיות -> ננסה שוב; שגיאות קבועות (4xx אחר) -> נעצור מיד.
            if resp.status_code in (429, 500, 502, 503, 504):
                last_err = f"{resp.status_code}: {resp.text[:200]}"
            else:
                raise RuntimeError(f"שגיאת API ({resp.status_code}): {resp.text[:500]}")
        except requests.RequestException as exc:
            last_err = str(exc)

        if attempt < max_retries:
            wait = 2 ** attempt
            log.warning("קריאת ענן נכשלה (ניסיון %d/%d): %s — מנסה שוב בעוד %ds",
                        attempt, max_retries, last_err, wait)
            time.sleep(wait)

    raise RuntimeError(f"קריאת הענן נכשלה אחרי {max_retries} ניסיונות. אחרון: {last_err}")


def _cloud_payload_to_transcript(payload: dict, language: str) -> Transcript:
    """ממיר תשובת verbose_json ל-Transcript. מטפל בהבדלי מפתחות בין ספקים."""
    raw_words = payload.get("words") or []
    words: List[Word] = []
    for w in raw_words:
        text = (w.get("word") or w.get("text") or "").strip()
        if not text or w.get("start") is None or w.get("end") is None:
            continue
        words.append(Word(text=text, start=float(w["start"]), end=float(w["end"])))

    # אם הספק החזיר קטעים — נשמור אותם למבנה; אחרת קטע יחיד עם כל המילים.
    raw_segments = payload.get("segments") or []
    segments: List[Segment] = []
    if raw_segments and words:
        for seg in raw_segments:
            s, e = float(seg.get("start", 0.0)), float(seg.get("end", 0.0))
            seg_words = [w for w in words if s - 1e-3 <= w.start <= e + 1e-3]
            segments.append(
                Segment(text=(seg.get("text") or "").strip(), start=s, end=e, words=seg_words)
            )
        # מילים שלא נכנסו לאף קטע (נדיר) — נצרף לקטע האחרון.
        assigned = {id(w) for seg in segments for w in seg.words}
        leftovers = [w for w in words if id(w) not in assigned]
        if leftovers and segments:
            segments[-1].words.extend(leftovers)
    elif words:
        full_text = (payload.get("text") or "").strip()
        segments = [Segment(text=full_text, start=words[0].start, end=words[-1].end, words=words)]

    detected = payload.get("language") or language
    log.info("תמלול ענן הושלם: %d מילים", len(words))
    return Transcript(language=detected, segments=segments)


# --------------------------------------------------------------------------- #
# נקודת כניסה אחידה
# --------------------------------------------------------------------------- #
def transcribe(audio_path: str, cfg) -> Transcript:
    """בוחר מנוע לפי ההגדרות ומתמלל."""
    if cfg.engine == "local":
        return transcribe_local(
            audio_path,
            model=cfg.model,
            language=cfg.language,
            device=cfg.device,
            compute_type=cfg.compute_type,
            vad_filter=not cfg.no_vad,
        )
    return transcribe_cloud(
        audio_path,
        model=cfg.model,
        language=cfg.language,
        provider=cfg.cloud_provider,
        base_url=cfg.cloud_base_url,
        api_key=cfg.api_key,
        chunk_sec=cfg.cloud_chunk_sec,
    )
