# syntax=docker/dockerfile:1

# ─── Base ───────────────────────────────────────────────────────────────────
FROM node:24-slim AS base
# Prisma needs OpenSSL at build and run time
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Pin pnpm to the version used locally; unpinned corepack pulls the latest major,
# which fails the install on ignored dependency build scripts.
ARG PNPM_VERSION=10.28.0
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# ─── Dependencies ───────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── Build ──────────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm exec prisma generate && pnpm run build

# ─── Runtime ────────────────────────────────────────────────────────────────
# node_modules is kept whole because `prisma migrate deploy` (a dev dependency)
# runs in the container before the server starts.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
CMD ["node", "dist/main.js"]
