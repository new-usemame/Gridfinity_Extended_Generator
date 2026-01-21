import { Router, Request, Response } from 'express';
import { OpenSCADService } from '../services/openscad.js';
import { BoxConfig, BaseplateConfig } from '../types/config.js';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';

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

// Generate all segments and return as zip file
router.post('/segments-zip', async (req: Request, res: Response) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Missing config in request body' });
    }

    const baseplateConfig = config as BaseplateConfig;
    
    // Generate all segments
    const { splitInfo, filePaths } = await openscadService.generateAllSegments(baseplateConfig);

    // Generate README content
    const patternNames: Record<string, string> = {
      'dovetail': 'Dovetail (Trapezoidal)',
      'rectangular': 'Rectangular (Square)',
      'triangular': 'Triangular (Sawtooth)',
      'puzzle': 'Puzzle (Jigsaw Bulb)',
      'tslot': 'T-Slot (T-Hook)'
    };
    
    const readmeContent = `GRIDFINITY BASEPLATE - ASSEMBLY INSTRUCTIONS
=============================================

This contains a split baseplate with ${splitInfo.totalSegments} segments.

SEGMENT LAYOUT:
---------------
Grid: ${splitInfo.segmentsX} columns x ${splitInfo.segmentsY} rows
Each segment: up to ${splitInfo.maxSegmentUnitsX} x ${splitInfo.maxSegmentUnitsY} grid units

SEGMENTS:
---------
${splitInfo.segments.flat().map(seg => 
  `- segment_${seg.segmentX}_${seg.segmentY}.stl: ${seg.gridUnitsX}x${seg.gridUnitsY} units`
).join('\n')}

${baseplateConfig.connectorEnabled ? `INTERLOCKING EDGES:
-------------------
Edge Pattern: ${patternNames[baseplateConfig.edgePattern] || baseplateConfig.edgePattern}

Each segment has interlocking male/female edges built directly in:
- Right and Back edges have MALE teeth (protrude outward)
- Left and Front edges have FEMALE cavities (receive teeth from neighbor)
- Segments snap together - no separate connectors needed!

ASSEMBLY:
---------
1. Print all segments (print flat, socket side up, no supports needed)
2. Lay out segments according to their [X,Y] coordinates
3. Snap segments together - male teeth lock into female cavities
4. Segments align flush and lock securely

PRINTING TIPS:
--------------
- All edges print vertically (2D profile extruded in Z) - no overhangs!
- Print at 0.2mm layer height for good interlocking detail
- If fit is too tight, increase tolerance in settings
- If fit is loose, decrease tolerance
` : `ASSEMBLY:
---------
1. Print all segments
2. Lay out segments in a grid according to their coordinates
3. Segments can be placed adjacent to each other on a flat surface
`}

Generated by Gridfinity Generator (beta)
`;

    // Create zip file
    const zipFilename = `baseplate_segments_${Date.now()}.zip`;
    const zipFilePath = path.join(process.cwd(), 'generated', zipFilename);
    
    // Ensure generated directory exists
    const generatedDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(generatedDir)) {
      fs.mkdirSync(generatedDir, { recursive: true });
    }

    return new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(zipFilePath);
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      output.on('close', () => {
        // Set headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        
        // Stream the zip file
        const fileStream = fs.createReadStream(zipFilePath);
        fileStream.pipe(res);
        
        // Clean up zip file after streaming
        fileStream.on('end', () => {
          fs.unlinkSync(zipFilePath);
          // Clean up individual STL files
          filePaths.forEach(({ filePath }) => {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          });
        });
        
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Add all STL files to zip
      filePaths.forEach(({ filePath, filename }) => {
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: filename });
        }
      });

      // Add README to zip
      archive.append(readmeContent, { name: 'README.txt' });

      // Finalize the archive
      archive.finalize();
    });
  } catch (error) {
    console.error('Zip generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate zip file',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as generateRouter };
