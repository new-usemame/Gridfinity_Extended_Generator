import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Download STL file
router.get('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'generated', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.download(filePath, filename, (err) => {
    if (err) {
      console.error('Download error:', err);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

// Delete generated file (cleanup)
router.delete('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;
  const filePath = path.join(process.cwd(), 'generated', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export { router as filesRouter };
