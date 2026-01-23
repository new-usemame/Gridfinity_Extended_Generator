// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - let the server continue
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit immediately - log and try to continue
});

console.log('Starting server initialization...');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

import express from 'express';
import cors from 'cors';
import path from 'path';

console.log('Express imported, loading routes...');

import { generateRouter } from './routes/generate.js';
import { filesRouter } from './routes/files.js';
import { authRouter } from './routes/auth.js';
import { preferencesRouter } from './routes/preferences.js';
import { feedbackRouter } from './routes/feedback.js';
import { gameRouter } from './routes/game.js';
import { isDatabaseReady, getDatabaseError } from './services/database.js';

console.log('Routes imported, creating app...');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('App created, setting up middleware...');

// Health check - register FIRST before any other routes
// This ensures Railway can check health even if other routes fail
app.get('/api/health', (_req, res) => {
  try {
    const dbReady = isDatabaseReady();
    const dbError = getDatabaseError();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: {
        ready: dbReady,
        error: dbError ? dbError.message : null
      }
    });
  } catch (err) {
    // Even if database check fails, return ok status
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: {
        ready: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    });
  }
});

// Root path health check (only in development - production serves frontend)
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'gridfinity-generator', timestamp: new Date().toISOString() });
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve generated STL files
app.use('/files', express.static(path.join(process.cwd(), 'generated')));

// API Routes
app.use('/api/generate', generateRouter);
app.use('/api/files', filesRouter);
app.use('/api/auth', authRouter);
app.use('/api/preferences', preferencesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/game', gameRouter);

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  // In Docker, frontend is copied to /app/backend/public
  const frontendPath = path.join(process.cwd(), 'public');
  console.log(`Serving frontend from: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  // Serve sitemap.xml with correct content type
  app.get('/sitemap.xml', (_req, res) => {
    const sitemapPath = path.join(frontendPath, 'sitemap.xml');
    res.type('application/xml');
    res.sendFile(sitemapPath, (err) => {
      if (err) {
        console.error('Error serving sitemap.xml:', err);
        res.status(404).send('Sitemap not found');
      }
    });
  });
  
  // Root path - serve frontend in production, but ensure it always responds for healthcheck
  // Note: This will override the root handler above, but that's ok - we want frontend in production
  app.get('/', (_req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        // Fallback to healthcheck response if frontend not available
        res.json({ status: 'ok', service: 'gridfinity-generator', timestamp: new Date().toISOString() });
      }
    });
  });
  
  // Catch-all for other routes - serve frontend
  app.get('*', (_req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Frontend not available');
      }
    });
  });
}

try {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`✓ Gridfinity Generator backend running on port ${PORT}`);
    console.log(`✓ Health check available at http://0.0.0.0:${PORT}/api/health`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Server is ready to accept connections`);
  }).on('error', (err: Error) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
