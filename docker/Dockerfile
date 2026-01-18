# Gridfinity Generator Docker Image
# Includes OpenSCAD for STL generation and Node.js for the backend

FROM node:20-bookworm-slim

# Install dependencies for OpenSCAD AppImage
RUN apt-get update && apt-get install -y \
    wget \
    fuse \
    libfuse2 \
    xvfb \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    libglu1-mesa \
    git \
    && rm -rf /var/lib/apt/lists/*

# Download and install OpenSCAD Development Snapshot (required for gridfinity_extended)
RUN wget -O /usr/local/bin/openscad https://files.openscad.org/snapshots/OpenSCAD-2024.12.06.ai20531-x86_64.AppImage \
    && chmod +x /usr/local/bin/openscad

# Extract AppImage for running in container (AppImage requires FUSE which doesn't work well in Docker)
RUN cd /opt && /usr/local/bin/openscad --appimage-extract \
    && ln -sf /opt/squashfs-root/AppRun /usr/local/bin/openscad

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install dependencies
RUN npm install --workspaces

# Copy application code
COPY . .

# Build frontend
RUN npm run build --workspace=frontend

# Build backend
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
