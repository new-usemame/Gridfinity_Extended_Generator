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
      const baseplateConfig = config as BaseplateConfig;
      // Check if splitting is enabled and needed
      if (baseplateConfig.splitEnabled) {
        // Use segment generation for split baseplates
        result = await openscadService.generateBaseplateSegments(baseplateConfig);
      } else {
        result = await openscadService.generateBaseplate(baseplateConfig);
      }
    } else {
      return res.status(400).json({ error: 'Invalid type. Must be "box" or "baseplate"' });
    }

    res.json(result);
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate STL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate multi-segment baseplate with connectors
router.post('/segments', async (req: Request, res: Response) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Missing config in request body' });
    }

    const result = await openscadService.generateBaseplateSegments(config as BaseplateConfig);
    res.json(result);
  } catch (error) {
    console.error('Segment generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate segments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate a single segment for download
router.post('/segment', async (req: Request, res: Response) => {
  try {
    const { config, segmentX, segmentY } = req.body;

    if (!config || segmentX === undefined || segmentY === undefined) {
      return res.status(400).json({ error: 'Missing config, segmentX, or segmentY in request body' });
    }

    const result = await openscadService.generateSingleSegment(config as BaseplateConfig, segmentX, segmentY);
    res.json(result);
  } catch (error) {
    console.error('Single segment generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate segment',
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
