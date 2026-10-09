FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
COPY . .
RUN npm run build

FROM dependencies AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data
WORKDIR /app

COPY --from=production-dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY server ./server
COPY shared ./shared
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health', { signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "--import", "tsx", "server/index.ts", "--production"]
