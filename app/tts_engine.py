import io
import numpy as np
import soundfile as sf
from kokoro import KPipeline

# Language code mapping for Kokoro
LANG_CODES = {
    "en": "a",  # American English
    "es": "e",  # Spanish
}

# Available voices per language
VOICES = {
    "en": [
        {"id": "af_heart", "name": "Heart", "gender": "female"},
        {"id": "af_nicole", "name": "Nicole", "gender": "female"},
        {"id": "am_adam", "name": "Adam", "gender": "male"},
        {"id": "am_michael", "name": "Michael", "gender": "male"},
        {"id": "bf_emma", "name": "Emma (British)", "gender": "female"},
        {"id": "bm_george", "name": "George (British)", "gender": "male"},
    ],
    "es": [
        {"id": "ef_dora", "name": "Dora", "gender": "female"},
        {"id": "em_alex", "name": "Alex", "gender": "male"},
    ],
}

SAMPLE_RATE = 24000

# Cached pipelines per language
_pipelines: dict[str, KPipeline] = {}


def _get_pipeline(lang: str) -> KPipeline:
    """Get or create a Kokoro pipeline for the given language."""
    if lang not in _pipelines:
        lang_code = LANG_CODES.get(lang)
        if lang_code is None:
            raise ValueError(f"Unsupported language: {lang}")
        _pipelines[lang] = KPipeline(lang_code=lang_code)
    return _pipelines[lang]


def list_voices(lang: str | None = None) -> dict[str, list[dict]]:
    """Return available voices, optionally filtered by language."""
    if lang and lang in VOICES:
        return {lang: VOICES[lang]}
    return VOICES


def synthesize(text: str, voice_id: str, speed: float = 1.0) -> bytes:
    """Synthesize text to WAV audio bytes.

    Args:
        text: The text to speak.
        voice_id: Kokoro voice ID (e.g. 'af_heart', 'ef_dora').
        speed: Playback speed multiplier (0.5 - 2.0).

    Returns:
        WAV file contents as bytes.
    """
    # Determine language from voice ID prefix
    prefix = voice_id[0]
    lang_map = {"a": "en", "b": "en", "e": "es"}
    lang = lang_map.get(prefix)
    if lang is None:
        raise ValueError(f"Cannot determine language from voice ID: {voice_id}")

    pipeline = _get_pipeline(lang)
    speed = max(0.5, min(2.0, speed))

    # Generate audio segments and concatenate
    segments = []
    for _graphemes, _phonemes, audio in pipeline(text, voice=voice_id, speed=speed):
        if audio is not None:
            segments.append(audio)

    if not segments:
        raise RuntimeError("No audio generated — check that the text is not empty.")

    combined = np.concatenate(segments)

    # Write to WAV in memory
    buf = io.BytesIO()
    sf.write(buf, combined, SAMPLE_RATE, format="WAV")
    buf.seek(0)
    return buf.read()
