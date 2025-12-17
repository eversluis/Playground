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