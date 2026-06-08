"""
Word matching service — the accuracy core of Pleeb.

Architecture
────────────
Accuracy is achieved through a layered pipeline:

  Layer 1 — Pre-normalisation
    • Lowercasing, punctuation stripping
    • Leetspeak / obfuscation reversal  (f*ck → fuck, sh!t → shit, etc.)
    • Repeated-character collapsing     (fuuuck → fuck)

  Layer 2 — Linguistic normalisation via NLTK WordNet lemmatiser
    • Maps inflected forms to their lemma  (fucking → fuck, went → go)
    • Falls back to suffix-stripping when WordNet has no entry (proper nouns,
      slang that isn't in WordNet)

  Layer 3 — Surface-form expansion
    • From each target root, generates the most common surface forms so we
      catch variants Whisper might transcribe that the lemmatiser won't reverse.

  Layer 4 — N-gram matching (unigram, bigram, trigram)
    • Target phrases (multi-word) are stored *with* a space separator in the
      target set so "bull shit" (two tokens) can be looked up as "bull shit".
    • N-gram text is built as " ".join(tokens), not concatenated, fixing a
      long-standing bug where "bull"+"shit" looked up "bullshit" (wrong key).

  Layer 5 — Confidence gating + asymmetric padding + interval merging
    • Kept from the previous version with one fix: missing confidence defaults
      to 0.5 (neutral) instead of 1.0 (perfect), because an absent score
      should not be treated as certainty.

  Layer 6 — Phonetic fallback (Soundex / Metaphone via jellyfish)
    • Optional.  When enabled, words whose Soundex code matches a target's
      Soundex are also flagged.  Catches heavy accents, unusual spellings.
    • Disabled by default (phonetic = False) because it raises false-positive
      rate.  Enable per-job if the caller wants maximum recall.
"""

import re
import unicodedata
from typing import List, Dict, Set, Tuple

# ── optional dependencies (graceful degrades) ─────────────────────────────────
try:
    import nltk
    from nltk.stem import WordNetLemmatizer
    # Download silently on first run; subsequent runs are instant (cached)
    for _corpus in ("wordnet", "omw-1.4"):
        try:
            nltk.data.find(f"corpora/{_corpus}")
        except LookupError:
            nltk.download(_corpus, quiet=True)
    _lemmatizer: WordNetLemmatizer | None = WordNetLemmatizer()
except ImportError:
    _lemmatizer = None  # falls back to suffix stripping only

try:
    import jellyfish as _jf
    _JELLYFISH_AVAILABLE = True
except ImportError:
    _JELLYFISH_AVAILABLE = False


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — Pre-normalisation
# ─────────────────────────────────────────────────────────────────────────────

# Maps common leet / obfuscation characters to their plain-text equivalents.
# Keep this ordered longest-match-first when you need multi-char sequences
# (currently all single-char, so order doesn't matter).
_LEET_MAP: Dict[str, str] = {
    "@": "a",
    "4": "a",
    "3": "e",
    "€": "e",
    "1": "i",
    "!": "i",
    "|": "i",
    "0": "o",
    "5": "s",
    "$": "s",
    "7": "t",
    "+": "t",
    "8": "b",
    "6": "g",
    "9": "g",
    # Punctuation used as letter replacements
    "*": "",   # f*ck → fck (then suffix/lemma still matches)
    "#": "",
    "%": "",
}

# Regex that matches any leet character (pre-compiled for speed)
_LEET_RE = re.compile("[" + re.escape("".join(_LEET_MAP.keys())) + "]")

# Regex: strip leading/trailing non-alpha after leet reversal
_TRIM_NON_ALPHA = re.compile(r"^[^a-z]+|[^a-z]+$")

# Regex: collapse 3+ repeated characters → 2  (fuuuck → fuuck → after lemma: fuck)
_REPEAT_RE = re.compile(r"(.)\1{2,}")


