# Fathom — Docker deploy (Alibaba Cloud ECS).
#   docker build -t fathom .
#   docker run -d -p 3012:3012 -e PORT=3012 -e DASHSCOPE_API_KEY=sk-... fathom
# Health: GET /api/health  (reports provider + engine capabilities)
#
# Note: deliberately NOT output:standalone — Fathom writes voyage media to
# public/voyages/ at runtime; the /voyages/[id]/[file] route serves those from
# disk (`next start` only serves public files that existed at boot).

# ── build ────────────────────────────────────────────────────────────────────
FROM node:20-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ── run ──────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3012
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.mjs ./next.config.mjs
# runtime state: the Logbook store + rendered voyage media
RUN mkdir -p .fathom-store public/voyages

EXPOSE 3012
CMD ["sh", "-c", "exec node_modules/.bin/next start -p ${PORT:-3012} -H 0.0.0.0"]
