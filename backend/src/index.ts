import express from 'express';
import cors from 'cors';
import path from 'path';
import { generateRouter } from './routes/generate.js';
import { filesRouter } from './routes/files.js';
import { authRouter } from './routes/auth.js';
import { preferencesRouter } from './routes/preferences.js';
import { feedbackRouter } from './routes/feedback.js';
import { gameRouter } from './routes/game.js';

const app = express();
const PORT = process.env.PORT || 3001;

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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
} else {
  // Root path health check (for Railway healthcheck in non-production)
  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'gridfinity-generator', timestamp: new Date().toISOString() });
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Gridfinity Generator backend running on port ${PORT}`);
});
