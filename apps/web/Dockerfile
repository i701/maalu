# syntax=docker/dockerfile:1
# The web image: the TanStack Start server on port 3000, served by srvx.
# Build from the repository root: docker build -f apps/web/Dockerfile .
#
# The build output and the production dependencies are plain JavaScript, so they are made on the
# builder's own platform and only copied into the target one (no emulation for an arm64 image).

FROM --platform=$BUILDPLATFORM node:24-slim AS pnpm
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/

FROM pnpm AS build
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile --filter @maalu/web
COPY apps/web/ apps/web/
RUN pnpm --filter @maalu/web build

FROM pnpm AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
	pnpm install --frozen-lockfile --prod --filter @maalu/web

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/apps/web/node_modules apps/web/node_modules
COPY --from=build /app/apps/web/dist apps/web/dist
COPY apps/web/package.json apps/web/
WORKDIR /app/apps/web
USER node
EXPOSE 3000
# Needs API_URL (the API's base URL, e.g. http://api:8000) and SESSION_SECRET (32+ characters).
# srvx resolves --static from the entry's folder, so ../client is dist/client.
CMD ["node_modules/.bin/srvx", "serve", "--prod", "--entry", "dist/server/server.js", "--static", "../client"]
