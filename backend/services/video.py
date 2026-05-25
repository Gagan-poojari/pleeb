"""
Video service — extract audio from a video and compose a new video
with a replacement audio track.
"""

from pathlib import Path
from moviepy import VideoFileClip, AudioFileClip, CompositeAudioClip


def extract_audio(video_path: str, audio_path: str) -> None:
    """Extract the audio track from a video file and save it as MP3."""
    video = VideoFileClip(str(video_path))
    if video.audio is None:
        video.close()
        raise ValueError("The uploaded video has no audio track.")
    video.audio.write_audiofile(str(audio_path), logger=None)
    video.close()


def compose_video(
    original_video_path: str,
    processed_audio_path: str,
    output_video_path: str,
) -> None:
    """
    Replace the audio track in original_video_path with processed_audio_path
    and write the result to output_video_path.
    """
    video = VideoFileClip(str(original_video_path))
    audio = AudioFileClip(str(processed_audio_path))

    video.audio = CompositeAudioClip([audio])

    # Use a unique temp file per job to avoid conflicts during concurrent runs
    temp_audio = str(output_video_path) + ".temp.m4a"

    video.write_videofile(
        str(output_video_path),
        codec="libx264",
        audio_codec="aac",
        temp_audiofile=temp_audio,
        remove_temp=True,
        logger=None,
    )

    video.close()
    audio.close()
