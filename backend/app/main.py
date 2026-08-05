import io
import os
from typing import List

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from groq import Groq

GROQ_MODEL = "whisper-large-v3"

app = FastAPI(title="Voice Note Transcription Service")


def get_groq_client() -> Groq:
    """Build a Groq client from the environment. Raises 500 if unconfigured."""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")
    return Groq(api_key=api_key)


@app.post("/api/transcribe")
async def transcribe_audio(
    chunks: List[UploadFile] = File(...),
    client: Groq = Depends(get_groq_client),
):
    """Assemble uploaded audio chunks in memory, transcribe via Groq, and
    discard the audio immediately. Audio is never written to disk."""
    if not chunks:
        raise HTTPException(status_code=400, detail="No audio chunks provided")

    buffer = io.BytesIO()
    try:
        for chunk in chunks:
            buffer.write(await chunk.read())

        if buffer.tell() == 0:
            raise HTTPException(status_code=400, detail="Received empty audio data")

        buffer.seek(0)
        filename = chunks[0].filename or "audio.webm"
        content_type = chunks[0].content_type or "audio/webm"

        try:
            transcription = client.audio.transcriptions.create(
                file=(filename, buffer, content_type),
                model=GROQ_MODEL,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}") from exc

        return {"text": transcription.text}
    finally:
        # Audio only ever lived in this in-memory buffer; drop it now that
        # the Groq call has finished (success or failure) and never persist it.
        buffer.close()
        for chunk in chunks:
            await chunk.close()
