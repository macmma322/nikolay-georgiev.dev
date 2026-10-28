# No dependencies: Node's own http, crypto and fetch are enough.
FROM node:22-alpine
WORKDIR /app
COPY server.mjs schedule.mjs pricing.md ./
USER node
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
