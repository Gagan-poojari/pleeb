"""
Enhanced Whisper transcription service.

Design goals
────────────
  Accuracy    — Every setting is tuned for maximum word-level timestamp
                accuracy and transcription fidelity.
  Performance — Models are loaded once per process and reused.  The first
                request after startup is fast because the default model is
                pre-warmed at startup (call preload_model() in your lifespan).
  Robustness  — All errors surface as typed exceptions with actionable
                messages rather than generic crashes.

Key settings explained
──────────────────────
  beam_size=5, temperature=0.0
    Greedy beam search with no temperature randomness → deterministic,
    highest-probability transcript.  Best for censoring because repeated runs
    produce identical timestamps.

  condition_on_previous_text=False
    Prevents Whisper from conditioning each segment on its own previous
    output.  Without this, a hallucination early in the audio can cascade
    and corrupt subsequent segments.  Critical for long videos.

  no_speech_threshold=0.6
    Segments where Whisper's own "no-speech" probability exceeds 60% are
    discarded.  Reduces hallucinated words in quiet passages.

  compression_ratio_threshold=2.4
    Discards segments whose output is suspiciously repetitive (compression
    ratio too high), another hallucination guard.

  language=None
    Auto-detect language.  Always better than forcing "en" because forcing
    a wrong language causes Whisper to hallucinate in that language.
"""

from typing import Any, Dict, List, Tuple

import whisper_timestamped as wts


# ─────────────────────────────────────────────────────────────────────────────
# Model registry
# ─────────────────────────────────────────────────────────────────────────────

AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large"]

# Models available without authentication on the frontend
FREE_MODELS = {"tiny", "base"}
# Models that require a signed-in account (higher compute cost)
PRO_MODELS  = {"small", "medium", "large"}

# Process-level model cache: {model_name → loaded model object}
_model_cache: Dict[str, Any] = {}


def get_model(name: str) -> Any:
    """
    Return a (cached) Whisper model, loading it on first call.

    Raises:
        ValueError: if *name* is not in AVAILABLE_MODELS.
    """
    if name not in AVAILABLE_MODELS:
        raise ValueError(
            f"Unknown model '{name}'. "
            f"Available models: {', '.join(AVAILABLE_MODELS)}"
        )
    if name not in _model_cache:
        # device="cpu" keeps the service portable; swap for "cuda" on GPU hosts
        _model_cache[name] = wts.load_model(name, device="cpu")
    return _model_cache[name]


def preload_model(name: str = "base") -> None:
    """
    Eagerly load *name* so the first user request is not slowed by model I/O.
    Call this from your ASGI lifespan startup hook.
    """
    get_model(name)


# ─────────────────────────────────────────────────────────────────────────────
# Transcription
# ─────────────────────────────────────────────────────────────────────────────

def transcribe_audio(
    audio_path: str,
    model_name: str = "base",
) -> Tuple[str, List[Dict]]:
    """
    Transcribe an audio file and return per-word timestamps with confidence.

    Args:
        audio_path:  Path to the audio file (MP3, WAV, FLAC, etc.).
        model_name:  Which Whisper model to use.  Larger models are slower
                     but significantly more accurate for slang / accented
                     speech.  Recommended: "small" or "medium" for production.

    Returns:
        transcript  – Full text string of the complete audio.
        segments    – List of segment dicts, each containing:
                        {
                          "text":  str,
                          "start": float,   # seconds
                          "end":   float,   # seconds
                          "words": [
                            {
                              "text":       str,
                              "start":      float,  # seconds
                              "end":        float,  # seconds
                              "confidence": float,  # 0.0–1.0
                            },
                            ...
                          ]
                        }

    Raises:
        ValueError:  if model_name is not in AVAILABLE_MODELS.
        RuntimeError: if the audio file cannot be transcribed.
    """
    model = get_model(model_name)

    try:
        result = wts.transcribe(
            model,
            audio_path,
            verbose=False,

            # ── accuracy settings ─────────────────────────────────────────
            beam_size=5,
            temperature=0.0,        # deterministic; no sampling noise

            # Prevent hallucination cascades between segments.
            # This is the single most impactful accuracy improvement for
            # long-form content with pauses or background noise.
            condition_on_previous_text=False,

            # Discard "no speech" segments — reduces phantom words in
            # silent/music-only passages.
            no_speech_threshold=0.6,

            # Discard suspiciously repetitive segments (hallucination guard).
            compression_ratio_threshold=2.4,

            # Auto-detect language for maximum accuracy across all content.
            language=None,

            # ── timestamp settings ────────────────────────────────────────
            # Refine word-level timestamps using Dynamic Time Warping.
            # This is whisper_timestamped's main value-add over vanilla Whisper
            # and significantly tightens per-word start/end accuracy.
            refine_whisper_precision=0.2,   # seconds; smaller = more precise
            min_word_dur=0.02,              # discard sub-20 ms "words"
        )
    except Exception as exc:
        raise RuntimeError(
            f"Transcription failed for '{audio_path}': {exc}"
        ) from exc

    transcript: str       = result.get("text", "")
    segments:   List[Dict] = result.get("segments", [])

    return transcript, segments