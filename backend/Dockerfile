# ==============================================================================
# Multi-Stage Dockerfile for AETHERIA Backend Service
# ==============================================================================

FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ==============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
COPY package.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/server.js"]
