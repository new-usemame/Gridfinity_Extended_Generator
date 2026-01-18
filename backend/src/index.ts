import express from 'express';
import cors from 'cors';
import path from 'path';
import { generateRouter } from './routes/generate.js';
import { filesRouter } from './routes/files.js';

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(process.cwd(), '..', 'frontend', 'dist');
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Gridfinity Generator backend running on port ${PORT}`);
});