def _pre_normalise(text: str) -> str:
    """
    Full pre-normalisation pipeline for a single token.

    Steps
    ─────
    1. Unicode normalise (NFKD) so accented variants collapse.
    2. Lowercase.
    3. Map leet/obfuscation characters.
    4. Strip leading/trailing non-alpha.
    5. Remove apostrophes / Unicode right-quotes.
    6. Collapse excessive repetition (fuuuck → fuuck).

    Returns empty string for tokens that become empty after normalisation.
    """
    # 1. Unicode normalise
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")

    # 2. Lowercase
    text = text.lower()

    # 3. Leet substitution
    text = _LEET_RE.sub(lambda m: _LEET_MAP[m.group()], text)

    # 4. Trim non-alpha
    text = _TRIM_NON_ALPHA.sub("", text)

    # 5. Apostrophes
    text = text.replace("'", "").replace("\u2019", "")

    # 6. Collapse repeats
    text = _REPEAT_RE.sub(r"\1\1", text)

    return text


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — Linguistic normalisation (lemmatisation)
# ─────────────────────────────────────────────────────────────────────────────

# Parts of speech to try in lemmatiser, in preference order
_POS_TAGS = ("v", "n", "a", "r")   # verb, noun, adjective, adverb

def _lemmatise(word: str) -> str:
    """
    Return the lemma of *word*.

    Tries all four POS tags and returns the shortest result (heuristic: the
    more aggressively reduced form is usually the lemma we want).
    Falls back to the original word if the lemmatiser is not available.
    """
    if _lemmatizer is None or not word:
        return word
    candidates = {_lemmatizer.lemmatize(word, pos=p) for p in _POS_TAGS}
    # Prefer the shortest (most-reduced) form; tie-break alphabetically
    return min(candidates, key=lambda x: (len(x), x))


def _normalise(text: str) -> str:
    """
    Full normalisation: pre-normalise → lemmatise.
    This is the function used at *match time* for transcript tokens.
    """
    pre = _pre_normalise(text)
    if not pre:
        return ""
    return _lemmatise(pre)


# ─────────────────────────────────────────────────────────────────────────────
# Layer 3 — Surface-form expansion  (used at *index time* for target words)
# ─────────────────────────────────────────────────────────────────────────────

_SUFFIXES_TO_STRIP = ("ing", "in", "ers", "er", "ed", "es", "s")
_SUFFIXES_TO_ADD   = ("ing", "in", "er", "ers", "ed", "s", "es")
_MIN_STEM_LEN      = 3


def _suffix_variants(base: str) -> Set[str]:
    """Generate common inflected surface forms from a stem."""
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


def _get_variants(word: str) -> Set[str]:
    """
    Return every surface form that should match this target word.

    For single-word targets:  pre-normalise → lemmatise → expand suffixes.
    For phrase targets:       each token is individually normalised; the set
                              contains the space-joined phrase (so n-gram
                              lookup can find it with a single set membership
                              check).

    Note: we *also* store the raw pre-normalised form (before lemmatisation)
    so that Whisper outputs that are already in their surface form still match
    without going through the lemmatiser.
    """
    # Handle multi-word targets (e.g. "bull shit", "mother fucker")
    tokens = word.strip().split()
    if len(tokens) > 1:
        normalised_tokens = [_normalise(t) for t in tokens]
        pre_tokens        = [_pre_normalise(t) for t in tokens]
        result: Set[str] = set()
        # Exact pre-normalised phrase
        if all(pre_tokens):
            result.add(" ".join(pre_tokens))
        # Lemmatised phrase
        if all(normalised_tokens):
            result.add(" ".join(normalised_tokens))
        return result

    # Single-word target
    pre  = _pre_normalise(word)
    if not pre:
        return set()
    lemma = _lemmatise(pre)

    variants: Set[str] = set()
    # Expand from the lemma
    variants.update(_suffix_variants(lemma))
    # Also expand from the raw pre-normalised form (catches slang not in WordNet)
    variants.update(_suffix_variants(pre))
    # Always include the pre-normalised form itself (exact match safety net)
    variants.add(pre)
    return variants


