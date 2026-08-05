# Self-Hosted OAuth Provider

Deployment config for the OAuth 2.0 / OIDC provider referenced in
[Issue #7](https://github.com/eversluis/Playground/issues/7).

## Evaluation

| Candidate | Notes |
|---|---|
| **Authentik** (chosen) | Modern UI, single Docker Compose stack, native PKCE/SPA provider type, low resource footprint (~500MB RAM). Good fit for a single-user setup that still wants a real admin UI. |
| Zitadel | Cloud-native, strong PKCE/SPA support, but expects a Postgres-heavy multi-service topology (or its own CockroachDB) and is tuned for multi-tenant/high-scale use — more operational overhead than needed here. |
| Keycloak | Battle-tested and very flexible, but JVM-based, heavier (~1GB+ RAM idle), and its admin UX/config surface is overkill for one SPA client. |

**Decision: Authentik.** It satisfies every acceptance criterion in the issue with the smallest
Docker footprint (Postgres + Redis + server + worker), and its "OAuth2/OpenID Provider" type
supports public (no client secret) PKCE clients out of the box.

## Deploying

These files are ready to copy to the VPS and run — they are not applied automatically since this
task has no SSH/VPS access.

```bash
scp -r oauth-provider/ user@vps:/opt/authentik
ssh user@vps
cd /opt/authentik
cp .env.example .env
# fill PG_PASS and AUTHENTIK_SECRET_KEY (openssl rand -base64 60 | tr -d '\n')
# edit Caddyfile: replace auth.example.com with the real subdomain
docker compose up -d
```

Point the subdomain's DNS A/AAAA record at the VPS before starting Caddy so it can obtain a
Let's Encrypt certificate.

Then open `https://auth.<your-domain>/if/flow/initial-setup/` and create the admin account.

## Configuring the SPA client (PKCE, no secret)

In the Authentik admin UI:

1. **Applications → Providers → Create** → type **OAuth2/OpenID Provider**.
   - **Client type:** `Public` (this omits the client secret and enforces PKCE).
   - **Authorization flow:** default authorization flow (or a custom one requiring MFA if desired).
   - **Redirect URIs:** the SPA's callback URL(s), e.g. `https://app.<your-domain>/callback`.
   - **Signing key:** select the default self-signed certificate (or your own).
2. Under **Advanced protocol settings**:
   - **Access token validity:** `minutes=15` — satisfies the 15-minute TTL requirement.
   - **Refresh token validity:** e.g. `days=30`.
   - **Refresh token rotation:** enabled by default — Authentik always issues a new refresh
     token (and invalidates the previous one) on each refresh grant.
3. **Applications → Applications → Create**, attach the provider created above, and give the
   SPA users access via a group/policy binding.
4. In the SPA, use the standard Authorization Code + PKCE flow against:
   - Authorize: `https://auth.<your-domain>/application/o/authorize/`
   - Token: `https://auth.<your-domain>/application/o/token/`
   - JWKS: `https://auth.<your-domain>/application/o/<app-slug>/jwks/`

## What's not done here

Actual deployment, DNS, and certificate issuance require running commands on the VPS itself,
which this task does not have access to. The Docker Compose stack, reverse proxy config, and
step-by-step setup above are ready to execute manually to satisfy the issue's acceptance
criteria.
