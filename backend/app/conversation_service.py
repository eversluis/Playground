"""Stateful conversation loop for refining a voice-transcribed note.

Flow:
1. start(transcription) seeds the conversation with the transcription as the
   first user message and asks the LLM for a clarifying follow-up.
2. respond(session_id, text) appends the user's reply (typed, or transcribed
   from a re-recording) and asks the LLM for the next follow-up.
3. confirm(session_id) can be called at any point to end the conversation and
   have the LLM produce the final, formatted note from the full history.
"""

import uuid
from dataclasses import dataclass, field


@dataclass
class Message:
    role: str  # "user" | "assistant"
    content: str


@dataclass
class ConversationSession:
    id: str
    messages: list = field(default_factory=list)
    completed: bool = False
    final_note: str = None


class ConversationManager:
    def __init__(self, llm_client, prompts):
        self._sessions = {}
        self._llm = llm_client
        self._prompts = prompts

    def start(self, transcription: str):
        session = ConversationSession(id=str(uuid.uuid4()))
        session.messages.append(Message("user", transcription))
        reply = self._ask_llm(session)
        session.messages.append(Message("assistant", reply))
        self._sessions[session.id] = session
        return session.id, reply

    def respond(self, session_id: str, text: str) -> str:
        session = self._get(session_id)
        if session.completed:
            raise ValueError("Conversation already completed")
        session.messages.append(Message("user", text))
        reply = self._ask_llm(session)
        session.messages.append(Message("assistant", reply))
        return reply

    def confirm(self, session_id: str) -> str:
        session = self._get(session_id)
        if session.completed:
            return session.final_note
        note = self._llm.chat(
            [{"role": "system", "content": self._prompts.export_prompt()}]
            + [{"role": m.role, "content": m.content} for m in session.messages]
        )
        session.completed = True
        session.final_note = note
        return note

    def history(self, session_id: str) -> list:
        return list(self._get(session_id).messages)

    def _ask_llm(self, session: ConversationSession) -> str:
        messages = [{"role": "system", "content": self._prompts.active_prompt()}]
        messages += [{"role": m.role, "content": m.content} for m in session.messages]
        return self._llm.chat(messages)

    def _get(self, session_id: str) -> ConversationSession:
        if session_id not in self._sessions:
            raise KeyError(session_id)
        return self._sessions[session_id]
