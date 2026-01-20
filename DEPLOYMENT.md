# Deployment Guide

This guide covers deploying the Gridfinity Generator to Railway and setting up the GitHub repository.

## GitHub Setup (Anonymous Account)

1. **Create a new GitHub account** (or use an existing anonymous one)
   - Do not link to any personal accounts
   - Use a neutral username like `gridfinity-generator` or similar

2. **Create a new repository**
   - Name: `gridfinity-generator`
   - Description: "Fully configurable Gridfinity generator for 3D printing"
   - Visibility: Public
   - Do NOT initialize with README (we'll push our own)

3. **Push the code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Gridfinity Generator"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gridfinity-generator.git
   git push -u origin main
   ```

## Railway Deployment

### Option 1: Deploy from GitHub

1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select the `gridfinity-generator` repository
4. Railway will automatically detect the Dockerfile and deploy

### Option 2: Deploy via Railway CLI

1. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   ```

2. Login to Railway:
   ```bash
   railway login
   ```

3. Initialize and deploy:
   ```bash
   railway init
   railway up
   ```

### Database Setup (Railway)

**IMPORTANT**: The application requires a persistent database. On Railway, you must add a PostgreSQL service:

1. In your Railway project dashboard, click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway will automatically create a PostgreSQL service and set the `DATABASE_URL` environment variable
3. The application will automatically detect `DATABASE_URL` and use PostgreSQL instead of SQLite
4. The database schema will be created automatically on first startup

**Note**: Without a PostgreSQL service, data will be lost on every server restart because the container filesystem is ephemeral.

### Environment Variables (Railway)

Set these in the Railway dashboard under Variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Node environment |
| `PORT` | `3001` | Server port (Railway sets this automatically) |
| `OPENSCAD_PATH` | `openscad` | Path to OpenSCAD (default works with Docker) |
| `DATABASE_URL` | *(auto-set)* | PostgreSQL connection string (automatically set when you add PostgreSQL service) |
| `JWT_SECRET` | *(generate)* | Secret key for JWT tokens (generate a random string) |

### Custom Domain (Optional)

1. In Railway dashboard, go to your service
2. Click "Settings" → "Domains"
3. Add a custom domain or use the provided `.railway.app` domain

## Docker Deployment (Self-Hosted)

### Build the image:
```bash
docker build -t gridfinity-generator -f docker/Dockerfile .
```

### Run the container:
```bash
docker run -d \
  --name gridfinity-generator \
  -p 3001:3001 \
  -e NODE_ENV=production \
  gridfinity-generator
```

### Docker Compose (optional):

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  app:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

## Verifying Deployment

1. Check the health endpoint:
   ```bash
   curl https://your-domain.railway.app/api/health
   ```

2. Open the web interface in your browser

3. Try generating a simple 1x1 box to verify OpenSCAD is working

## Troubleshooting

### OpenSCAD not found
- Ensure the Docker image includes OpenSCAD
- Check that `OPENSCAD_PATH` environment variable is set correctly

### STL generation timeout
- Large models may take longer to generate
- The default timeout is 2 minutes
- Consider increasing server memory if needed

### Preview not loading
- Check browser console for errors
- Ensure CORS is properly configured
- Verify the STL file URL is accessible

## Monitoring

Railway provides built-in monitoring:
- View logs in the Railway dashboard
- Monitor memory and CPU usage
- Set up alerts for errors

## Scaling

To handle more users:
1. Increase the number of replicas in `railway.json`
2. Add a Redis cache for generated STL files
3. Consider a CDN for serving static assets
