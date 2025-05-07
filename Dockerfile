# ---- Builder Stage ----
    FROM node:20-alpine AS builder

    # Install Python and required dependencies
    RUN apk add --no-cache python3 py3-pip
    
    # Set working directory
    WORKDIR /app
    
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
    FROM node:20-alpine
    
    WORKDIR /app
    
    # Install Python and required dependencies
    RUN apk add --no-cache python3 py3-pip
    
    # Copy built files and dependencies
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    COPY --from=builder /app/src ./src
    
    # Create necessary directories
    RUN mkdir -p data/tmp
    
    # Set environment variables
    ENV NODE_ENV=production
    
    # Expose the application port
    EXPOSE 3000
    
    # Start the application
    CMD ["node", "--experimental-specifier-resolution=node", "dist/index.js"]
    