"""
Audio processing service.

Handles:
  - Audio extraction from video
  - Replacing audio intervals with bleep / meme sounds
  - Volume normalisation so replacement sounds match the source level

Changes vs original:
  - Meme sounds are now bucketed by natural duration (short / medium / long)
    so longer cuss words get longer meme sounds and vice-versa.
  - Short-word replacements are hard-trimmed to the interval — no silence
    padding appended, keeping the overlay tight and in-sync.
  - Bleep mode unchanged (still tiles the bleep tone to fill the interval).
"""

import random
from pathlib import Path
from typing import List, Dict

from pydub import AudioSegment

# ── paths ─────────────────────────────────────────────────────────────────────
_SOUNDS_DIR = Path(__file__).parent.parent / "sounds"

# Bucketed by each file's natural playback duration.
# Adjust thresholds below if you add / swap sounds.
_SHORT_SOUNDS  = ["bruh.mp3", "nope.mp3", "yeet.mp3"]                        # natural len < 800 ms
_MEDIUM_SOUNDS = ["huh.mp3", "minecraft_oof.mp3", "windows_error.mp3"]        # 800 ms – 1 800 ms
_LONG_SOUNDS   = ["screaming_sheep.mp3", "metal_boom.mp3"]                    # > 1 800 ms

# Duration thresholds (milliseconds) that decide which bucket to use
_SHORT_THRESHOLD  = 800    # interval < 800 ms  → short sound
_MEDIUM_THRESHOLD = 1_800  # interval < 1 800 ms → medium sound
                           # interval ≥ 1 800 ms → long sound

# Cache loaded AudioSegments so we don't hit disk on every word
_sound_cache: Dict[str, AudioSegment] = {}


def _load(filename: str) -> AudioSegment:
    if filename not in _sound_cache:
        _sound_cache[filename] = AudioSegment.from_mp3(_SOUNDS_DIR / filename)
    return _sound_cache[filename]


# ── helpers ───────────────────────────────────────────────────────────────────

def _pick_meme_sound(duration_ms: int) -> str:
    """
    Return the filename of a meme sound whose natural length is appropriate
    for the given interval duration.
    """
    if duration_ms < _SHORT_THRESHOLD:
        return random.choice(_SHORT_SOUNDS)
    elif duration_ms < _MEDIUM_THRESHOLD:
        return random.choice(_MEDIUM_SOUNDS)
    else:
        return random.choice(_LONG_SOUNDS)


def _fit_sound(sound: AudioSegment, duration_ms: int) -> AudioSegment:
    """
    Fit a sound to exactly duration_ms milliseconds.

    Strategy (in priority order):
      1. If the sound is longer than the interval → hard trim.  No fade; the
         abrupt cut is intentional (comedy timing) and stays in sync.
      2. If the sound is shorter than the interval → keep the sound at its
         natural length rather than padding with silence.  The original audio
         will resume immediately after, which sounds far more natural than a
         dead pad.  The caller is responsible for adjusting the cursor if the
         sound is shorter than the interval.
    """
    if len(sound) >= duration_ms:
        return sound[:duration_ms]
    # Sound is shorter — return as-is; caller decides how to handle the gap
    return sound


def _match_volume(sound: AudioSegment, reference: AudioSegment) -> AudioSegment:
    """
    Adjust sound's volume so it roughly matches the reference dBFS.
    Clamps the shift to ±18 dB to avoid extreme distortion.
    """
    if len(reference) == 0:
        return sound
    ref_dbfs = reference.dBFS
    snd_dbfs = sound.dBFS
    if ref_dbfs == float("-inf") or snd_dbfs == float("-inf"):
        return sound
    shift = max(-18.0, min(18.0, ref_dbfs - snd_dbfs))
    return sound + shift


# ── public API ────────────────────────────────────────────────────────────────

def apply_audio_replacements(
    source_audio_path: str,
    output_audio_path: str,
    intervals: List[Dict],
    mode: str,          # "bleep" | "meme"
) -> None:
    """
    Replace every interval in the source audio with the chosen sound.

    Args:
        source_audio_path:  Path to the extracted MP3 / WAV.
        output_audio_path:  Where to write the processed audio.
        intervals:          List of {"start_ms": int, "end_ms": int}.
        mode:               "bleep" uses the classic bleep tone;
                            "meme" picks a duration-appropriate meme sound.

    Sync guarantee
    ──────────────
    In bleep mode the replacement always fills the exact interval so the
    cursor advances to `end`.

    In meme mode:
      • If the chosen sound is ≥ interval duration → trimmed to fit; cursor
        advances to `end`.  Original audio resumes exactly on time.
      • If the chosen sound is < interval duration → played at natural length,
        then the *remaining* slice of the original interval is silenced (muted)
        rather than leaving dead air or using an audible pad.  This keeps
        timeline sync perfect while avoiding jarring padding noise.
    """
    audio  = AudioSegment.from_file(source_audio_path)
    bleep  = _load("bleep.mp3")
    output = AudioSegment.empty()
    cursor = 0

    for iv in sorted(intervals, key=lambda x: x["start_ms"]):
        start    = max(0, iv["start_ms"])
        end      = min(len(audio), iv["end_ms"])
        duration = end - start

        if duration <= 0:
            continue

        # Append original audio up to the replacement point
        output += audio[cursor:start]

        # ── volume reference (500 ms either side) ────────────────────────
        surrounding = (
            audio[max(0, start - 500) : start]
            + audio[end : min(len(audio), end + 500)]
        )

        if mode == "bleep":
            # Tile bleep to exactly fill the interval
            raw_sound   = (bleep * ((duration // len(bleep)) + 2))[:duration]
            replacement = _match_volume(raw_sound, surrounding)
            output     += replacement
            cursor       = end

        else:  # "meme"
            chosen_file = _pick_meme_sound(duration)
            raw_sound   = _load(chosen_file)
            fitted      = _fit_sound(raw_sound, duration)
            replacement = _match_volume(fitted, surrounding)

            if len(fitted) >= duration:
                # Sound fills (or was trimmed to fill) the whole interval
                output += replacement
                cursor  = end
            else:
                # Sound is shorter than the interval:
                # play the sound, then mute the remaining gap to keep sync.
                gap_ms  = duration - len(fitted)
                silence = AudioSegment.silent(duration=gap_ms)
                output += replacement + silence
                cursor  = end

    # Append any remaining original audio
    output += audio[cursor:]
    output.export(output_audio_path, format="mp3")