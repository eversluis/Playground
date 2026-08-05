import os

from fastapi import FastAPI, File, HTTPException, UploadFile

from .transcription import TranscriptionError, transcribe_audio

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_STT_URL = os.environ.get(
    "GROQ_STT_URL", "https://api.groq.com/openai/v1/audio/transcriptions"
)

app = FastAPI(title="Voice Note Transcription Proxy")


@app.post("/api/transcribe")
async def transcribe(file: UploadFile = File(...)):
    """Proxy an uploaded audio clip to Groq STT and return the transcript.

    Per the Audio Cleanup Policy (voice-note-architecture.md), the audio is
    read into memory only and discarded once this request completes - it is
    never written to a temp file or persisted anywhere, including when the
    upstream request fails.
    """
    audio_bytes = await file.read()
    try:
        text = await transcribe_audio(
            audio_bytes=audio_bytes,
            filename=file.filename or "audio.webm",
            content_type=file.content_type or "application/octet-stream",
            api_key=GROQ_API_KEY,
            api_url=GROQ_STT_URL,
        )
    except TranscriptionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        del audio_bytes

    return {"text": text}


@app.get("/health")
async def health():
    return {"status": "ok"}
