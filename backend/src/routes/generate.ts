import { Router, Request, Response } from 'express';
import { OpenSCADService } from '../services/openscad.js';
import { BoxConfig, BaseplateConfig } from '../types/config.js';

const router = Router();
const openscadService = new OpenSCADService();

// Generate STL from configuration
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body;

    if (!type || !config) {
      return res.status(400).json({ error: 'Missing type or config in request body' });
    }

    let result;

    if (type === 'box') {
      result = await openscadService.generateBox(config as BoxConfig);
    } else if (type === 'baseplate') {
      result = await openscadService.generateBaseplate(config as BaseplateConfig);
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "box" or "baseplate"' });
    }

    // Handle both single baseplate and multiple segments
    if ('segments' in result) {
      res.json({ type: 'segments', ...result });
    } else {
      res.json({ type: 'single', ...result });
    }
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate STL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get SCAD code preview
router.post('/preview-scad', async (req: Request, res: Response) => {
  try {
    const { type, config } = req.body;

    if (!type || !config) {
      return res.status(400).json({ error: 'Missing type or config in request body' });
    }

    let scadCode: string;

    if (type === 'box') {
      scadCode = openscadService.generateBoxScad(config as BoxConfig);
    } else if (type === 'baseplate') {
      scadCode = openscadService.generateBaseplateScad(config as BaseplateConfig);
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "box" or "baseplate"' });
    }

    res.json({ scadCode });
  } catch (error) {
    console.error('SCAD preview error:', error);
    res.status(500).json({ 
      error: 'Failed to generate SCAD preview',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as generateRouter };
