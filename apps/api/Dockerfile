# syntax=docker/dockerfile:1
# Build context: monorepo root (railway.toml sets this)

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first for layer-cache efficiency
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Full install (devDeps needed for tsc; native deps compiled for this Alpine)
RUN npm install

# Copy source and compile
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/

RUN npm run build --workspace=packages/shared --if-present
RUN npm run build --workspace=apps/api

# ── Stage 2: production image ─────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S nodejs && adduser -S fastify -G nodejs

# Copy workspace manifests so npm prune knows what to keep
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# Copy node_modules from builder (native bcrypt binaries already compiled for Alpine)
COPY --from=builder /app/node_modules ./node_modules

# Strip devDependencies in-place
RUN npm prune --omit=dev

# Copy compiled output (shared is types-only, erased at compile time — no dist needed)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# schema.sql is read at runtime via __dirname (resolves to dist/db/)
COPY apps/api/src/db/schema.sql ./apps/api/dist/db/schema.sql

# Entrypoint: migrate then start (exec so node is PID 1 and receives signals)
COPY apps/api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER fastify

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

ENTRYPOINT ["docker-entrypoint.sh"]
