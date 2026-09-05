"""
Pleeb FastAPI backend — entrypoint.

Run with:
    cd c:\\Pleeb\\backend
    uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import process, transcribe
from routers.auth import router as auth_router
from services.transcription import preload_model


# ── startup / shutdown ────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables (no-op if they already exist)
    Base.metadata.create_all(bind=engine)

    # Pre-load the default model so the first request doesn't feel slow
    preload_model("base")

    # Ensure jobs directory exists
    Path("./jobs").mkdir(exist_ok=True)

    yield


# ── app factory ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Pleeb API",
    version="2.0.0",
    description="Meme-bleep your videos with AI-powered transcription.",
    lifespan=lifespan,
)

import os

# Allow the Next.js dev server, production domain, and all Vercel previews
origins_env = os.getenv("ALLOWED_ORIGINS", "")
custom_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
allowed_origins = list(set([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pleeb.vercel.app",
] + custom_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── routers ───────────────────────────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(process.router,    prefix="/api", tags=["process"])
app.include_router(transcribe.router, prefix="/api", tags=["transcribe"])

# ── health check ──────────────────────────────────────────────────────────────

@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": "2.0.0"}
