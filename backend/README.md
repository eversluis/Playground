# Conversation Loop Backend

Implements the core interactive loop described in issue #12: after a voice
note is transcribed, an LLM asks clarifying questions until the user
confirms the note is complete.

## Layout

- `app/conversation_service.py` — `ConversationManager`, the in-memory
  stateful session store that drives the back-and-forth.
- `app/llm_client.py` — thin REST clients for OpenAI, Anthropic, and Groq,
  selected via `LLM_PROVIDER`.
- `app/prompts.py` — assembles the prompt chain
  (`SystemPrompt.md` + `ProjectPrompt.md` + `CustomPrompt.md` while asking
  questions, swapping in `ExportNote.md` once the user confirms).
- `app/api.py` / `app/main.py` — FastAPI endpoints exposing the loop.
- `prompts/` — the editable prompt files.

## API

- `POST /api/conversation/start` `{transcription}` → `{session_id, message}`
  Seeds a new session with the transcription and returns the LLM's first
  clarifying question.
- `POST /api/conversation/{session_id}/message` `{text}` → `{session_id, message}`
  Sends a user reply (typed, or transcribed from a re-recording) and
  returns the next LLM follow-up.
- `POST /api/conversation/{session_id}/confirm` → `{session_id, note}`
  Ends the conversation at any point and returns the final, formatted note.
- `GET /api/conversation/{session_id}/history` → `{session_id, messages}`

## Configuration

Set `LLM_PROVIDER` to `openai`, `anthropic`, or `groq`, and the matching API
key (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GROQ_API_KEY`). Optional
`*_MODEL` env vars override the default model per provider.

## Running

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Testing

```bash
cd backend
pytest
```

Tests use a fake LLM client and don't require API keys.
