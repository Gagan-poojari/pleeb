"""
Enhanced Whisper transcription service.

Improvements over the original transcribe.py:
  - Model cache: load once per process, reuse across requests (no cold-start lag)
  - Confidence filtering: callers can gate on per-word confidence scores
  - Returns rich word-level data for downstream accuracy improvements
"""

import whisper_timestamped as wts
from typing import Tuple, List, Dict, Any

# ── model cache ──────────────────────────────────────────────────────────────
_model_cache: Dict[str, Any] = {}

AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large"]

FREE_MODELS = {"tiny", "base"}          # no auth required
PRO_MODELS  = {"small", "medium", "large"}  # require sign-in on the frontend


def get_model(name: str) -> Any:
    """Return a cached Whisper model, loading it on first call."""
    if name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model '{name}'. Choose from: {AVAILABLE_MODELS}")
    if name not in _model_cache:
        _model_cache[name] = wts.load_model(name, device="cpu")
    return _model_cache[name]


def preload_model(name: str = "base") -> None:
    """Eagerly load a model (called at startup to avoid first-request lag)."""
    get_model(name)


# ── main transcription function ───────────────────────────────────────────────
def transcribe_audio(
    audio_path: str,
    model_name: str = "base",
) -> Tuple[str, List[Dict]]:
    """
    Transcribe an audio file.

    Returns:
        transcript  – full text string
        segments    – list of segment dicts, each containing:
                        { "text", "start", "end",
                          "words": [{ "text", "start", "end", "confidence" }] }
    """
    model = get_model(model_name)

    result = wts.transcribe(
        model,
        audio_path,
        verbose=False,
        # beam_size=5 and temperature=0 greatly improve determinism / accuracy
        beam_size=5,
        temperature=0.0,
        # language=None lets Whisper auto-detect (best for accuracy)
        language=None,
    )

    transcript: str = result["text"]
    segments: List[Dict] = result["segments"]

    return transcript, segments
