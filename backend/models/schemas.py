from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ProcessMode(str, Enum):
    transcribe_only = "transcribe_only"
    custom_bleep = "custom_bleep"
    auto_bleep = "auto_bleep"
    meme = "meme"


class WhisperModel(str, Enum):
    tiny = "tiny"
    base = "base"
    small = "small"
    medium = "medium"
    large = "large"


class JobStatus(str, Enum):
    queued = "queued"
    extracting = "extracting"
    transcribing = "transcribing"
    matching = "matching"
    processing = "processing"
    composing = "composing"
    done = "done"
    error = "error"


class ProcessResponse(BaseModel):
    job_id: str


class TranscribeResponse(BaseModel):
    job_id: str
    transcript: str
    segments: list


class ProgressEvent(BaseModel):
    stage: str
    progress: int
    status: str
    transcript: Optional[str] = None
    error: Optional[str] = None
