# Voice Note App Architecture

## Overview
Transform ArchStudio into a voice-to-Obsidian note-taking application, maximizing code reuse while adding voice transcription and Git integration features.

## Architecture Decisions

### 1. Authentication Architecture
**Decision: Unified OAuth (Option B)**
- Users log in to the app using GitHub/GitLab OAuth
- Same OAuth token handles both app authentication and Git repository access
- Replaces existing JWT login screens
- Simplifies user management and token handling

### 2. Voice Processing Pipeline
**Decision: Backend Proxy (Option B)**
- Client → Backend proxy → Groq API
- Keeps API keys secure on server
- Adds minimal latency but ensures security
- All transcription requests go through backend

### 3. Git Integration Pattern
**Decision: Git APIs Only (Option B)**
- No local repository cloning
- Lighter weight implementation
- Uses GitHub/GitLab APIs for all operations
- Minimal repository scope permissions

### 4. Note Refinement Workflow
**Decision: Always Refine with Prompts**
- User captures voice note through conversation
- Can end capture via voice command or button
- LLM always processes note through prompt chain:
  - `SystemPrompt.md` - General system instructions
  - `ProjectPrompt.md` - Flow definitions
  - `ExportNote.md` - Note formatting and refinement instructions
  - `CustomPrompt.md` - User-editable additional prompt
- LLM refines and commits directly to Git

### 5. Conflict Resolution Strategy
**Decision: Last-Write-Wins (Option A)**
- Simple conflict handling
- No merge complexity
- Latest commit always takes precedence

## Implementation Details

### Authentication Flow
1. User clicks "Login with GitHub/GitLab"
2. OAuth flow redirects to provider
3. Returns with access token and refresh token
4. Tokens stored encrypted in database
5. Automatic token refresh using refresh token

### Voice Capture Flow
1. User activates recording (button or hands-free)
2. Audio streams to backend proxy
3. Backend forwards to Groq STT API
4. Transcription displayed in real-time
5. User ends capture (voice command or button)
6. LLM processes with all prompts
7. Refined note committed to Git repository

### Settings UI
- OAuth provider selection (GitHub/GitLab)
- Repository selection dropdown
- Custom prompt editor (easily accessible via button)
- Hands-free toggle (reused from ArchStudio)
- No advanced options (branch selection, etc.)

### Security
- OAuth tokens encrypted at rest in database
- API keys never exposed to client
- All external API calls through backend proxy
- Minimal repository permissions requested

### Audio Cleanup Policy
No audio data may be persisted to disk or any datastore, at any stage of the pipeline. This applies to the client, the backend proxy, and any downstream service (Groq STT).

**Data flow (audio never touches disk):**
1. Client captures audio via the browser's microphone APIs and streams it in-memory to the backend proxy over the existing authenticated connection (WebSocket/SSE per the Voice Capture Flow above). The client does not write the recording to local storage.
2. The backend proxy receives audio chunks into memory only (request body buffer / stream) and forwards them directly to the Groq STT API. The backend must not write incoming audio to a temp file, log file, or database, and must not include raw audio in structured logs.
3. Once Groq returns the transcription, the backend discards the in-memory audio buffer. Only the resulting text is retained, and it flows into the existing Note Refinement Workflow (LLM prompt chain → Git commit).
4. If a request fails or the connection drops mid-stream, buffered audio for that request must still be discarded (not flushed to disk as part of error handling/retry logic).

**Enforcement:**
- Code review checklist item for the transcription service: confirm no `fs.writeFile`/temp-file APIs are used anywhere in the audio-handling path, and that audio buffers are scoped to the request lifecycle only (no caching, no queueing to disk-backed storage).
- Add an integration test that drives an audio clip through the transcription endpoint and then asserts the filesystem and any temp directories are unchanged (no new files) before and after the request, including on error paths.
- Logging must redact/exclude raw audio payloads; only metadata (duration, size, request id) may be logged.

This policy has no corresponding implementation yet — the transcription service and backend proxy described in this document have not been built in this repository. The checklist above should be applied during the code review and test-writing pass once that implementation lands.

## Code Reuse Strategy

### Backend (~70% reuse)
- **Keep**: FastAPI structure, database models, service architecture
- **Modify**: Replace JWT with OAuth middleware
- **Add**: Git service, OAuth endpoints, Groq proxy

### Frontend (~60% reuse)
- **Keep**: Voice recording, chat UI, API infrastructure
- **Remove**: Artifact management components
- **Add**: Settings panel, OAuth flow, custom prompt editor

### Services
- **Voice Service**: Modify to use Groq STT via proxy
- **LLM Service**: Extend for note refinement workflow
- **New Git Service**: Handle all repository operations
- **New Auth Service**: OAuth token management

## Technical Stack
- **Backend**: FastAPI (existing)
- **Database**: PostgreSQL with encrypted token storage
- **Voice**: Groq STT API (via proxy)
- **LLM**: Existing provider for refinement
- **Git**: GitHub/GitLab REST APIs
- **Frontend**: Vanilla JS (existing framework)

## Key Features
1. **Single Sign-On**: OAuth login for app and Git access
2. **Secure Transcription**: All voice processing through backend
3. **Automatic Refinement**: Every note processed by LLM
4. **Simple Git Integration**: API-only, no local clones
5. **Customizable Prompts**: User can edit refinement behavior
6. **Hands-Free Mode**: Voice-activated recording (reused)

This architecture maximizes code reuse while providing a focused voice-note experience with secure Git integration.