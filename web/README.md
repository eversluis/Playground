# Voice Notes — Web App

A installable PWA for recording voice notes. It records audio with the
`MediaRecorder` API and streams chunks straight to a backend endpoint as they
are produced — no audio file is ever written to disk, IndexedDB, or
localStorage on the client.

Plain HTML/CSS/JS, no build step or dependencies required.

## Running locally

Serve the `web/` directory over HTTP(S) (the `MediaRecorder`/`getUserMedia`
APIs require a secure context — `https://` or `localhost`):

```sh
cd web
python3 -m http.server 8080
# or: npx serve .
```

Then open `http://localhost:8080` and grant microphone permission.

## Backend integration

Chunks are POSTed to `/api/voice/stream` by default (one request per ~1s
chunk, plus a final empty request with `X-Chunk-Final: true`). Point it at a
different backend by setting a global before `js/app.js` loads:

```html
<script>window.VOICE_NOTES_API_ENDPOINT = 'https://api.example.com/voice/stream';</script>
```

Each request includes:
- `X-Recording-Id` — a per-recording session id
- `X-Chunk-Index` — sequence number, starting at 0
- `X-Chunk-Final` — `"true"` on the trailing (empty) request that marks end of stream
- `Content-Type` — the recorder's mime type (`audio/webm;codecs=opus` on
  Chrome/Android, `audio/mp4` on iOS Safari)

No backend exists in this repository yet — this frontend is built to be
wired up to one as a follow-up.

## Known limitation: icons

`icons/icon.svg` is a placeholder vector icon referenced from the manifest
and as the `apple-touch-icon`. It's enough for Chrome/Android install
prompts, but iOS home-screen icons render best from real PNG assets (typically
180x180 for `apple-touch-icon`, plus 192x192/512x512 for the manifest).
Swap in real PNG icons before shipping.
