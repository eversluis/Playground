# Note Preview & Confirmation (prototype)

Minimal, dependency-free implementation of the note preview/confirmation UI
described in issue #13. No build step required — the backend is plain
Node.js `http`, and the frontend is vanilla JS + [marked](https://marked.js.org/)
loaded from a CDN.

## Run

```
node server.js
```

Then open http://localhost:3000. The page loads with a mock note (standing
in for the LLM refinement step's output, since that doesn't exist in this
repo yet — see `voice-note-architecture.md`). Edit the title/tags and click
**Confirm & Sync** to POST to `/api/confirm`, or **Discard** to cancel.

`POST /api/confirm` currently writes the confirmed note to `backend/notes/`
as a placeholder for the real Git sync described in the architecture doc's
"Git Integration Pattern" — swap `saveNote` in `noteService.js` for the real
Git service once that lands.

## Test

```
npm test
```
