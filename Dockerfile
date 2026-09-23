# Production image for a Linux VPS. Not used by the Grok live preview.
FROM node:22-slim AS deps
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
COPY package.json package-lock.json ./
RUN sed -i "s#https://registry.npmjs.org#${NPM_REGISTRY}#g" package-lock.json && npm ci

FROM node:22-slim AS build
WORKDIR /app
ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
COPY --from=deps /app/node_modules ./node_modules
COPY deploy/BUILD_ID /tmp/BUILD_ID
COPY . .
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production
ENV STANDALONE=true
ENV PATH="/app/node_modules/.bin:$PATH"
# Schema is applied at container start, not at image build (no DB here).
RUN rm -rf node_modules/.vite node_modules/.tmp && node scripts/with-app-env.mjs vite build

FROM node:22-slim AS runner
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
ARG GIT_SHA=unknown
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
ENV GIT_SHA=$GIT_SHA
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
RUN sed -i "s#https://registry.npmjs.org#${NPM_REGISTRY}#g" package-lock.json \
  && npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/data ./data
COPY --from=build /app/.output ./.output
COPY --from=build /app/.grok/app-env.json ./.grok/app-env.json
COPY --from=build --chown=kasb:kasb /app/public/apps/rezerv-vaght-tatoo.apk /app/apps/rezerv-vaght-tatoo.apk
COPY --from=build --chown=kasb:kasb /app/public/apps/rezerv-vaght-tatoo.apk /app/.output/public/apps/rezerv-vaght-tatoo.apk
# Baked SHA is the only Production identity. Runtime env must not fake it.
RUN printf '%s\n' "$GIT_SHA" > /app/BUILD_SHA && chmod 644 /app/BUILD_SHA \
  && test -f /app/apps/rezerv-vaght-tatoo.apk \
  && test -f /app/migrations/0014_calendar.sql \
  && test -f /app/migrations/0015_finance.sql \
  && test -f /app/migrations/0016_resources.sql
USER kasb
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
