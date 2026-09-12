# Builds the React client and packages it alongside the boardgame.io server
# into a single image that serves both from one port.

FROM node:22-slim AS base
RUN npm install -g pnpm@10.33.0
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/game/package.json packages/game/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @catan/web run build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=8000
ENV STORAGE_DIR=/data
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages/game ./packages/game
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist

WORKDIR /app/apps/server
VOLUME ["/data"]
EXPOSE 8000
CMD ["pnpm", "start"]
