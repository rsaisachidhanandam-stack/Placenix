# ============================================================
# PLACENIX — MULTI-STAGE PRODUCTION DOCKERFILE
# Demonstrates:
# 1. Multi-stage build for minimal image attack surface & layer caching
# 2. Non-root user execution (node) for Linux container security
# 3. Production healthcheck probe & SIGTERM signal handling
# ============================================================

# ── Stage 1: Build & Dependencies ────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for maximum Docker cache reuse
COPY package*.json ./

# Install production dependencies (if package-lock present)
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --production; fi

# ── Stage 2: Minimal Production Runtime ───────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: Set NODE_ENV to production
ENV NODE_ENV=production
ENV PORT=3000

# Security: Create and switch to non-privileged user
USER node

# Copy files from builder with correct ownership
COPY --chown=node:node --from=builder /app /app
COPY --chown=node:node . /app

# Expose standard application port
EXPOSE 3000

# Health check probe for orchestration (Kubernetes / Docker Swarm / AWS ECS)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Start Placenix Enterprise Node.js Server
CMD ["node", "server.js"]
