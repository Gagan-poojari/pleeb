"""
Video service — extract audio from a video and compose a new video
with a replacement audio track.

Changes vs original
───────────────────
  compose_video:
    • Assigns the AudioFileClip directly to video.audio instead of wrapping
      it in CompositeAudioClip([audio]).  The composite wrapper is designed
      for *mixing* multiple audio sources; with a single clip it introduces
      an unnecessary resampling pass that can cause subtle timing drift on
      some MoviePy versions.
    • Explicit resource cleanup via try/finally ensures clips are closed
      even if write_videofile raises (prevents file-handle leaks on Windows).
    • ffmpeg_params=["-movflags", "+faststart"] places the MP4 moov atom at
      the start of the file.  This enables progressive streaming in browsers
      and is required for some CDN / S3 setups.
    • threads=4 allows libx264 to use multiple CPU cores for faster encoding.

  extract_audio:
    • Raises a descriptive ValueError when the video has no audio track,
      instead of letting MoviePy raise an AttributeError on video.audio.write...
    • Extracts to uncompressed PCM WAV when requested, avoiding MP3 encoder
      delay/padding that can nudge censor timing.
"""

from pathlib import Path

from moviepy import AudioFileClip, VideoFileClip


def extract_audio(video_path: str, audio_path: str) -> None:
    """
    Extract the audio track from *video_path* and save it to *audio_path*.

    Args:
        video_path:  Path to the source video file.
        audio_path:  Destination path for extracted audio. Use .wav for
                     timestamp-sensitive pipelines.

    Raises:
        ValueError:  If the video has no audio track.
        FileNotFoundError: If video_path does not exist.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    video = VideoFileClip(str(path))
    try:
        if video.audio is None:
            raise ValueError(
                f"The uploaded video '{path.name}' has no audio track. "
                "Please upload a video with audio."
            )
        video.audio.write_audiofile(
            str(audio_path),
            fps=44100,          # stable sample rate for ASR + downstream editing
            codec="pcm_s16le",  # lossless WAV when output path is .wav
            logger=None,        # suppress MoviePy progress bars
        )
    finally:
        video.close()


def compose_video(
    original_video_path: str,
    processed_audio_path: str,
    output_video_path: str,
) -> None:
    """
    Replace the audio track in *original_video_path* with *processed_audio_path*
    and write the result to *output_video_path*.

    The video stream is re-encoded with libx264 (H.264) and the audio stream
    with AAC, which are the most universally compatible codecs for web delivery.

    Args:
        original_video_path:   Path to the source video.
        processed_audio_path:  Path to the censored audio (MP3 / WAV / etc.).
        output_video_path:     Destination path for the final video (MP4).

    Raises:
        FileNotFoundError: If either input file does not exist.
    """
    for p in (original_video_path, processed_audio_path):
        if not Path(p).exists():
            raise FileNotFoundError(f"Input file not found: {p}")

    # Unique temp file per output path — safe for concurrent jobs
    temp_audio = str(output_video_path) + ".temp_audio.m4a"

    video = VideoFileClip(str(original_video_path))
    audio = AudioFileClip(str(processed_audio_path))

    try:
        # Direct assignment — no CompositeAudioClip wrapper needed for a
        # single audio source.  The wrapper is for mixing and adds a
        # resampling pass that can introduce timing drift.
        video.audio = audio

        video.write_videofile(
            str(output_video_path),
            codec="libx264",
            audio_codec="aac",
            temp_audiofile=temp_audio,
            remove_temp=True,
            # Place moov atom at file start for progressive browser streaming
            ffmpeg_params=["-movflags", "+faststart"],
            # Use multiple cores for encoding — significantly faster on long videos
            threads=4,
            logger=None,    # suppress MoviePy progress bars
        )
    finally:
        video.close()
        audio.close()