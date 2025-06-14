# Use Node.js 20 Alpine as base image
FROM --platform=linux/amd64  node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache libc6-compat curl

# Build stage - install dependencies and build
FROM base AS builder
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the Mastra application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DOCKER_ENV=true

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 mastra

# Install only production dependencies in the final stage
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the built application
COPY --from=builder --chown=mastra:nodejs /app/.mastra ./.mastra

# Copy source code (needed for webhook server that imports from src)
COPY --from=builder --chown=mastra:nodejs /app/src ./src

# Copy scripts directory directly from source (needed for webhook server)
COPY --chown=mastra:nodejs scripts ./scripts

# Create directory for database files and logs with proper permissions
RUN mkdir -p /data/mastra-ai && chown -R mastra:nodejs /data/mastra-ai

# Make entrypoint script executable (before switching to non-root user)
RUN chmod +x ./scripts/docker-entrypoint.sh

USER mastra

# Expose the port that Mastra runs on (default 4111)
EXPOSE 4111

# Expose the webhook port (default 3001)
EXPOSE 3001

# Set environment variables
ENV PORT=4111
ENV NODE_ENV=production

# Health check - check both services
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4111/health && curl -f http://localhost:3001/health || exit 1

# Ensure we're in the correct working directory and use absolute path
WORKDIR /app
CMD ["/app/scripts/docker-entrypoint.sh"] 