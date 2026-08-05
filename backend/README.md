# Voice Note Transcription Proxy

Minimal FastAPI backend implementing the voice transcription proxy from
`voice-note-architecture.md` ("Backend Proxy" pattern: client -> backend ->
Groq STT). This is the first slice of that architecture, scoped to satisfy
the [Audio Cleanup Policy](../voice-note-architecture.md#audio-cleanup-policy)
issue: audio is held in memory only and never written to disk.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Set the Groq API key before running against the real API:

```bash
export GROQ_API_KEY=your-key-here
```

## Run

```bash
uvicorn app.main:app --reload
```

`POST /api/transcribe` accepts a multipart file upload (`file`) and returns
`{"text": "..."}`. `GET /health` is a liveness check.

## Test

```bash
pytest
```

`tests/test_transcription_cleanup.py` is the automated cleanup-policy check
required by the issue: it snapshots the OS temp directory and the repo tree
before and after a transcription request (success and failure paths, with
the Groq call mocked) and asserts neither changed.
