# ---- Builder Stage ----
FROM node:20-alpine AS builder

# Install system dependencies for FFmpeg and yt-dlp
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    wget

# Install yt-dlp using pip with --break-system-packages flag
RUN pip3 install --break-system-packages yt-dlp

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# ---- Production Image ----
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    curl \
    wget

# Install yt-dlp using pip with --break-system-packages flag
RUN pip3 install --break-system-packages yt-dlp

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create necessary directories with proper permissions
RUN mkdir -p data/tmp data/uploads data/cookies && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5050

# Expose the application port
EXPOSE 5050

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5050/api/health || exit 1

# Start the application
CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"]
