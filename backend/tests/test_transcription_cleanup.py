"""Integration tests for the Audio Cleanup Policy.

These tests assert that transcribing audio through the /api/transcribe
endpoint never leaves files on disk - neither in the OS temp directory nor
anywhere in the repository - on both the success and failure paths. The
Groq STT network call is mocked so the tests run offline and deterministically.
"""

import asyncio
import os
import tempfile

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main, transcription

FAKE_AUDIO_BYTES = b"RIFF....WAVEfmt fake audio payload"


def _snapshot_disk_state():
    """Return (temp dir file set, repo tree file set) to diff against later."""
    temp_files = set(os.listdir(tempfile.gettempdir()))

    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    repo_files = set()
    for dirpath, dirnames, filenames in os.walk(repo_root):
        dirnames[:] = [d for d in dirnames if d not in (".git", "__pycache__", ".pytest_cache")]
        for name in filenames:
            repo_files.add(os.path.relpath(os.path.join(dirpath, name), repo_root))

    return temp_files, repo_files


def _assert_disk_unchanged(before, after):
    before_temp, before_repo = before
    after_temp, after_repo = after
    assert after_temp == before_temp, (
        f"Temp dir changed during transcription: new={after_temp - before_temp}"
    )
    assert after_repo == before_repo, (
        f"Repo tree changed during transcription: new={after_repo - before_repo}"
    )


@pytest.fixture
def client():
    return TestClient(main.app)


class _FakeSuccessResponse:
    def raise_for_status(self):
        return None

    def json(self):
        return {"text": "hello from the fake transcript"}


async def _fake_post_success(self, url, headers=None, files=None, data=None, timeout=None):
    return _FakeSuccessResponse()


async def _fake_post_failure(self, url, headers=None, files=None, data=None, timeout=None):
    request = httpx.Request("POST", url)
    raise httpx.ConnectError("simulated upstream failure", request=request)


def test_no_files_left_after_successful_transcription(client, monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post_success)

    before = _snapshot_disk_state()
    response = client.post(
        "/api/transcribe",
        files={"file": ("note.wav", FAKE_AUDIO_BYTES, "audio/wav")},
    )
    after = _snapshot_disk_state()

    assert response.status_code == 200
    assert response.json() == {"text": "hello from the fake transcript"}
    _assert_disk_unchanged(before, after)


def test_no_files_left_after_failed_transcription(client, monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post_failure)

    before = _snapshot_disk_state()
    response = client.post(
        "/api/transcribe",
        files={"file": ("note.wav", FAKE_AUDIO_BYTES, "audio/wav")},
    )
    after = _snapshot_disk_state()

    assert response.status_code == 502
    _assert_disk_unchanged(before, after)


def test_transcribe_audio_never_touches_disk_directly(monkeypatch):
    monkeypatch.setattr(httpx.AsyncClient, "post", _fake_post_success)

    before = _snapshot_disk_state()
    text = asyncio.run(
        transcription.transcribe_audio(
            audio_bytes=FAKE_AUDIO_BYTES,
            filename="note.wav",
            content_type="audio/wav",
            api_key="test-key",
            api_url="https://example.invalid/transcriptions",
        )
    )
    after = _snapshot_disk_state()

    assert text == "hello from the fake transcript"
    _assert_disk_unchanged(before, after)
