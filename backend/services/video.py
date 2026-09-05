"""
Video service — ultra-low memory audio extraction and video composition.
Uses FFmpeg directly via subprocess to avoid loading video frames into Python RAM.
"""

import os
import shutil
import subprocess
from pathlib import Path

try:
    from imageio_ffmpeg import get_ffmpeg_exe
    _FFMPEG_PATH = get_ffmpeg_exe()
except Exception:
    _FFMPEG_PATH = shutil.which("ffmpeg") or "ffmpeg"


def extract_audio(video_path: str, audio_path: str) -> None:
    """
    Extract the audio track from *video_path* to *audio_path* via FFmpeg.
    Zero Python RAM overhead — runs in an external lightweight process.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    # Extract 16-bit PCM WAV at 44.1kHz mono (optimized for Whisper and low RAM)
    cmd = [
        _FFMPEG_PATH,
        "-y",
        "-i", str(video_path),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "44100",
        "-ac", "1",
        str(audio_path),
    ]

    try:
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as err:
        stderr_text = err.stderr.decode("utf-8", errors="replace")
        if "does not contain any stream" in stderr_text or "Output file is empty" in stderr_text:
            raise ValueError(f"Video '{path.name}' does not contain an audio track.") from err
        raise RuntimeError(f"FFmpeg audio extraction failed: {stderr_text}") from err


def compose_video(
    original_video_path: str,
    processed_audio_path: str,
    output_video_path: str,
) -> None:
    """
    Replace the audio track in *original_video_path* with *processed_audio_path*.
    Uses stream-copy for video (-c:v copy) to achieve instantaneous muxing without
    re-encoding frames or consuming Python RAM.
    """
    for p in (original_video_path, processed_audio_path):
        if not Path(p).exists():
            raise FileNotFoundError(f"Input file not found: {p}")

    cmd = [
        _FFMPEG_PATH,
        "-y",
        "-i", str(original_video_path),
        "-i", str(processed_audio_path),
        "-c:v", "copy",          # direct stream copy (no video re-encoding, near-zero RAM)
        "-c:a", "aac",            # clean AAC audio encoding
        "-map", "0:v:0?",        # map original video stream if present
        "-map", "1:a:0",         # map new processed audio track
        "-movflags", "+faststart", # web streaming optimization
        "-shortest",             # match duration
        str(output_video_path),
    ]

    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except subprocess.CalledProcessError as err:
        # Fallback to re-encoding if stream copy fails for exotic video containers
        fallback_cmd = [
            _FFMPEG_PATH,
            "-y",
            "-i", str(original_video_path),
            "-i", str(processed_audio_path),
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "23",
            "-c:a", "aac",
            "-map", "0:v:0?",
            "-map", "1:a:0",
            "-movflags", "+faststart",
            str(output_video_path),
        ]
        subprocess.run(fallback_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)