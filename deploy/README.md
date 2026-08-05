# VPS Base Setup and Reverse Proxy

This directory contains the base infrastructure for deploying services to the VPS:
Docker Compose runs [Caddy](https://caddyserver.com/) as a reverse proxy in front of
the app, API, and auth services, with automatic HTTPS via Let's Encrypt.

## Prerequisites

A VPS running a recent Linux distribution, with a domain's DNS `A`/`AAAA` records
pointed at the VPS's public IP (required for Let's Encrypt HTTP-01 validation).

## 1. Install Docker and Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

The convenience script installs the Docker Compose plugin (`docker compose`) along
with the Docker Engine. `systemctl enable` ensures the Docker daemon — and therefore
any container with `restart: unless-stopped` — comes back up automatically on reboot.

## 2. Configure environment

```bash
cd deploy
cp .env.example .env
```

Edit `.env` and set:
- `DOMAIN` — the domain routed to this VPS
- `EMAIL` — contact address for Let's Encrypt expiry notices

## 3. Start the stack

```bash
docker compose up -d
```

Caddy will automatically obtain and renew a Let's Encrypt certificate for `DOMAIN`
on first request, and terminate HTTPS for all routes.

## 4. Routing

`Caddyfile` routes by path prefix to the corresponding service container:

| Path      | Upstream       |
|-----------|----------------|
| `/app*`   | `app:3000`     |
| `/api*`   | `api:8000`     |
| `/auth*`  | `auth:4000`    |

The `app`, `api`, and `auth` services in `docker-compose.yml` are commented out
until the corresponding application code exists in this repo — uncomment and adjust
the `build` path/port for each service as it's added, then re-run
`docker compose up -d`.

## Verifying restart-on-reboot

```bash
sudo reboot
# after the VPS comes back:
docker compose ps
```

All services should show `Up`, since Docker's systemd unit is enabled and every
service in `docker-compose.yml` uses `restart: unless-stopped`.
