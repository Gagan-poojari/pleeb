"""
Process router  —  the core pipeline endpoint.

Flow:
  POST /api/process        → accepts video + options, starts background job,
                             returns { job_id }
  GET  /api/process/{id}/stream   → SSE stream of progress events
  GET  /api/process/{id}/status   → JSON snapshot of job state
  GET  /api/process/{id}/download → FileResponse with processed video
"""

import re
import uuid
import json
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any

from fastapi import APIRouter, UploadFile, Form
from fastapi.responses import FileResponse
from sse_starlette.sse import EventSourceResponse

router = APIRouter()

# ── in-memory job store (fine for single-server / hobby deploy) ───────────────
_jobs: Dict[str, Dict[str, Any]] = {}


def _set(job_id: str, **kwargs: Any) -> None:
    _jobs[job_id].update(kwargs)


# ── background worker ─────────────────────────────────────────────────────────

def _run_job(
    job_id: str,
    video_path: str,
    mode: str,
    model: str,
    word_list: list,
) -> None:
    """
    Runs entirely in a background thread (moviepy / whisper are blocking).
    Updates _jobs[job_id] at each stage so the SSE stream can relay progress.
    """
    from services.video import extract_audio, compose_video
    from services.transcription import transcribe_audio
    from services.word_match import find_matches
    from services.audio import apply_audio_replacements
    from assets.pleeb_words import pleeb_words_list

    job_dir   = Path(video_path).parent
    audio_path        = str(job_dir / "original.wav")
    output_audio_path = str(job_dir / "processed.wav")
    output_video_path = str(job_dir / "processed.mp4")

    try:
        # ── stage 1: extract audio ────────────────────────────────────────
        _set(job_id, stage="extracting", progress=8)
        extract_audio(video_path, audio_path)

        # ── stage 2: transcribe ───────────────────────────────────────────
        _set(job_id, stage="transcribing", progress=25)
        transcript, segments = transcribe_audio(audio_path, model_name=model)
        _set(job_id, transcript=transcript)

        if mode == "transcribe_only":
            _set(job_id, stage="done", progress=100, status="done")
            return

        # ── stage 3: match words ──────────────────────────────────────────
        _set(job_id, stage="matching", progress=60)
        targets = list(pleeb_words_list) if mode in ("auto_bleep", "meme") else []
        if word_list:
            targets = list(set(targets + word_list))
        intervals = find_matches(targets, segments)

        # ── stage 4: replace audio ────────────────────────────────────────
        _set(job_id, stage="processing", progress=75)
        sound_mode = "meme" if mode == "meme" else "bleep"
        apply_audio_replacements(audio_path, output_audio_path, intervals, sound_mode)

        # ── stage 5: compose final video ──────────────────────────────────
        _set(job_id, stage="composing", progress=90)
        compose_video(video_path, output_audio_path, output_video_path)

        _set(
            job_id,
            stage="done",
            progress=100,
            status="done",
            output_path=output_video_path,
        )

    except Exception as exc:
        _set(job_id, status="error", stage="error", progress=0, error=str(exc))


# ── endpoints ─────────────────────────────────────────────────────────────────

@router.post("/process")
async def start_process(
    video: UploadFile,
    mode:  str = Form("auto_bleep"),
    model: str = Form("base"),
    words: str = Form(""),
):
    """
    Accept an uploaded video and kick off the processing pipeline.
    Returns a job_id immediately; the client polls /stream for progress.
    """
    job_id  = str(uuid.uuid4())
    job_dir = Path("./jobs") / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    video_path = str(job_dir / "original.mp4")
    with open(video_path, "wb") as f:
        f.write(await video.read())

    word_list = [w.strip() for w in re.split(r"[,;\n]+", words) if w.strip()]

    _jobs[job_id] = {
        "status":      "processing",
        "stage":       "queued",
        "progress":    0,
        "transcript":  None,
        "output_path": None,
        "error":       None,
    }

    thread = threading.Thread(
        target=_run_job,
        args=(job_id, video_path, mode, model, word_list),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id}


@router.get("/process/{job_id}/stream")
async def stream_progress(job_id: str):
    """SSE endpoint — pushes a progress event every 500 ms until done/error."""

    async def _generator():
        while True:
            job = _jobs.get(job_id)
            if not job:
                yield {
                    "data": json.dumps({"status": "error", "error": "Job not found"})
                }
                return

            payload = {
                "stage":      job["stage"],
                "progress":   job["progress"],
                "status":     job["status"],
                "transcript": job.get("transcript"),
                "error":      job.get("error"),
            }
            yield {"data": json.dumps(payload)}

            if job["status"] in ("done", "error"):
                return

            await asyncio.sleep(0.5)

    return EventSourceResponse(_generator())


@router.get("/process/{job_id}/status")
async def get_status(job_id: str):
    """JSON snapshot — useful for polling fallback if SSE isn't available."""
    job = _jobs.get(job_id)
    if not job:
        return {"status": "error", "error": "Job not found"}
    return job


@router.get("/process/{job_id}/download")
async def download_result(job_id: str):
    """Stream the processed video back to the client."""
    job = _jobs.get(job_id)
    if not job or job["status"] != "done":
        return {"error": "Result not ready"}

    output_path = job.get("output_path")
    if not output_path or not Path(output_path).exists():
        return {"error": "Output file missing"}

    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename="pleeb_processed.mp4",
    )
