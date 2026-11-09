# TypeScript runs directly on Node 24's type stripping: no build step.
FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY src ./src
COPY migrations ./migrations
COPY templates ./templates
COPY assets ./assets
# Starts as root only to claim the /data volume; server.ts drops to uid 1000.
ENV PORT=8080 DOCUMENT_DIR=/data/documents
EXPOSE 8080
CMD ["node", "src/server.ts"]
