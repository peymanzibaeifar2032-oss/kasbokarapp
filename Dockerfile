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
RUN node scripts/with-app-env.mjs vite build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV STANDALONE=true
ENV NITRO_PRESET=node-server
ENV PORT=8080
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/.output ./.output
COPY --from=build /app/.grok/app-env.json ./.grok/app-env.json
EXPOSE 8080
CMD ["sh", "-c", "node scripts/migrate.mjs && node .output/server/index.mjs"]
