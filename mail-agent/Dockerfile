# No dependencies: Node's own http, crypto and fetch are enough.
FROM node:22-alpine
WORKDIR /app
COPY server.mjs schedule.mjs contact.mjs enquiry.mjs state.mjs net.mjs pricing.md ./
# Starts as root only to hand the state volume (STATE_DIR) to the "node" user;
# server.mjs drops to node (uid 1000) before it listens.
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
