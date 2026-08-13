# Note Metadata & Markdown Template Specification

## Overview
Every voice note written to the Obsidian vault is a single Markdown file with a YAML
frontmatter block followed by a body. This document defines the frontmatter schema,
the body structure, and how templates are configured per prompt mode (see
`voice-note-architecture.md` for the prompt chain: `SystemPrompt.md` →
`ProjectPrompt.md` → `ExportNote.md` → `CustomPrompt.md`).

The template is rendered **server-side** by the note-generation service immediately
before the file is committed to the Git-backed vault, so the output is consistent
regardless of client (web, mobile, hands-free).

## Frontmatter Schema

```yaml
---
title: string            # short, human-readable title (LLM-generated if not dictated)
date: string              # ISO 8601 timestamp, e.g. 2026-08-05T13:46:00Z
duration: number           # recording length in whole seconds
tags: string[]             # lowercase, kebab-case tags (LLM-suggested + user overrides)
mode: string                # prompt mode used for refinement, e.g. "default", "meeting", "journal"
---
```

| Field      | Type       | Required | Notes                                                              |
|------------|------------|----------|----------------------------------------------------------------------|
| `title`    | string     | yes      | Falls back to a truncated transcription snippet if the LLM omits it. |
| `date`     | string     | yes      | UTC ISO 8601. Recorded when capture ends, not when the file is written. |
| `duration` | number     | yes      | Integer seconds. `0` if unavailable. |
| `tags`     | string[]   | yes      | May be empty (`[]`), never omitted. |
| `mode`     | string     | yes      | Must match a known prompt mode; selects which template is rendered. |

All frontmatter values are YAML-escaped by the server before insertion; free text
from transcription/LLM output is never interpolated unescaped into the frontmatter
block.

## Body Structure

The body always contains two sections, in this order:

```markdown
## Transcription

{{transcription}}

## Refined Note

{{refined_content}}
```

- **Transcription** — the raw (or lightly cleaned) speech-to-text output, unmodified
  by the refinement LLM. Preserved so the source is always recoverable.
- **Refined Note** — the LLM-refined content produced by the `ExportNote.md` /
  `CustomPrompt.md` prompt chain for the selected `mode`.

Mode-specific templates may add further sections (e.g. `## Action Items`) after
these two, but must not remove or reorder them.

## Per-Mode Template Configuration

Templates live in `templates/` as one Markdown file per mode, using
`{{placeholder}}` tokens for substitution:

```
templates/
  default.md   # used when no mode-specific template exists
  meeting.md
  journal.md
```

Resolution order:
1. Look up `templates/<mode>.md`.
2. If not found, fall back to `templates/default.md`.

Each mode template defines its own frontmatter defaults (e.g. `meeting.md` may
pre-seed `tags: [meeting]`) and may append extra body sections, but must always
include the `title`, `date`, `duration`, `tags`, and `mode` frontmatter fields and
the `## Transcription` / `## Refined Note` sections described above.

Adding a new mode means adding a new prompt (`CustomPrompt.md` variant) and a
matching `templates/<mode>.md` file — no server code changes required.

## Example Rendered Output

```markdown
---
title: Sprint planning follow-ups
date: 2026-08-05T13:46:00Z
duration: 184
tags: [work, sprint-planning]
mode: meeting
---

## Transcription

so the main thing we need to follow up on is the api rate limiting work...

## Refined Note

### Summary
Follow-up items from sprint planning regarding API rate limiting.

### Action Items
- [ ] Define per-user rate limit defaults
- [ ] Confirm Redis caching strategy with infra
```
