"""
Audio processing service.

Handles:
  - Audio extraction from video
  - Replacing audio intervals with bleep / meme sounds
  - Volume normalisation so replacement sounds match the source level

Architecture notes
──────────────────
Bleep mode
  The classic bleep tone is tiled to fill the *exact* interval duration.
  Timeline sync is always preserved.

Meme mode
  1. A duration-appropriate meme sound is selected (short / medium / long
     buckets based on the interval length).
  2. If the sound is ≥ interval duration → hard-trimmed to fit.  No fade;
     the abrupt cut is intentional comedy timing.
  3. If the sound is shorter than the interval → the sound plays at its
     natural length, then the remaining gap is *silenced* (not padded with
     the original audio, which would leak the censored word back in).
     Silence keeps perfect timeline sync without audible padding artifacts.

Volume matching
  Replacement sounds are gain-adjusted to the RMS dBFS of a 500 ms context
  window surrounding the interval.  Shift is clamped to ±18 dB to prevent
  extreme distortion.  If either the reference or the sound has no audio
  energy (dBFS == -inf), the sound is returned unchanged.

Overlap safety
  Intervals are pre-sorted and checked for non-positive duration before
  processing, so overlapping or zero-length intervals are skipped cleanly.

Robustness
  All AudioSegment operations use explicit integer millisecond indices to
  prevent off-by-one errors from float arithmetic.
"""

import random
from pathlib import Path
from typing import List, Dict

from pydub import AudioSegment

# ── paths ─────────────────────────────────────────────────────────────────────
_SOUNDS_DIR = Path(__file__).parent.parent / "sounds"

# Meme sounds bucketed by natural playback duration.
# Adjust filenames / thresholds if you add or swap sounds.
_SHORT_SOUNDS  = ["bruh.mp3", "nope.mp3", "yeet.mp3"]          # natural len < 800 ms
_MEDIUM_SOUNDS = ["huh.mp3", "minecraft_oof.mp3", "windows_error.mp3"]  # 800–1 800 ms
_LONG_SOUNDS   = ["screaming_sheep.mp3", "metal_boom.mp3"]      # > 1 800 ms

_SHORT_THRESHOLD  = 800     # interval ms < this  → short bucket
_MEDIUM_THRESHOLD = 1_800   # interval ms < this  → medium bucket; else long

# Lazy-loaded AudioSegment cache (populated on first use, reused after)
_sound_cache: Dict[str, AudioSegment] = {}


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _load(filename: str) -> AudioSegment:
    """Load a sound file, caching the result for the lifetime of the process."""
    if filename not in _sound_cache:
        path = _SOUNDS_DIR / filename
        if not path.exists():
            raise FileNotFoundError(
                f"Sound file not found: {path}. "
                "Ensure all required meme/bleep files are present in the sounds/ directory."
            )
        # Format-agnostic load lets us keep legacy MP3 assets while allowing
        # new WAV assets (recommended for sample-accurate timing).
        _sound_cache[filename] = AudioSegment.from_file(path)
    return _sound_cache[filename]


def _pick_meme_sound(duration_ms: int) -> str:
    """Select a meme-sound filename whose natural length suits duration_ms."""
    if duration_ms < _SHORT_THRESHOLD:
        return random.choice(_SHORT_SOUNDS)
    elif duration_ms < _MEDIUM_THRESHOLD:
        return random.choice(_MEDIUM_SOUNDS)
    else:
        return random.choice(_LONG_SOUNDS)


def _fit_sound(sound: AudioSegment, duration_ms: int) -> AudioSegment:
    """
    Return the sound trimmed to at most duration_ms.

    If the sound is already shorter than the interval it is returned as-is.
    The caller is responsible for deciding how to handle the remaining gap
    (see apply_audio_replacements for the silence-fill strategy).
    """
    if len(sound) >= duration_ms:
        return sound[:duration_ms]
    return sound


def _match_volume(
    sound: AudioSegment,
    reference: AudioSegment,
) -> AudioSegment:
    """
    Gain-adjust *sound* so its dBFS roughly matches *reference*.

    • If reference is empty or silent (-inf dBFS) → return sound unchanged.
    • If sound itself has no energy (-inf dBFS) → return sound unchanged.
    • Gain shift is clamped to ±18 dB to avoid extreme distortion.
    """
    if len(reference) == 0:
        return sound

    ref_dbfs = reference.dBFS
    snd_dbfs = sound.dBFS

    if ref_dbfs == float("-inf") or snd_dbfs == float("-inf"):
        return sound

    shift = max(-18.0, min(18.0, ref_dbfs - snd_dbfs))
    return sound.apply_gain(shift)


