# Pleeb — Complete Project Documentation

This document describes every major part of the Pleeb codebase: architecture, pipeline stages, services, API contracts, frontend flow, configuration, and operational notes.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Processing Pipeline](#3-processing-pipeline)
4. [Backend Services](#4-backend-services)
5. [API Reference](#5-api-reference)
6. [Authentication](#6-authentication)
7. [Frontend (Next.js)](#7-frontend-nextjs)
8. [Word List & Matching Logic](#8-word-list--matching-logic)
9. [Sound Assets](#9-sound-assets)
10. [Job Storage & File Layout](#10-job-storage--file-layout)
11. [Database](#11-database)
12. [Configuration & Environment](#12-configuration--environment)
13. [Dependencies](#13-dependencies)
14. [Known Limitations & Future Work](#14-known-limitations--future-work)

---

## 1. Overview

**Pleeb** is a full-stack application that automatically censors profanity in uploaded videos.

**High-level flow:**

1. User uploads an MP4 video via the web UI.
2. Backend extracts audio to lossless WAV.
3. Whisper transcribes speech with **per-word timestamps** and confidence scores.
4. A word-matching engine finds target profanity in the transcript.
5. Matched time ranges are replaced with bleep or meme audio.
6. Censored audio is muxed back into the original video.
7. User downloads the processed MP4.

**Tagline:** *Meme the Mess*

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Frontend (web/)                      │
│  Upload UI · Mode selector · Model picker · SSE progress · Auth │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP /api/* (rewritten to :8000)
┌────────────────────────────▼────────────────────────────────────┐
│                   FastAPI Backend (backend/)                       │
│  ┌──────────┐  ┌────────────┐  ┌─────────────────────────────┐  │
│  │  routers │  │  services  │  │  assets / sounds / jobs     │  │
│  │ process  │──│ video      │  │  pleeb_words_list           │  │
│  │ transcribe│ │ transcription│ │  bleep + meme WAV files    │  │
│  │ auth     │  │ word_match │  │  per-job scratch dirs       │  │
│  └──────────┘  │ audio      │  └─────────────────────────────┘  │
│                └────────────┘                                    │
│  Background threads for blocking work (Whisper, MoviePy)         │
│  In-memory job store (_jobs dict)                                │
│  SQLAlchemy + SQLite/PostgreSQL for users                        │
└─────────────────────────────────────────────────────────────────┘
```

### Design decisions

| Decision | Rationale |
|----------|-----------|
| **WAV intermediates** | Avoids MP3 encoder delay/padding that causes censorship timing drift |
| **Background threads** | Whisper and MoviePy are CPU-bound and block the event loop |
| **In-memory jobs** | Simple for single-server deploy; not durable across restarts |
| **SSE for progress** | Lightweight real-time updates without WebSocket complexity |
| **Whisper word timestamps** | `whisper-timestamped` refines boundaries via DTW for tighter bleeps |
| **Deterministic transcription** | `temperature=0.0`, `condition_on_previous_text=False` for repeatable runs |

---

## 3. Processing Pipeline

Implemented in `backend/routers/process.py` → `_run_job()`.

### Stages

| Stage | Progress | Service | Output |
|-------|----------|---------|--------|
| `extracting` | 8% | `video.extract_audio()` | `jobs/{id}/original.wav` |
| `transcribing` | 25% | `transcription.transcribe_audio()` | transcript + segments |
| `matching` | 60% | `word_match.find_matches()` | list of `{start_ms, end_ms}` |
| `processing` | 75% | `audio.apply_audio_replacements()` | `jobs/{id}/processed.wav` |
| `composing` | 90% | `video.compose_video()` | `jobs/{id}/processed.mp4` |
| `done` | 100% | — | download ready |

### Per-job file layout

```
backend/jobs/{job_uuid}/
├── original.mp4      # uploaded video
├── original.wav      # extracted audio (PCM 16-bit, 44.1 kHz)
├── processed.wav     # censored audio
└── processed.mp4     # final output
```

### Mode → behavior mapping

| `mode` (form field) | Word targets | Audio mode |
|---------------------|--------------|------------|
| `auto_bleep` | `pleeb_words_list` | `bleep` |
| `meme` | `pleeb_words_list` | `meme` |
| `custom_bleep` | user `words` form field | `bleep` |
| `transcribe_only` | — (stops after transcribe) | — |

---

## 4. Backend Services

### 4.1 `services/video.py`

**`extract_audio(video_path, audio_path)`**
- Uses MoviePy `VideoFileClip`.
- Raises `ValueError` if video has no audio track.
- Writes WAV with `fps=44100`, `codec="pcm_s16le"`.

**`compose_video(original_video_path, processed_audio_path, output_video_path)`**
- Replaces video audio track with censored audio.
- Assigns `AudioFileClip` directly (no `CompositeAudioClip` wrapper) to avoid resampling drift.
- Encodes: H.264 (`libx264`) + AAC.
- `ffmpeg_params=["-movflags", "+faststart"]` for browser streaming.
- `threads=4` for faster encoding.
- Cleans up clips in `finally` blocks (important on Windows).

---

### 4.2 `services/transcription.py`

Uses **`whisper-timestamped`** (`import whisper_timestamped as wts`).

**Models:** `tiny`, `base`, `small`, `medium`, `large`

| Tier | Models | Frontend |
|------|--------|----------|
| Free | `tiny`, `base` | Available without sign-in |
| Pro | `small`, `medium`, `large` | UI locked until authenticated |

**Model caching:** `_model_cache` dict — models loaded once per process. `preload_model("base")` called at app startup.

**Key transcription parameters:**

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `beam_size` | 5 | Beam search quality |
| `temperature` | 0.0 | Deterministic output |
| `condition_on_previous_text` | False | Prevents hallucination cascades on long audio |
| `no_speech_threshold` | 0.6 | Drops low-confidence silent segments |
| `compression_ratio_threshold` | 2.4 | Drops repetitive hallucinations |
| `language` | None | Auto-detect |
| `refine_whisper_precision` | 0.2 | DTW timestamp refinement (seconds) |
| `min_word_dur` | 0.02 | Drop sub-20ms phantom words |

**Returns:**
```python
transcript: str
segments: List[{
    "text": str,
    "start": float,  # seconds
    "end": float,
    "words": [{
        "text": str,
        "start": float,
        "end": float,
        "confidence": float  # 0.0–1.0
    }]
}]
```

**Device:** `cpu` by default in `get_model()` — change to `"cuda"` on GPU hosts.

---

### 4.3 `services/word_match.py`

The accuracy core. Six-layer pipeline:

#### Layer 1 — Pre-normalisation (`_pre_normalise`)
- Unicode NFKD normalization
- Lowercase
- Leetspeak reversal (`f*ck` → `fck`, `sh1t` → `shit`, `@` → `a`, etc.)
- Strip non-alpha edges
- Remove apostrophes
- Collapse 3+ repeated chars → 2 (`fuuuck` → `fuuck`)

#### Layer 2 — Lemmatisation (`_lemmatise`)
- NLTK WordNet lemmatizer (all POS tags: verb, noun, adj, adv)
- Picks shortest lemma candidate
- Graceful fallback if NLTK unavailable

#### Layer 3 — Surface-form expansion (`_get_variants`, `build_target_set`)
- From each target root, generates inflected forms (`fuck` → `fucking`, `fucked`, etc.)
- Multi-word targets stored as space-joined phrases (`"bull shit"`)
- Index-time expansion for O(1) lookup at match time

#### Layer 4 — N-gram matching
- **Unigram:** single token vs target set
- **Bigram:** `"word1 word2"` — fixes old bug where concatenation broke phrase keys
- **Trigram:** three-token phrases

#### Layer 5 — Confidence, padding, merging

**Confidence gate:** words below `confidence_threshold` (default `0.30`) are skipped. Missing confidence defaults to `0.5` (not `1.0`).

**Asymmetric padding (`_asymmetric_pad`):**
- Front pad: `1.5 × dynamic_pad` — compensates for Whisper start lag
- Tail pad: `0.6 × dynamic_pad` — shorter to avoid bleeding into next word
- `dynamic_pad = max(base_padding_ms, 10% of word duration)` (default base: 50 ms)

**Interval merging (`_merge_intervals`):**
- Merges overlapping or adjacent intervals within 120 ms gap
- Fuses phrases like "what the f***" into one continuous bleep

#### Layer 6 — Phonetic fallback (optional)
- Jellyfish Soundex matching
- Disabled by default (`phonetic=False`) — higher recall, more false positives

**`find_matches()` returns:**
```python
[{"start_ms": int, "end_ms": int}, ...]  # sorted, merged
```

---

### 4.4 `services/audio.py`

**Bleep mode:**
- Loads `bleep` from `backend/sounds/`
- Tiles bleep to **exact** interval duration (loop + trim)
- Perfect timeline sync — no fixed-length bleep copies needed

**Meme mode:**
- Picks sound by interval duration bucket:
  - Short: interval < 800 ms → `bruh`, `nope`, `yeet`
  - Medium: 800–1800 ms → `huh`, `minecraft_oof`, `windows_error`
  - Long: ≥ 1800 ms → `screaming_sheep`, `metal_boom`
- Random choice within bucket
- If sound ≥ interval → hard-trimmed
- If sound < interval → plays natural length, **silence** fills remainder (never leaks original audio)

**Volume matching (`_match_volume`):**
- Reference: 500 ms of audio before + after the interval
- Gain shift clamped to ±18 dB
- Skips adjustment if either side is silent (-inf dBFS)

**Output:** exports `processed.wav` (lossless)

**Timeline guarantee:** output length always equals source length; cursor advances monotonically through sorted intervals.

---

## 5. API Reference

Base URL: `http://localhost:8000` (dev)  
Frontend proxy: `/api/*` → backend via Next.js rewrites.

### Process

#### `POST /api/process`

**Content-Type:** `multipart/form-data`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `video` | file | required | MP4 video upload |
| `mode` | string | `auto_bleep` | `auto_bleep`, `meme`, `custom_bleep`, `transcribe_only` |
| `model` | string | `base` | Whisper model name |
| `words` | string | `""` | Comma-separated words (for `custom_bleep`) |

**Response:**
```json
{ "job_id": "uuid-string" }
```

#### `GET /api/process/{job_id}/stream`

Server-Sent Events. Emits JSON every 500 ms:

```json
{
  "stage": "transcribing",
  "progress": 25,
  "status": "processing",
  "transcript": "optional partial or full transcript",
  "error": null
}
```

Stops when `status` is `done` or `error`.

#### `GET /api/process/{job_id}/status`

JSON snapshot of current job state (polling fallback).

#### `GET /api/process/{job_id}/download`

Returns `pleeb_processed.mp4` as `FileResponse` when job is done.

---

### Transcribe

#### `POST /api/transcribe`

**Content-Type:** `multipart/form-data`

| Field | Type | Default |
|-------|------|---------|
| `video` | file | required |
| `model` | string | `base` |

**Response:**
```json
{
  "job_id": "uuid",
  "transcript": "full text",
  "words": [
    { "text": "hello", "start": 0.0, "end": 0.4, "confidence": 0.95 }
  ]
}
```

---

### Auth

Prefix: `/api/auth`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/register` | Create account, set HttpOnly cookie |
| `POST` | `/login` | Verify credentials, set cookie |
| `POST` | `/logout` | Clear cookie (204) |
| `GET` | `/me` | Current user (requires cookie) |

**Cookie:** `pleeb_auth` — HttpOnly JWT, 30-day expiry.

---

### Health

#### `GET /health`

```json
{ "status": "ok", "version": "2.0.0" }
```

---

## 6. Authentication

**Stack:** bcrypt password hashing, JWT (HS256), HttpOnly cookies.

**User model** (`database/models.py`):
- `id`, `email`, `hashed_password`, `is_pro`, `created_at`

**Frontend gating:**
- `ModelSelector` locks `small`, `medium`, `large` for unsigned users
- `ResultsPanel` prompts sign-in before download (UI-level; backend download is not auth-gated in current code)

**Security notes for production:**
- Set `JWT_SECRET_KEY` to a long random value
- Set cookie `secure=True` (HTTPS only)
- Restrict `ALLOWED_ORIGINS`
- Add rate limiting on upload endpoints

---

## 7. Frontend (Next.js)

**Location:** `web/`  
**Framework:** Next.js 16, React 19, TypeScript

### Key files

| File | Purpose |
|------|---------|
| `app/page.tsx` | Main upload + mode + process UI |
| `app/layout.tsx` | Root layout, metadata, `AuthProvider` |
| `lib/api.ts` | Typed API client (`startProcess`, `subscribeProgress`, `transcribeOnly`) |
| `components/VideoUploader.tsx` | Drag-and-drop file upload |
| `components/ModelSelector.tsx` | Whisper model picker with Pro lock |
| `components/ProgressStream.tsx` | SSE progress bar + stage pills |
| `components/ResultsPanel.tsx` | Side-by-side video + download |
| `components/AuthModal.tsx` | Login / register modal |
| `providers/AuthProvider.tsx` | Auth state context |
| `next.config.ts` | Dev proxy `/api/*` → `localhost:8000` |

### User flow

1. Upload MP4
2. Choose mode: Auto Bleep / Meme / Custom Bleep
3. (Optional) Enter custom words
4. Select Whisper model
5. Click **Process Video** or **Transcribe Only**
6. Watch SSE progress (extract → transcribe → match → replace → compose)
7. View results: original vs processed preview, transcript, download

### API client

All frontend calls use relative `/api/...` paths. Next.js rewrites forward to FastAPI in development.

```typescript
startProcess(file, mode, model, words) → job_id
subscribeProgress(jobId, onEvent, onError) → cleanup fn
getDownloadUrl(jobId) → `/api/process/{id}/download`
transcribeOnly(file, model) → { transcript, words }
```

---

## 8. Word List & Matching Logic

**File:** `backend/assets/pleeb_words.py`

**`pleeb_words_list`** — ~200+ root-form entries across categories:

| Category | Examples |
|----------|----------|
| Profanity | fuck, shit, asshole, bitch |
| Sexual | anatomy, acts, platform jargon |
| Slurs | racial, identity, disability |
| Hate | extremist terminology |
| Phrases | `mother fucker`, `bull dyke` (bigram/trigram matched) |

**Design principles:**
1. Store **root forms** only — inflections generated at match time
2. Multi-word compounds as separate entries when words alone wouldn't match
3. No duplicate inflected forms in the list
4. Leetspeak handled by matcher, not the word list

**Custom mode:** user supplies comma-separated words via the `words` form field; same matcher pipeline applies.

---

## 9. Sound Assets

**Directory:** `backend/sounds/`

### Current assets (WAV)

| File | Typical use |
|------|-------------|
| `bleep.wav` | Bleep mode (tiled) |
| `bruh.wav`, `nope.wav`, `yeet.wav` | Short meme bucket (< 800 ms) |
| `huh.wav`, `minecraft_oof.wav`, `windows_error.wav` | Medium bucket (800–1800 ms) |
| `screaming_sheep.wav`, `metal_boom.wav` | Long bucket (≥ 1800 ms) |

### Recommendations

- Format: WAV PCM 16-bit, 44.1 kHz
- Trim silence at start/end
- Normalize around -16 to -12 dBFS
- Bleep: one ~300–500 ms loop-friendly tone (tiling handles any interval length)
- Meme short: 200–750 ms | medium: 850–1700 ms | long: 1900–3200 ms

> **Note:** `audio.py` filename lists may reference `.mp3` extensions. If your assets are `.wav`, update the lists in `_SHORT_SOUNDS`, `_MEDIUM_SOUNDS`, `_LONG_SOUNDS`, and the bleep loader accordingly.

---

## 10. Job Storage & File Layout

- Jobs stored in memory: `_jobs: Dict[str, Dict]` in `process.py`
- Scratch files: `backend/jobs/{uuid}/`
- **Not persisted** across server restarts
- Suitable for single-server / hobby deployment
- For production: replace with Redis/DB job queue (Celery, RQ, etc.)

---

## 11. Database

**ORM:** SQLAlchemy  
**Default:** SQLite (`backend/pleeb.db`)  
**Production:** PostgreSQL via `DATABASE_URL` env var

**Tables:**
- `users` — authentication and `is_pro` flag

**Startup:** `Base.metadata.create_all(bind=engine)` in app lifespan.

**Connection handling:**
- SQLite: `check_same_thread=False`
- Postgres: `postgres://` auto-converted to `postgresql://`

---

## 12. Configuration & Environment

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./pleeb.db` | SQLAlchemy connection string |
| `JWT_SECRET_KEY` | `change-me-in-production...` | JWT signing secret |
| `ALLOWED_ORIGINS` | `localhost:3000,...` | CORS allowed origins (comma-separated) |

### Frontend (`web/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL for auth calls |

### CORS

Configured in FastAPI `CORSMiddleware`:
- `allow_credentials=True` (required for auth cookies)
- Methods and headers: `*`

---

## 13. Dependencies

### Backend (`backend/requirements.txt`)

| Package | Role |
|---------|------|
| `torch` | Whisper inference |
| `whisper-timestamped` | ASR + word timestamps |
| `moviepy` | Video/audio I/O |
| `pydub` | Audio editing, bleep/meme replacement |
| `fastapi`, `uvicorn` | Web framework |
| `sse-starlette` | SSE streaming |
| `sqlalchemy`, `psycopg2-binary` | Database |
| `python-dotenv` | Environment loading |
| `python-multipart` | File uploads |

**Also required (install separately):**
- `nltk` — WordNet lemmatization
- `jellyfish` — optional phonetic matching
- `passlib`, `bcrypt`, `python-jose`, `email-validator` — auth

**System:** FFmpeg (external)

### Frontend (`web/package.json`)

| Package | Role |
|---------|------|
| `next` 16 | Framework |
| `react` 19 | UI |
| `lucide-react` | Icons |
| `typescript` | Types |

---

## 14. Known Limitations & Future Work

| Area | Current state | Improvement |
|------|---------------|-------------|
| Job store | In-memory | Redis / DB-backed queue |
| GPU | CPU-only Whisper | `device="cuda"` on GPU hosts |
| Auth on download | UI-only gating | Enforce on `/download` endpoint |
| Meme selection | Random within bucket | Closest-duration pick; folder-based scan |
| Word list categories | Comment markers only | Structured metadata per word |
| Job cleanup | Manual / none | TTL cron to delete old `jobs/` dirs |
| Pro tier | `is_pro` flag exists | Enforce model access server-side |
| Tests | Referenced in word list docs | Add `tests/test_word_matcher.py` |
| Colab notebook | `colab_large_model_test.ipynb` | Benchmark large Whisper models |

### Timing accuracy tips

1. Use WAV intermediates (already implemented)
2. Trim silence in meme sound files
3. Use larger Whisper models for slang/accents
4. Tune `base_padding_ms` and `confidence_threshold` in `find_matches()`
5. Avoid MP3 anywhere in the processing chain

---

## Appendix: FastAPI Entry Point

The backend is started with:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

The FastAPI app (`main.py`) is expected to:
- Register routers: `auth`, `process`, `transcribe`
- Run lifespan hooks: DB init, Whisper pre-warm, jobs directory creation
- Configure CORS from `ALLOWED_ORIGINS`
- Expose `GET /health`

---

*Last updated: May 2026*
