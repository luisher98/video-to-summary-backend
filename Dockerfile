# ---- Builder Stage ----
FROM node:20.18-alpine AS builder

# Set working directory
WORKDIR /app

# Install Python for the build stage
RUN apk add --no-cache python3 py3-pip

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --omit=dev

# ---- Production Image ----
FROM node:20.18-alpine

WORKDIR /app

# Install required system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    yt-dlp

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json

# Create necessary directories
RUN mkdir -p /app/data/tmp/uploads \
    /app/data/tmp/audios \
    /app/data/tmp/transcripts \
    /app/data/tmp/cookies \
    /app/data/tmp/sessions \
    /app/data/logs \
    /app/data/test-data

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE 5050

# Start the application
CMD ["npm", "run", "start"]
    