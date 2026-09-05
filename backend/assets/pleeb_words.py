"""
pleeb_words_list  —  Pleeb profanity / censorship vocabulary
─────────────────────────────────────────────────────────────

Design principles
─────────────────
1.  ROOT-FIRST.  Store the shortest canonical root form.  The word_matcher
    NLP layer (lemmatisation + suffix expansion) automatically generates all
    inflected surface forms at match time.
    e.g.  "fuck" → fuck / fucks / fucking / fucker / fuckers / fucked / fuckin

2.  COMPOUNDS + PHRASES as multi-word entries where the words would not be
    caught individually.  The bigram/trigram matcher handles these.
    e.g.  "mother fucker" is a separate entry because "mother" alone is safe.

3.  NO DUPLICATES.  Inflected forms that the expander already covers are
    omitted (so "fucking" is NOT listed — "fuck" covers it).  Exceptions:
    irregular forms the suffix expander cannot derive (e.g. "jizz" and "jism"
    are kept separately because neither stems from the other).

4.  SLUR COVERAGE.  Racial/ethnic/homophobic slurs are included for platforms
    that need full hate-speech censoring.  Operators can slice the list by
    category if they want a subset.

5.  LEET & OBFUSCATION.  The word_matcher pre-normaliser handles f*ck → fuck,
    sh1t → shit, etc., so leetspeak variants are NOT needed here.

Categories (comment markers for slicing)
─────────────────────────────────────────
  # PROFANITY       — everyday swear words
  # SEXUAL          — sexual acts / anatomy
  # SLURS           — racial / ethnic / identity slurs
  # HATE            — hate-group / extremist terminology
  # KINK/FETISH     — BDSM, fetish, paraphilia terminology
  # NSFW_PLATFORM   — adult-platform / cam-site jargon
  # DRUGS           — drug slang (off by default in the list; include if needed)

Maintenance
───────────
  Add new words to the correct category.
  Always add the ROOT, not an inflected form.
  Run the test suite after every edit (tests/test_word_matcher.py).
"""

