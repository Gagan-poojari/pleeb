"""
Word matching service — the accuracy core of Pleeb.

Seven improvements over the original query_transcript():
  1. Word normalization  – strips punctuation & lowercases
  2. Stem variants       – catches "fucking", "fuckin", "fucker" from "fuck"
  3. Bigram matching     – catches compound words split across tokens ("bull"+"shit")
  4. Confidence gating   – skips words Whisper is uncertain about
  5. Deduplication       – prevents double-matching the same word occurrence
  6. Interval merging    – merges overlapping/adjacent bleep windows
  7. Dynamic padding     – per-word padding = max(50ms, 10% of word duration)

Changes vs previous version:
  - Asymmetric padding: front pad = 1.5× base, tail pad = 0.6× base.
    Speech recognition timestamps tend to fire slightly *after* the sound
    begins, so biasing the pad earlier closes the gap between when the cuss
    word is actually audible and when Whisper marks it.  The shorter tail
    pad prevents bleeding into the next word.
  - Bigram / trigram matches inherit the same asymmetric padding.
  - _merge_intervals gap raised from 80 ms → 120 ms: close matches that were
    previously left as two micro-bleeps are now properly fused.
"""

import re
from typing import List, Dict, Set, Tuple


# ── text normalisation ────────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """Strip leading/trailing punctuation, lowercase, remove apostrophes."""
    text = re.sub(r"^[^a-zA-Z]+|[^a-zA-Z]+$", "", text)
    text = text.replace("'", "").replace("\u2019", "")
    return text.lower()


# ── stem / variant expansion ─────────────────────────────────────────────────

_SUFFIXES_TO_STRIP = ("ing", "in", "ers", "er", "ed", "es", "s")
_SUFFIXES_TO_ADD   = ("ing", "in", "er", "ers", "ed", "s", "es")
_MIN_STEM_LEN      = 3


def _get_variants(word: str) -> Set[str]:
    """
    Return a set of surface forms that should match this word.
    E.g. "fuck" → {"fuck","fucking","fuckin","fucker","fuckers","fucks", ...}
    """
    base = _normalize(word)
    if not base:
        return set()

    variants: Set[str] = {base}

    for suf in _SUFFIXES_TO_STRIP:
        if base.endswith(suf) and len(base) - len(suf) >= _MIN_STEM_LEN:
            stem = base[: -len(suf)]
            variants.add(stem)
            for add in _SUFFIXES_TO_ADD:
                variants.add(stem + add)

    for add in _SUFFIXES_TO_ADD:
        variants.add(base + add)

    return variants


def build_target_set(word_list: List[str]) -> Set[str]:
    """Flatten all variants for O(1) lookup at match time."""
    result: Set[str] = set()
    for w in word_list:
        result.update(_get_variants(w))
    return result


# ── interval helpers ─────────────────────────────────────────────────────────

def _merge_intervals(
    intervals: List[Tuple[int, int]], gap_ms: int = 120
) -> List[Tuple[int, int]]:
    """
    Merge overlapping or near-adjacent (within gap_ms) [start, end] intervals.

    gap_ms raised from 80 → 120 ms so that closely spaced cuss words (e.g.
    "what the f***") are fused into a single bleep rather than two audible
    micro-gaps with a tiny sliver of original audio in between.
    """
    if not intervals:
        return []
    sorted_iv = sorted(intervals, key=lambda x: x[0])
    merged = [list(sorted_iv[0])]
    for start, end in sorted_iv[1:]:
        if start <= merged[-1][1] + gap_ms:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return [(s, e) for s, e in merged]


# ── padding helpers ───────────────────────────────────────────────────────────

