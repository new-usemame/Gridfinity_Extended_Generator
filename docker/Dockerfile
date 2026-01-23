# Gridfinity Generator Docker Image
# Includes OpenSCAD for STL generation and Node.js for the backend

FROM node:20-bookworm-slim

# Install OpenSCAD from Debian repos and required dependencies
# Note: Using the packaged version - may need to simplify SCAD code if compatibility issues arise
# This layer is cached unless dependencies change
RUN apt-get update && apt-get install -y \
    openscad \
    xvfb \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files first (better Docker layer caching)
# This layer only rebuilds when dependencies change
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies (cached unless package files change)
RUN npm ci --workspaces --include-workspace-root

# Copy source code (rebuilds when code changes)
# Copy backend files
COPY backend/src ./backend/src
COPY backend/tsconfig.json ./backend/
# Copy frontend files
COPY frontend/src ./frontend/src
COPY frontend/public ./frontend/public
COPY frontend/index.html ./frontend/
COPY frontend/vite.config.ts ./frontend/
COPY frontend/tsconfig.json ./frontend/
COPY frontend/tsconfig.node.json ./frontend/
COPY frontend/tailwind.config.js ./frontend/
COPY frontend/postcss.config.js ./frontend/
# Copy SCAD reference files (if needed, though generated dynamically)
COPY scad ./scad

# Build frontend (cached unless frontend code changes)
RUN npm run build --workspace=frontend

# Build backend (cached unless backend code changes)
RUN npm run build --workspace=backend

# Create generated files directory
RUN mkdir -p /app/backend/generated

# Copy frontend dist to backend for serving
RUN cp -r /app/frontend/dist /app/backend/public

# Set working directory to backend
WORKDIR /app/backend

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV OPENSCAD_PATH=openscad

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]
