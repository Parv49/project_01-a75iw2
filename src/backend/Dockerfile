# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies including dev dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Production stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user/group if not exists
RUN addgroup -g 1001 -S node && \
    adduser -u 1001 -S node -G node

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Set secure permissions
RUN chown -R node:node /app && \
    chmod -R 550 /app && \
    chmod -R 440 /app/dist/* && \
    chmod -R 440 /app/node_modules/*

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV API_VERSION=v1

# Install curl for healthcheck
RUN apk --no-cache add curl

# Expose port
EXPOSE 3000

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/v1/health || exit 1

# Set non-root user
USER node

# Set entrypoint
ENTRYPOINT ["node"]

# Default command
CMD ["dist/server.js"]