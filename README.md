# Pleeb — Meme the Mess

AI-powered video auto-censorship. Upload a video, transcribe speech with Whisper, detect profanity (including obfuscated and multi-word phrases), and replace flagged segments with a **bleep** or **meme sound** — while keeping audio/video in sync.

## Features

- **Auto Bleep** — detect swear words from a built-in word list and bleep them
- **Meme the Mess** — replace flagged words with random meme sounds
- **Custom Bleep** — choose your own words to censor
- **Transcribe Only** — preview the transcript without processing video
- **Whisper models** — `tiny`, `base`, `small`, `medium`, `large` (larger models gated behind sign-in on the frontend)
- **Real-time progress** — Server-Sent Events (SSE) stream during processing
- **User accounts** — JWT auth with HttpOnly cookies (unlock Pro models)

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| Frontend | Next.js 16, React 19, TypeScript |
| Backend | Python, FastAPI, Uvicorn |
| AI / ASR | OpenAI Whisper (`whisper-timestamped`) |
| Media | MoviePy, FFmpeg, Pydub |
| NLP | NLTK WordNet (lemmatization), optional Jellyfish (phonetic) |
| Database | SQLAlchemy (SQLite default, PostgreSQL supported) |
| Auth | JWT, bcrypt (passlib), python-jose |

## Project Structure

```
Pleeb/
├── backend/           # FastAPI API + processing pipeline
│   ├── routers/       # process, transcribe, auth endpoints
│   ├── services/      # transcription, word_match, audio, video
│   ├── assets/        # pleeb_words_list vocabulary
│   ├── sounds/        # bleep + meme audio assets
│   └── jobs/          # per-job scratch files (gitignored outputs)
├── web/               # Next.js frontend
└── DOCUMENTATION.md   # full technical reference
```

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg** — required by MoviePy and Pydub ([install guide](https://ffmpeg.org/download.html))

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
pip install nltk jellyfish passlib python-jose bcrypt email-validator

uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Next.js dev server proxies `/api/*` to `http://localhost:8000/api/*`.

### 3. Environment Variables

Create `backend/.env` (optional):

```env
DATABASE_URL=sqlite:///./pleeb.db
JWT_SECRET_KEY=your-long-random-secret
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Create `web/.env.local` (optional):

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Processing Modes

| Mode | Description |
|------|-------------|
| `auto_bleep` | Censor words from `pleeb_words_list` with a bleep tone |
| `meme` | Censor words from `pleeb_words_list` with meme sounds |
| `custom_bleep` | Censor user-supplied comma-separated words with a bleep |
| `transcribe_only` | Return transcript only (no censorship) |

## Sound Assets

Place audio files in `backend/sounds/`:

- `bleep.wav` — loopable bleep tone (~300–500 ms)
- Meme sounds: `bruh.wav`, `nope.wav`, `yeet.wav`, `huh.wav`, `minecraft_oof.wav`, `windows_error.wav`, `screaming_sheep.wav`, `metal_boom.wav`

WAV (PCM 16-bit, 44.1 kHz) is recommended. Trim leading/trailing silence for tighter timing.

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/process` | Upload video, start processing job |
| `GET` | `/api/process/{id}/stream` | SSE progress stream |
| `GET` | `/api/process/{id}/status` | Job status snapshot |
| `GET` | `/api/process/{id}/download` | Download processed MP4 |
| `POST` | `/api/transcribe` | Transcribe only (no censorship) |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Sign in |
| `GET` | `/api/auth/me` | Current user profile |
| `GET` | `/health` | Health check |

See [DOCUMENTATION.md](./DOCUMENTATION.md) for the complete technical reference.

## License

Private / personal project — add a license if you plan to open-source.