def _build_context_reference(
    audio: AudioSegment,
    start: int,
    end: int,
    context_ms: int = 500,
) -> AudioSegment:
    """
    Return the audio immediately before and after the interval concatenated.
    Used as the volume-matching reference so the replacement blends in.

    Using surrounding context (rather than the interval itself) avoids
    using the cuss word's own energy as the reference, which would be
    self-defeating after we've silenced it.
    """
    total = len(audio)
    before = audio[max(0, start - context_ms) : start]
    after  = audio[end : min(total, end + context_ms)]
    combined = before + after
    # If the surrounding region is silent/empty, return original interval audio
    # as a fallback reference so we still get a reasonable volume match.
    if len(combined) == 0:
        return audio[start:end]
    return combined


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def apply_audio_replacements(
    source_audio_path: str,
    output_audio_path: str,
    intervals: List[Dict],
    mode: str,          # "bleep" | "meme"
) -> None:
    """
    Replace every interval in the source audio with the chosen censorship sound.

    Args:
        source_audio_path:  Path to the extracted WAV / MP3 / any pydub-
                            supported format.
        output_audio_path:  Destination path for processed audio (WAV recommended).
        intervals:          List of {"start_ms": int, "end_ms": int} dicts.
                            May be unordered; overlapping intervals are handled
                            gracefully (later interval's start is clamped to
                            the current cursor, preventing double-processing).
        mode:               "bleep" → tiles the classic bleep tone.
                            "meme"  → picks a duration-appropriate meme sound.

    Timeline sync guarantee
    ───────────────────────
    In all cases the output audio is exactly as long as the source audio.
    The cursor always advances to `end` after each interval, ensuring every
    sample of the original audio appears exactly once in the output (either
    as original audio or as a replacement/silence).
    """
    if mode not in ("bleep", "meme"):
        raise ValueError(f"mode must be 'bleep' or 'meme', got {mode!r}")

    audio  = AudioSegment.from_file(source_audio_path)
    bleep  = _load("bleep.mp3")
    output = AudioSegment.empty()
    cursor = 0  # tracks how far we've consumed the source audio (ms)

    for iv in sorted(intervals, key=lambda x: x["start_ms"]):
        # Clamp to valid range and guard against overlapping intervals
        start    = max(cursor, int(iv["start_ms"]))
        end      = min(len(audio), int(iv["end_ms"]))
        duration = end - start

        if duration <= 0:
            continue

        # Append original audio from cursor up to the start of this interval
        output += audio[cursor:start]

        # Build context reference for volume matching
        reference = _build_context_reference(audio, start, end)

        if mode == "bleep":
            # Tile bleep to exactly fill the interval — guarantees sync.
            bleep_len   = len(bleep)
            repeat_count = (duration // bleep_len) + 2
            tiled       = (bleep * repeat_count)[:duration]
            replacement = _match_volume(tiled, reference)
            output     += replacement
            cursor       = end

        else:  # "meme"
            chosen_file = _pick_meme_sound(duration)
            raw_sound   = _load(chosen_file)
            fitted      = _fit_sound(raw_sound, duration)
            replacement = _match_volume(fitted, reference)

            output += replacement

            # If the sound is shorter than the interval, silence the remainder.
            # This is critical: we must NOT play original audio here because
            # it would reveal the censored word.  Silence preserves sync and
            # sounds far more natural than any padding alternative.
            fitted_len = len(fitted)
            if fitted_len < duration:
                gap_ms  = duration - fitted_len
                output += AudioSegment.silent(duration=gap_ms)

            cursor = end  # always advance to end to maintain sync

    # Append all remaining original audio after the last interval
    output += audio[cursor:]

    # Sanity check: warn (but don't crash) if lengths diverge by > 10 ms.
    # Small diffs may occur due to millisecond rounding during segment edits.
    length_diff = abs(len(output) - len(audio))
    if length_diff > 10:
        import warnings
        warnings.warn(
            f"Output audio length ({len(output)} ms) differs from source "
            f"({len(audio)} ms) by {length_diff} ms.  This may indicate "
            "overlapping input intervals."
        )

    output.export(output_audio_path, format="wav")