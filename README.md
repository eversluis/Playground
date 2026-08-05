# Playground

AI-powered project playground

## Deployment (Docker Compose)

The full stack is packaged as a multi-service Docker Compose deployment for the VPS:

| Service        | Purpose                                                        |
| -------------- | --------------------------------------------------------------- |
| `caddy`        | Reverse proxy with automatic HTTPS in front of the whole stack |
| `frontend`     | Static web app                                                 |
| `backend`      | API server                                                     |
| `oauth2-proxy` | GitHub OAuth authentication in front of `/api/*`               |

> **Note:** `frontend/` and `backend/` currently contain placeholder apps (a static
> page and a FastAPI service with a `/health` endpoint) so the stack can be built and
> run end-to-end today. Replace them with the real application code as it's built —
> the compose file, Caddy routing, and OAuth wiring won't need to change.

### Setup

1. Copy the environment template and fill in the values:

   ```bash
   cp .env.example .env
   ```

   - `DOMAIN` — the domain Caddy will request an HTTPS certificate for (use `localhost` for local testing).
   - `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — from a [GitHub OAuth App](https://github.com/settings/developers) with callback URL `https://<DOMAIN>/oauth2/callback`.
   - `OAUTH2_PROXY_COOKIE_SECRET` — generate with `openssl rand -base64 32`.
   - `DATABASE_URL` — connection string for the backend's database.

2. Start the stack:

   ```bash
   docker compose up -d
   ```

3. Check service health:

   ```bash
   docker compose ps
   ```

   All services should report `healthy` once they've finished starting.

4. Visit `https://<DOMAIN>/` for the frontend. Requests to `/api/*` are authenticated
   via GitHub OAuth (`oauth2-proxy`) before reaching the backend.

### Data persistence

The `vault` named volume is mounted into the backend at `/data/vault` for persistent
storage (e.g. an Obsidian vault). `caddy_data`/`caddy_config` persist TLS certificates
across restarts.
