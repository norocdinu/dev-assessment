# Integrations

## External Services

### Railway (Hosting / PaaS)
- Both applications are deployed to Railway via Docker builds.
- The root `railway.toml` configures the web app; `apps/api/railway.toml` configures the API.
- A hard-coded production URL (`https://dev-assessmentweb-production.up.railway.app`) appears in `apps/api/src/index.ts` as an allowed CORS origin, indicating this is the live web domain on Railway.

### PostgreSQL
- **Connection**: via `DATABASE_URL` environment variable (connection string format: `postgresql://user:pass@host:port/db`).
- **Client**: `postgres` npm package — direct tagged-template queries; no ORM.
- **Provisioned by**: Railway (managed Postgres plugin implied by environment variable pattern) or any external Postgres instance.

### Redis
- **Client**: `ioredis` is listed in `apps/api/package.json` dependencies.
- **Connection string**: `REDIS_URL` is documented in `.env.example`.
- **Current status**: Redis is **not instantiated or imported anywhere in current source code**. The dependency and env var are present but unused — likely reserved for a future feature (e.g. session caching, rate limiting, or job queue).

## Authentication / Auth Provider

Authentication is **self-hosted** — there is no third-party auth provider (no Auth0, Clerk, Supabase Auth, etc.).

| Mechanism | Details |
|---|---|
| JWT | Signed with `JWT_SECRET` env var; expiry controlled by `JWT_EXPIRES_IN` (default `8h`) |
| Password hashing | bcrypt with 12 salt rounds |
| Token storage | Admin: JWT returned in login response body and stored in `localStorage` as `auth_token`; sent as `Authorization: Bearer <token>` header on every request |
| Cookie plugin | `@fastify/cookie` is registered on the API and the JWT plugin is configured with `cookie.cookieName = 'token'`, but the web client uses `localStorage` + Bearer header — the cookie mechanism exists on the server side but is not the active transport |

## Third-Party SDKs

No third-party SaaS SDKs are used (no Stripe, Twilio, SendGrid, AWS SDK, etc.).

## Environment Variables

All environment variables used by the system, sourced from `.env.example` and the codebase:

| Variable | App | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | API | Yes | PostgreSQL connection string |
| `REDIS_URL` | API | No (unused) | Redis connection string — declared but not consumed |
| `JWT_SECRET` | API | Yes | HMAC secret for signing JWTs; must be ≥32 chars in production |
| `JWT_EXPIRES_IN` | API | No | JWT lifetime (default: `8h`) |
| `PORT` | API | No | HTTP listen port (default: `3001`) |
| `WEB_URL` | API | No | Origin of the web frontend; added to CORS allowlist and used to construct candidate test URLs (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | Web (build-time) | No | Base URL for API calls from the browser (default: `http://localhost:3001`); inlined at Next.js build time via Docker build arg |

### Build-Time vs. Runtime Variables

`NEXT_PUBLIC_API_URL` is consumed at build time by Next.js (it becomes a compile-time constant). In the Dockerfile it is passed as `ARG NEXT_PUBLIC_API_URL` and set as `ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL` before `npm run build`, so Railway must provide it as a build argument, not just a runtime env var.

All API variables (`DATABASE_URL`, `JWT_SECRET`, etc.) are runtime variables read via `dotenv` at process startup.

## CORS Configuration

The API allows cross-origin requests from:
1. `http://localhost:3000` (local dev)
2. `https://dev-assessmentweb-production.up.railway.app` (production Railway domain — hard-coded)
3. The value of `WEB_URL` env var (dynamic additional origin)

The candidate routes (`/candidate/*`) apply CORS headers manually via `onRequest` hooks in addition to the global `@fastify/cors` plugin.
