# Prompt File System

This folder defines the **note-taking modes** available in the voice note app. Each file
controls how the LLM guides the conversation *while the user is talking* — asking
follow-up questions, keeping the user on topic, and deciding when enough information has
been captured. This is distinct from the refinement chain (`SystemPrompt.md`,
`ProjectPrompt.md`, `ExportNote.md`, `CustomPrompt.md`) described in
[`voice-note-architecture.md`](../voice-note-architecture.md#4-note-refinement-workflow),
which formats and commits the note *after* capture ends.

## File format

Each mode is a single markdown file with YAML frontmatter followed by the prompt body.

```markdown
---
mode: meeting-notes
description: Structured capture for meetings — attendees, decisions, and action items.
default: false
---

<system prompt body sent to the LLM for this mode>
```

### Frontmatter fields

| Field         | Required | Description                                                                 |
|---------------|----------|-------------------------------------------------------------------------------|
| `mode`        | yes      | Unique slug identifying the mode. Must match the filename (without `.md`).   |
| `description` | yes      | Short, user-facing summary shown in the mode picker.                        |
| `default`     | no       | `true` marks the mode pre-selected when the user hasn't chosen one. Exactly one file should set this. |

The prompt body (everything after the closing `---`) is injected verbatim into the LLM's
system prompt for the session.

## Storage location

Prompt files live in `/prompts/` at the root of the user's Obsidian vault (or, for
VPS-hosted setups, alongside the backend's data directory). Users may add their own
mode files here — no code change is required to introduce a new mode, only a new
markdown file following the format above.

## Backend integration contract

This repository does not yet contain the backend service described in
`voice-note-architecture.md`, so the loading behavior below is a contract for that
implementation rather than shipped code:

- **At session start**, the backend scans `/prompts/*.md`, parses the frontmatter of
  each file, and returns the list of `{ mode, description }` pairs to the client for the
  mode picker.
- **Before recording**, the user selects a mode from that list. If no selection is made,
  the backend falls back to the file with `default: true` (see [`default.md`](default.md)).
- The backend reads the selected file's body and injects it into the LLM system prompt
  for that recording session, ahead of the refinement chain prompts.
- If `/prompts/` is missing or empty, the backend must fall back to a built-in copy of
  `default.md` so the app functions out of the box.

## Included modes

| File                                       | Mode            | Default |
|---------------------------------------------|-----------------|---------|
| [`default.md`](default.md)                   | `general`       | yes     |
| [`meeting-notes.md`](meeting-notes.md)       | `meeting-notes` |         |
| [`daily-journal.md`](daily-journal.md)       | `daily-journal` |         |
| [`idea-capture.md`](idea-capture.md)         | `idea-capture`  |         |
