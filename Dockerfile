# ---- Builder Stage ----
    FROM node:20-alpine AS builder

    # Install required dependencies (including Python)
    RUN apk add --no-cache python3 py3-pip
    
    # Set working directory
    WORKDIR /app
    
    # Copy package.json files first to leverage Docker's build cache
    COPY package*.json ./
    
    # Install all dependencies, including TypeScript for compilation
    RUN npm install
    
    # Copy the rest of the application
    COPY . .
    
    # Compile TypeScript into JavaScript
    RUN npm run build
    
    # Remove devDependencies and unnecessary files to reduce image size
    RUN npm prune --omit=dev && rm -rf src
    
    # ---- Production Image ----
    FROM node:20-alpine
    
    WORKDIR /app
    
    # Install Python in the final image (needed for youtube-dl-exec)
    RUN apk add --no-cache python3 py3-pip
    
    # Copy only necessary files from the builder stage (optimized for production)
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    
    # Expose the application port
    EXPOSE 3000
    
    # Start the application
    CMD ["node", "dist/index.js"]
    