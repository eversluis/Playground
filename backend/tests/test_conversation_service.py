import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest

from app.conversation_service import ConversationManager
from app.prompts import PromptChain


class FakeLLMClient:
    def __init__(self, replies):
        self._replies = list(replies)
        self.calls = []

    def chat(self, messages):
        self.calls.append(messages)
        return self._replies.pop(0)


def make_manager(replies, prompts_dir):
    return ConversationManager(FakeLLMClient(replies), PromptChain(prompts_dir))


def test_start_conversation_sends_transcription_and_returns_followup(tmp_path):
    manager = make_manager(["What time did this happen?"], tmp_path)

    session_id, message = manager.start("Met with Sam about the roadmap")

    assert message == "What time did this happen?"
    history = manager.history(session_id)
    assert history[0].role == "user"
    assert history[0].content == "Met with Sam about the roadmap"
    assert history[1].role == "assistant"
    assert history[1].content == "What time did this happen?"


def test_conversation_history_accumulates_across_turns():
    manager = make_manager(["Follow-up 1", "Follow-up 2"], Path("/nonexistent"))

    session_id, _ = manager.start("Initial note")
    manager.respond(session_id, "It happened at 3pm")

    history = manager.history(session_id)
    assert [m.role for m in history] == ["user", "assistant", "user", "assistant"]
    assert history[2].content == "It happened at 3pm"
    assert history[3].content == "Follow-up 2"


def test_confirm_produces_final_note_and_is_idempotent():
    manager = make_manager(["Follow-up question", "# Final refined note"], Path("/nonexistent"))

    session_id, _ = manager.start("Initial note")
    note = manager.confirm(session_id)

    assert note == "# Final refined note"
    # Calling confirm again should not trigger another LLM call.
    assert manager.confirm(session_id) == note


def test_cannot_respond_after_confirm():
    manager = make_manager(["Follow-up question", "Final note"], Path("/nonexistent"))

    session_id, _ = manager.start("Initial note")
    manager.confirm(session_id)

    with pytest.raises(ValueError):
        manager.respond(session_id, "more info")


def test_unknown_session_raises_key_error():
    manager = make_manager([], Path("/nonexistent"))

    with pytest.raises(KeyError):
        manager.history("does-not-exist")


def test_active_prompt_used_while_confirm_uses_export_prompt(tmp_path):
    (tmp_path / "SystemPrompt.md").write_text("SYSTEM")
    (tmp_path / "ProjectPrompt.md").write_text("PROJECT")
    (tmp_path / "ExportNote.md").write_text("EXPORT")
    (tmp_path / "CustomPrompt.md").write_text("")

    fake_client = FakeLLMClient(["follow-up", "final note"])
    manager = ConversationManager(fake_client, PromptChain(tmp_path))

    session_id, _ = manager.start("Initial note")
    manager.confirm(session_id)

    start_system_message = fake_client.calls[0][0]["content"]
    confirm_system_message = fake_client.calls[1][0]["content"]

    assert "PROJECT" in start_system_message
    assert "EXPORT" not in start_system_message
    assert "EXPORT" in confirm_system_message
    assert "PROJECT" not in confirm_system_message
