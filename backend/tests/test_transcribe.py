import io
from types import SimpleNamespace

from fastapi.testclient import TestClient

from app.main import app, get_groq_client


class FakeTranscriptions:
    def __init__(self, text="hello world", error=None):
        self._text = text
        self._error = error
        self.calls = []

    def create(self, file, model):
        self.calls.append({"file": file, "model": model})
        if self._error:
            raise self._error
        return SimpleNamespace(text=self._text)


class FakeGroqClient:
    def __init__(self, text="hello world", error=None):
        self.audio = SimpleNamespace(transcriptions=FakeTranscriptions(text, error))


def _override(client):
    app.dependency_overrides[get_groq_client] = lambda: client


def teardown_function():
    app.dependency_overrides.clear()


def test_transcribe_success_assembles_chunks_and_returns_text():
    fake_client = FakeGroqClient(text="assembled transcript")
    _override(fake_client)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/transcribe",
            files=[
                ("chunks", ("chunk1.webm", io.BytesIO(b"abc"), "audio/webm")),
                ("chunks", ("chunk2.webm", io.BytesIO(b"def"), "audio/webm")),
            ],
        )

    assert response.status_code == 200
    assert response.json() == {"text": "assembled transcript"}

    create_call = fake_client.audio.transcriptions.calls[0]
    assert create_call["model"] == "whisper-large-v3"
    filename, buffer, content_type = create_call["file"]
    assert filename == "chunk1.webm"
    assert content_type == "audio/webm"
    assert buffer.read() == b"abcdef"


def test_transcribe_rejects_empty_audio():
    _override(FakeGroqClient())

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/transcribe",
            files=[("chunks", ("chunk1.webm", io.BytesIO(b""), "audio/webm"))],
        )

    assert response.status_code == 400


def test_transcribe_requires_api_key():
    def missing_key_client():
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured")

    app.dependency_overrides[get_groq_client] = missing_key_client

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/transcribe",
            files=[("chunks", ("chunk1.webm", io.BytesIO(b"abc"), "audio/webm"))],
        )

    assert response.status_code == 500


def test_transcribe_surfaces_groq_failure_as_502():
    fake_client = FakeGroqClient(error=RuntimeError("groq is down"))
    _override(fake_client)

    with TestClient(app) as test_client:
        response = test_client.post(
            "/api/transcribe",
            files=[("chunks", ("chunk1.webm", io.BytesIO(b"abc"), "audio/webm"))],
        )

    assert response.status_code == 502
