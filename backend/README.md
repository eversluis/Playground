# Transcription Backend

FastAPI service that receives audio chunks from the frontend, assembles them
in memory, transcribes them with Groq's `whisper-large-v3` model, and returns
the transcription text. Audio is never written to disk and is discarded
immediately after the Groq API responds.

## Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # then fill in GROQ_API_KEY
```

## Run

```bash
uvicorn app.main:app --reload
```

## API

### `POST /api/transcribe`

`multipart/form-data` request with one or more `chunks` file fields
containing the recorded audio (e.g. successive `MediaRecorder`
`ondataavailable` blobs). Chunks are concatenated in memory in the order
received and sent to Groq as a single audio file.

Response:

```json
{ "text": "transcribed text" }
```

## Tests

```bash
pip install -r requirements.txt -r requirements-dev.txt
pytest
```