def _asymmetric_pad(
    start_s: float,
    end_s: float,
    base_padding_ms: int,
) -> Tuple[int, int]:
    """
    Compute (start_ms, end_ms) with asymmetric padding.

    Front bias rationale
    ────────────────────
    Whisper (and whisper_timestamped) marks a word's start timestamp at the
    point where it has accumulated enough acoustic evidence — which is always
    slightly *after* the phoneme actually begins.  Adding extra lead-in time
    (1.5× the base pad) compensates for this systematic lag so the cuss word
    isn't audible for even a few milliseconds before the bleep fires.

    Tail rationale
    ──────────────
    Word-end timestamps are more accurate (the model knows when energy drops).
    A shorter tail pad (0.6×) reduces bleed into the following word, which is
    especially important for rapid speech.
    """
    duration_ms  = (end_s - start_s) * 1000
    dynamic_pad  = max(base_padding_ms, int(duration_ms * 0.10))

    front_pad    = int(dynamic_pad * 1.5)
    tail_pad     = int(dynamic_pad * 0.6)

    start_ms     = max(0, int(start_s * 1000) - front_pad)
    end_ms       = int(end_s * 1000) + tail_pad
    return start_ms, end_ms


# ── main matching function ────────────────────────────────────────────────────

def find_matches(
    target_words: List[str],
    segments: List[Dict],
    confidence_threshold: float = 0.30,
    base_padding_ms: int = 50,
) -> List[Dict]:
    """
    Find all occurrences of target_words in a Whisper timestamped transcript.

    Args:
        target_words:         Words/phrases to censor.
        segments:             Whisper-timestamped segment list.
        confidence_threshold: Drop words with confidence below this value.
        base_padding_ms:      Minimum ms of silence to add around each match.
                              Actual front pad = 1.5×, tail pad = 0.6× this.

    Returns:
        List of {"start_ms": int, "end_ms": int} dicts, sorted and merged.
    """
    if not target_words or not segments:
        return []

    target_set = build_target_set(target_words)

    all_words: List[Dict] = [
        w for seg in segments for w in seg.get("words", [])
    ]

    raw_intervals: List[Tuple[int, int]] = []
    seen: Set[Tuple[float, str]] = set()

    for i, word in enumerate(all_words):
        conf = word.get("confidence", 1.0)
        if conf < confidence_threshold:
            continue

        norm = _normalize(word.get("text", ""))
        if not norm:
            continue

        dedup_key = (round(word["start"], 2), norm)

        # ── single-token match ────────────────────────────────────────────
        if norm in target_set and dedup_key not in seen:
            seen.add(dedup_key)
            start_ms, end_ms = _asymmetric_pad(
                word["start"], word["end"], base_padding_ms
            )
            raw_intervals.append((start_ms, end_ms))

        # ── bigram match (current + next token) ──────────────────────────
        if i + 1 < len(all_words):
            nxt      = all_words[i + 1]
            nxt_norm = _normalize(nxt.get("text", ""))
            bigram   = norm + nxt_norm
            bi_key   = (round(word["start"], 2), bigram)

            if bigram in target_set and bi_key not in seen:
                seen.add(bi_key)
                # Span from first word start to second word end
                start_ms, end_ms = _asymmetric_pad(
                    word["start"], nxt["end"], base_padding_ms
                )
                raw_intervals.append((start_ms, end_ms))

        # ── trigram match (current + next two tokens) ─────────────────────
        if i + 2 < len(all_words):
            nxt2      = all_words[i + 2]
            nxt2_norm = _normalize(nxt2.get("text", ""))
            mid_norm  = _normalize(all_words[i + 1].get("text", ""))
            trigram   = norm + mid_norm + nxt2_norm
            tri_key   = (round(word["start"], 2), trigram)

            if trigram in target_set and tri_key not in seen:
                seen.add(tri_key)
                start_ms, end_ms = _asymmetric_pad(
                    word["start"], nxt2["end"], base_padding_ms
                )
                raw_intervals.append((start_ms, end_ms))

    merged = _merge_intervals(raw_intervals)
    return [{"start_ms": s, "end_ms": e} for s, e in merged]