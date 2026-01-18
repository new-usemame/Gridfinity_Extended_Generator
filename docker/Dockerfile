# Gridfinity Generator Docker Image
# Includes OpenSCAD for STL generation and Node.js for the backend

FROM node:20-bookworm-slim

# Install OpenSCAD and dependencies
RUN apt-get update && apt-get install -y \
    openscad \
    xvfb \
    libgl1-mesa-glx \
    libgl1-mesa-dri \
    && rm -rf /var/lib/apt/lists/*

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

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV OPENSCAD_PATH=openscad

# Expose port
EXPOSE 3001

# Start the application
WORKDIR /app/backend
CMD ["node", "dist/index.js"]
