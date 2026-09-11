# Production image for a Linux VPS. Not used by the Grok live preview.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production
ENV PATH="/app/node_modules/.bin:$PATH"
# Schema is applied at container start, not at image build (no DB here).
RUN node scripts/with-app-env.mjs vite build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV STANDALONE=true
ENV NITRO_PRESET=node-server
ENV PORT=8080
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system kasb \
  && useradd --system --gid kasb --home-dir /app --shell /usr/sbin/nologin kasb
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/.output ./.output
COPY --from=build /app/.grok/app-env.json ./.grok/app-env.json
USER kasb
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
