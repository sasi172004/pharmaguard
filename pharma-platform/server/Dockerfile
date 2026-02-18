# ============================================================
# PHARMAGUARD API — Dockerfile
# Multi-stage build for production
# ============================================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Stage 2: Production
FROM node:20-alpine AS production

# Security: non-root user
RUN addgroup -g 1001 -S pharmaguard && \
    adduser -S pharmaguard -u 1001

WORKDIR /app

# Copy from builder
COPY --from=builder --chown=pharmaguard:pharmaguard /app /app

# Create directories
RUN mkdir -p /app/uploads /app/logs && \
    chown -R pharmaguard:pharmaguard /app/uploads /app/logs

# Switch to non-root
USER pharmaguard

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 3001

CMD ["node", "src/index.js"]