def build_target_set(word_list: List[str]) -> Set[str]:
    """Flatten all variants for O(1) lookup at match time."""
    result: Set[str] = set()
    for w in word_list:
        result.update(_get_variants(w))
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Layer 4 — Optional phonetic index
# ─────────────────────────────────────────────────────────────────────────────

def build_phonetic_index(word_list: List[str]) -> Dict[str, Set[str]]:
    """
    Build a {soundex_code → {original_word, ...}} mapping for phonetic lookup.
    Returns an empty dict if jellyfish is not installed.
    """
    if not _JELLYFISH_AVAILABLE:
        return {}
    index: Dict[str, Set[str]] = {}
    for w in word_list:
        pre = _pre_normalise(w)
        if pre:
            code = _jf.soundex(pre)
            index.setdefault(code, set()).add(pre)
    return index


def _phonetic_match(
    norm: str,
    phonetic_index: Dict[str, Set[str]],
) -> bool:
    """Return True if norm's Soundex matches any target's Soundex."""
    if not _JELLYFISH_AVAILABLE or not phonetic_index or not norm:
        return False
    code = _jf.soundex(norm)
    return code in phonetic_index


# ─────────────────────────────────────────────────────────────────────────────
# Layer 5 — Interval helpers
# ─────────────────────────────────────────────────────────────────────────────

