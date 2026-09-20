# ==============================================================================
# Multi-Stage Dockerfile for AETHERIA
# Stage 1: Build & Compile TypeScript SPA
# Stage 2: Serve with High-Performance Nginx Alpine Web Server
# ==============================================================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies with frozen lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source files and configuration
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/

# Run TypeScript compilation and production Vite bundling
RUN npm run build

# ==============================================================================
# Stage 2: Production Server
FROM nginx:alpine-slim AS runner

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