# fmt: off
pleeb_words_list = [

    # ── PROFANITY ──────────────────────────────────────────────────────────────
    "ass",
    "asshat",
    "asshole",
    "assmunch",
    "badass",          # compound; expander gives badasses, badassery
    "bastard",
    "bitch",
    "bollocks",
    "bullcrap",
    "bullshit",
    "butthole",
    "cock",
    "crap",
    "cunt",
    "damn",
    "dammit",
    "dipshit",
    "dumbass",
    "fag",             # also catches faggot via suffix expander
    "fuck",
    "goddamn",
    "halfass",
    "hell",            # contextual; keep if your platform needs it
    "horseshit",
    "jackass",
    "motherfucker",    # irregular compound — expander won't derive from "mother"
    "piss",
    "prick",
    "shit",
    "shitblimp",
    "shitty",
    "smartass",
    "stfu",
    "twat",
    "wank",
    "whore",
    "wtf",

    # ── SEXUAL — anatomy ──────────────────────────────────────────────────────
    "anus",
    "boob",
    "buttcheeks",
    "clitoris",        # also "clit" below for shorthand
    "clit",
    "cum",
    "dick",
    "genitals",
    "jizz",
    "jism",            # irregular variant of jizz
    "nipple",
    "penis",
    "pussy",
    "rectum",
    "semen",
    "tit",             # expander gives: tits, titties
    "urethra",
    "vagina",
    "vulva",

    # ── SEXUAL — acts ─────────────────────────────────────────────────────────
    "anal",
    "anilingus",
    "bareback",
    "blowjob",
    "blumpkin",
    "circlejerk",
    "creampie",
    "cunnilingus",
    "deepthroat",
    "ejaculation",
    "felch",
    "fellatio",
    "feltch",
    "fingerbang",
    "fisting",
    "footjob",
    "frotting",
    "gangbang",
    "gokkun",
    "grope",
    "handjob",
    "intercourse",
    "jerkoff",
    "knobbing",
    "masturbate",
    "muffdiving",
    "orgasm",
    "orgy",
    "pegging",
    "rape",
    "rimjob",
    "rimming",
    "scissoring",
    "sex",
    "shrimping",
    "snowballing",
    "sodomize",
    "sodomy",
    "throating",
    "upskirt",

    # ── SEXUAL — identity/content labels ──────────────────────────────────────
    "autoerotic",
    "bdsm",
    "bondage",
    "boner",
    "busty",
    "camgirl",
    "camwhore",
    "domination",
    "dominatrix",
    "ecchi",
    "erotic",
    "femdom",
    "hentai",
    "homoerotic",
    "hooker",
    "horny",
    "incest",
    "jailbait",
    "kinky",
    "lolita",
    "milf",
    "nude",
    "nympho",
    "porn",
    "pornography",
    "sadism",
    "shemale",
    "skeet",
    "slut",
    "smut",
    "strapon",
    "swinger",
    "threesome",
    "twink",
    "voyeur",

    # ── SEXUAL — paraphilia / fetish ──────────────────────────────────────────
    "acrotomophilia",
    "coprolagnia",
    "coprophilia",
    "dendrophilia",
    "dolcett",
    "figging",
    "futanari",
    "guro",
    "kinbaku",
    "nimphomania",
    "omorashi",
    "paedophile",
    "pedophile",
    "scat",
    "shota",
    "shibari",
    "strappado",
    "urophilia",
    "yaoi",
    "yiffy",
    "zoophilia",

    # ── SEXUAL — anatomy slang ────────────────────────────────────────────────
    "cornhole",
    "dingleberry",
    "jugg",            # expander gives: juggs
    "panty",           # expander gives: panties
    "poontang",
    "poon",
    "pubes",
    "queef",
    "quim",
    "schlong",
    "snatch",
    "spunk",
    "tushy",

    # ── SEXUAL — compound phrases (bigram matcher) ────────────────────────────
    "bull dyke",
    "carpet muncher",
    "date rape",
    "dog gie style",
    "dvda",
    "mother fucker",

    # ── SEXUAL — NSFW platform / product names ────────────────────────────────
    "babeland",
    "camslut",
    "cialis",
    "goatcx",
    "goatse",
    "livesex",
    "nambla",
    "nsfw",
    "octopussy",
    "playboy",
    "pthc",
    "santorum",
    "sexcam",
    "thumbzilla",
    "viagra",
    "vibrator",
    "voyeurweb",
    "worldsex",

    # ── SLURS — racial / ethnic ───────────────────────────────────────────────
    "beaner",
    "chink",
    "coon",
    "cracker",
    "darkie",
    "gook",
    "honky",
    "jigaboo",
    "kike",
    "negro",
    "nigga",
    "nigger",
    "paki",
    "raghead",
    "redskin",
    "slanteye",
    "spic",
    "towelhead",
    "wetback",

    # ── SLURS — identity / disability ─────────────────────────────────────────
    "dyke",
    "homo",
    "mong",
    "pikey",
    "poof",
    "retard",
    "spastic",
    "tranny",

    # ── SLURS — internet / modern ─────────────────────────────────────────────
    "incel",
    "simp",
    "thot",

    # ── HATE ─────────────────────────────────────────────────────────────────
    "neonazi",
    "swastika",

    # ── MISC adult/explicit ───────────────────────────────────────────────────
    "arsehole",
    "barenaked",
    "bastinado",
    "bbw",
    "bimbos",
    "birdlock",
    "bukake",           # common misspelling of bukkake
    "bukkake",
    "bulldyke",
    "bullet vibe",
    "carpetmuncher",
    "dommes",
    "erotism",
    "escort",
    "eunuch",
    "fecal",
    "fingering",
    "fudgepacker",
    "goregasm",
    "hardcore",
    "jiggerboo",
    "lovemaking",
    "nawashi",
    "nutten",
    "pisspig",
    "pleasure",         # contextual — remove if causes false positives
    "sexual",
    "sexuality",
    "skank",
    "splooge",
    "spooge",
    "twinkie",
    "undressing",
    "wetdream",

]
# fmt: on


# ── Convenience helpers ────────────────────────────────────────────────────────

def get_words_by_category(category: str) -> list[str]:
    """
    Return words from a specific category.

    This is a stub — in production you'd want to store metadata alongside each
    word (e.g. as a dict) so you can filter programmatically.  For now, use
    the comment markers in the source as documentation for manual subsetting.

    Example operator use-cases:
      "light mode" → PROFANITY only (no slurs, no fetish)
      "strict mode" → all categories
      "family mode" → PROFANITY + SLURS + HATE only
    """
    raise NotImplementedError(
        "Category filtering requires migrating pleeb_words_list to a list of "
        "dicts: [{'word': 'fuck', 'category': 'PROFANITY', 'severity': 3}, ...]"
        "  See CONTRIBUTING.md for the migration guide."
    )