def _merge_intervals(
    intervals: List[Tuple[int, int]], gap_ms: int = 120
) -> List[Tuple[int, int]]:
    """
    Merge overlapping or near-adjacent (within gap_ms) [start, end] intervals.

    gap_ms = 120 ms fuses closely spaced words ("what the f***") into a single
    bleep, eliminating audible micro-gaps between adjacent replacements.
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


def _asymmetric_pad(
    start_s: float,
    end_s: float,
    base_padding_ms: int,
) -> Tuple[int, int]:
    """
    Compute (start_ms, end_ms) with asymmetric front/tail padding.

    Front pad = 1.5 × base
    ──────────────────────
    Whisper marks a word's start *after* sufficient acoustic evidence has
    accumulated — always a few ms late.  The extra lead-in compensates for
    this systematic lag so the cuss word is never audible before the bleep.

    Tail pad = 0.6 × base
    ──────────────────────
    End timestamps are more accurate (energy drop is sharp).  A shorter tail
    reduces bleed into the following word, especially critical in rapid speech.

    Dynamic scaling
    ───────────────
    The actual pad is max(base_padding_ms, 10% of word duration) so short
    words still get a meaningful buffer while long words don't get over-padded.
    """
    duration_ms = max(0.0, (end_s - start_s) * 1000)
    dynamic_pad = max(base_padding_ms, int(duration_ms * 0.10))
    front_pad   = int(dynamic_pad * 1.5)
    tail_pad    = int(dynamic_pad * 0.6)
    start_ms    = max(0, int(start_s * 1000) - front_pad)
    end_ms      = int(end_s * 1000) + tail_pad
    return start_ms, end_ms


# ─────────────────────────────────────────────────────────────────────────────
# Layer 6 — Main matching function
# ─────────────────────────────────────────────────────────────────────────────

def find_matches(
    target_words: List[str],
    segments: List[Dict],
    confidence_threshold: float = 0.30,
    base_padding_ms: int = 50,
    phonetic: bool = False,
) -> List[Dict]:
    """
    Find all occurrences of target_words in a Whisper timestamped transcript.

    Args:
        target_words:         Words/phrases to censor.  Can be single words
                              or space-separated phrases ("bull shit").
        segments:             Whisper-timestamped segment list, each containing
                              a "words" key with per-word dicts.
        confidence_threshold: Drop words with confidence below this value.
                              Range 0.0–1.0.  Default 0.30.
        base_padding_ms:      Minimum ms added around each match.
                              Front pad = 1.5×, tail pad = 0.6× this value.
        phonetic:             If True (and jellyfish is installed), also match
                              words whose Soundex code equals a target's.
                              Increases recall at the cost of more false positives.

    Returns:
        Sorted, merged list of {"start_ms": int, "end_ms": int} dicts.
    """
    if not target_words or not segments:
        return []

    target_set     = build_target_set(target_words)
    phonetic_index = build_phonetic_index(target_words) if phonetic else {}

    # Flatten all words from all segments into a single list
    all_words: List[Dict] = [
        w for seg in segments for w in seg.get("words", [])
    ]

    raw_intervals: List[Tuple[int, int]] = []

    # dedup key: (start_ms_rounded, normalised_text) — using integer ms avoids
    # float rounding edge-cases that tripped the previous (round(x,2)) scheme.
    seen: Set[Tuple[int, str]] = set()

    for i, word in enumerate(all_words):
        # ── confidence gate ───────────────────────────────────────────────
        # Missing confidence → 0.5 (neutral uncertainty), NOT 1.0.
        # A score of 1.0 would let unchecked words sail through; 0.5 means
        # "we don't know" which is appropriately cautious for a censor.
        conf = word.get("confidence", 0.5)
        if conf < confidence_threshold:
            continue

        raw_text = word.get("text", "")
        norm     = _normalise(raw_text)
        pre_norm = _pre_normalise(raw_text)  # used for phonetic + bigram keys

        if not norm:
            continue

        # Integer ms key — immune to floating-point rounding issues
        start_key = int(word["start"] * 1000)

        # ── unigram match ─────────────────────────────────────────────────
        is_match = (norm in target_set) or (pre_norm in target_set)
        if not is_match and phonetic:
            is_match = _phonetic_match(pre_norm, phonetic_index)

        if is_match:
            dedup_key = (start_key, norm)
            if dedup_key not in seen:
                seen.add(dedup_key)
                raw_intervals.append(
                    _asymmetric_pad(word["start"], word["end"], base_padding_ms)
                )

        # ── bigram match (tokens i and i+1) ──────────────────────────────
        # Key stored as "word1 word2" (space-separated), matching how
        # build_target_set() indexes multi-word phrases.
        if i + 1 < len(all_words):
            nxt         = all_words[i + 1]
            nxt_conf    = nxt.get("confidence", 0.5)
            nxt_norm    = _normalise(nxt.get("text", ""))
            nxt_pre     = _pre_normalise(nxt.get("text", ""))

            if nxt_conf >= confidence_threshold and nxt_norm:
                bigram     = f"{norm} {nxt_norm}"
                bigram_pre = f"{pre_norm} {nxt_pre}"
                bi_key     = (start_key, bigram)

                if (bigram in target_set or bigram_pre in target_set) and bi_key not in seen:
                    seen.add(bi_key)
                    raw_intervals.append(
                        _asymmetric_pad(word["start"], nxt["end"], base_padding_ms)
                    )

        # ── trigram match (tokens i, i+1, i+2) ───────────────────────────
        if i + 2 < len(all_words):
            mid          = all_words[i + 1]
            nxt2         = all_words[i + 2]
            mid_conf     = mid.get("confidence", 0.5)
            nxt2_conf    = nxt2.get("confidence", 0.5)
            mid_norm     = _normalise(mid.get("text", ""))
            nxt2_norm    = _normalise(nxt2.get("text", ""))
            mid_pre      = _pre_normalise(mid.get("text", ""))
            nxt2_pre     = _pre_normalise(nxt2.get("text", ""))

            if (
                mid_conf  >= confidence_threshold and mid_norm  and
                nxt2_conf >= confidence_threshold and nxt2_norm
            ):
                trigram     = f"{norm} {mid_norm} {nxt2_norm}"
                trigram_pre = f"{pre_norm} {mid_pre} {nxt2_pre}"
                tri_key     = (start_key, trigram)

                if (trigram in target_set or trigram_pre in target_set) and tri_key not in seen:
                    seen.add(tri_key)
                    raw_intervals.append(
                        _asymmetric_pad(word["start"], nxt2["end"], base_padding_ms)
                    )

    merged = _merge_intervals(raw_intervals)
    return [{"start_ms": s, "end_ms": e} for s, e in merged]