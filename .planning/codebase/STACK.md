# Stack

## Languages

| Language | Version | Where Used |
|---|---|---|
| TypeScript | ^5.5.0 | Both `apps/api` and `apps/web`, plus `packages/shared` |
| SQL | — | PostgreSQL schema and raw queries |

## Runtimes

| Runtime | Version | Role |
|---|---|---|
| Node.js | 20 (Alpine in Docker) | API server process; Next.js server |

## Frameworks & Libraries

### API (`apps/api`)

| Package | Version | Purpose |
|---|---|---|
| Fastify | ^5.8.5 | HTTP server framework |
| @fastify/jwt | ^10.0.0 | JWT sign/verify plugin |
| @fastify/cookie | ^11.0.0 | Cookie parse/set plugin |
| @fastify/cors | ^10.0.0 | CORS middleware |
| @fastify/multipart | ^10.0.0 | Multipart / file-upload handling (CSV import) |
| postgres | ^3.4.4 | PostgreSQL client (tagged-template API) |
| bcrypt | ^5.1.1 | Password hashing (bcrypt, 12 rounds) |
| zod | ^3.23.8 | Runtime request validation and schema parsing |
| uuid | ^10.0.0 | UUID v4 generation for entity IDs |
| seedrandom | ^3.0.5 | Seeded pseudo-random number generation (deterministic question selection) |
| ioredis | ^5.3.2 | Redis client (listed as dependency; **not actively imported** in source — referenced only in `.env.example`) |
| dotenv | ^16.4.5 | Loads `.env` into `process.env` at startup |

### Web (`apps/web`)

| Package | Version | Purpose |
|---|---|---|
| Next.js | ^16.2.4 | React meta-framework (App Router, standalone output) |
| React | ^18.3.0 | UI rendering |
| axios | ^1.7.2 | HTTP client for admin API calls; interceptors for auth token injection and 401 redirect |
| @tanstack/react-table | ^8.19.3 | Headless table primitives (sorting, filtering, column rendering) |
| recharts | ^2.12.7 | Charting library (imported as dependency; not actively used in current source) |
| zod | ^3.23.8 | Shared validation schemas |
| @fastify/jwt | 10.0.0 | JWT type definitions (peer dependency) |
| Tailwind CSS | ^3.4.0 | Utility-first CSS (PostCSS pipeline) |

## Build Tools & Bundlers

| Tool | Where | Role |
|---|---|---|
| tsc (TypeScript compiler) | `apps/api` | Compiles API source to `dist/` |
| Next.js build | `apps/web` | Bundles web app; produces standalone server output |
| tsx | `apps/api` devDep | Dev-mode TypeScript execution with watch (`tsx watch`) |
| concurrently | root devDep | Runs `web` and `api` dev servers in parallel |

## Package Manager

- **npm** with **workspaces** (defined in root `package.json`)
- Workspaces: `apps/*` and `packages/*`

## Testing

| Tool | Where | Role |
|---|---|---|
| Vitest | `apps/api` and `apps/web` (unused in web) | Unit tests; API has tests for `rng.ts` (seeded sampling and seed derivation) |

## Databases

| Database | Client | Usage |
|---|---|---|
| PostgreSQL | `postgres` npm package | Primary datastore — all application data; uses tagged-template SQL queries, no ORM |
| Redis | `ioredis` | Listed in package.json and `.env.example` but **not instantiated** in current source code — appears unused or reserved for future work |

## Dev Tooling

- **PostCSS** (`apps/web`) — processes Tailwind directives
- **autoprefixer** — CSS vendor-prefix postprocessing
- `tsconfig.base.json` at monorepo root — shared compiler base; extended by `apps/api/tsconfig.json`

## Infrastructure & Hosting

| Service | Config | Notes |
|---|---|---|
| Railway | `railway.toml` (root + `apps/api/`) | Cloud hosting platform; root config deploys `apps/web` via Docker; `apps/api/railway.toml` deploys API via Docker |
| Docker | Multi-stage Dockerfiles in each app | Two-stage builds: `builder` (compile) → `runner` (minimal production image); both use `node:20-alpine` |
| Docker Entrypoint | `apps/api/docker-entrypoint.sh` | Runs DB migration, seeds admin user, then starts API server as PID 1 |

### Restart policy (Railway)
Both services use `restartPolicyType = "ON_FAILURE"` with `maxRetries = 10`.

### Ports
- API: `3001` (default; overridden by `PORT` env var)
- Web: `3000`
