"""Audio transcription via the Groq STT API.

Audio Cleanup Policy: audio bytes handled here live only in memory (as
`bytes` / `io.BytesIO`) for the duration of a single request. Nothing in
this module reads from or writes to disk, on either the success or error
path. See voice-note-architecture.md for the full policy.
"""

import io

import httpx

DEFAULT_MODEL = "whisper-large-v3"


class TranscriptionError(Exception):
    """Raised when the upstream Groq STT API request fails."""


async def transcribe_audio(
    audio_bytes: bytes,
    filename: str,
    content_type: str,
    api_key: str,
    api_url: str,
    model: str = DEFAULT_MODEL,
) -> str:
    """Send in-memory audio bytes to Groq STT and return the transcript text.

    The caller retains ownership of `audio_bytes`; this function does not
    persist it anywhere and drops its own references (the BytesIO buffer)
    once the request completes, regardless of success or failure.
    """
    buffer = io.BytesIO(audio_bytes)
    files = {"file": (filename, buffer, content_type)}
    data = {"model": model}
    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                api_url, headers=headers, files=files, data=data, timeout=30.0
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise TranscriptionError(f"Groq STT request failed: {exc}") from exc
        finally:
            buffer.close()

    return response.json()["text"]
