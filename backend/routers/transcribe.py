"""
Transcribe-only router — extract audio and return the transcript as JSON.
Used by the frontend's "Transcribe" button before the user picks bleep words.
"""

import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, Form

from services.video import extract_audio
from services.transcription import transcribe_audio

router = APIRouter()


@router.post("/transcribe")
async def transcribe_video(
    video: UploadFile,
    model: str = Form("base"),
):
    """
    Upload a video, extract its audio, and return the Whisper transcript.
    No video processing — fast, useful for previewing before censoring.
    """
    job_id  = str(uuid.uuid4())
    job_dir = Path("./jobs") / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    video_path = str(job_dir / "original.mp4")
    audio_path = str(job_dir / "original.wav")

    with open(video_path, "wb") as f:
        f.write(await video.read())

    extract_audio(video_path, audio_path)
    transcript, segments = transcribe_audio(audio_path, model_name=model)

    # Return word-level data so frontend can highlight matched words
    words = [
        {
            "text":       w["text"],
            "start":      w["start"],
            "end":        w["end"],
            "confidence": w.get("confidence", 1.0),
        }
        for seg in segments
        for w in seg.get("words", [])
    ]

    return {
        "job_id":     job_id,
        "transcript": transcript.strip(),
        "words":      words,
    }
