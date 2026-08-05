from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .conversation_service import ConversationManager
from .llm_client import get_llm_client
from .prompts import PromptChain

router = APIRouter(prefix="/api/conversation", tags=["conversation"])

_manager: Optional[ConversationManager] = None


def get_manager() -> ConversationManager:
    global _manager
    if _manager is None:
        _manager = ConversationManager(get_llm_client(), PromptChain())
    return _manager


class StartRequest(BaseModel):
    transcription: str


class MessageRequest(BaseModel):
    text: str


class ConversationResponse(BaseModel):
    session_id: str
    message: str


class ConfirmResponse(BaseModel):
    session_id: str
    note: str


class HistoryEntry(BaseModel):
    role: str
    content: str


class HistoryResponse(BaseModel):
    session_id: str
    messages: list


@router.post("/start", response_model=ConversationResponse)
def start_conversation(payload: StartRequest):
    session_id, message = get_manager().start(payload.transcription)
    return ConversationResponse(session_id=session_id, message=message)


@router.post("/{session_id}/message", response_model=ConversationResponse)
def send_message(session_id: str, payload: MessageRequest):
    try:
        message = get_manager().respond(session_id, payload.text)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ConversationResponse(session_id=session_id, message=message)


@router.post("/{session_id}/confirm", response_model=ConfirmResponse)
def confirm_conversation(session_id: str):
    try:
        note = get_manager().confirm(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return ConfirmResponse(session_id=session_id, note=note)


@router.get("/{session_id}/history", response_model=HistoryResponse)
def get_history(session_id: str):
    try:
        history = get_manager().history(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return HistoryResponse(
        session_id=session_id,
        messages=[{"role": m.role, "content": m.content} for m in history],
    )
