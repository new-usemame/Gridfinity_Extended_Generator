import { Router, Response } from 'express';
import { preferencesDb } from '../services/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { BoxConfig, BaseplateConfig } from '../types/config.js';

const router = Router();

// Get all saved preferences for current user
router.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const preferences = preferencesDb.findAllByUserId(req.userId!);
    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Get a specific preference
router.get('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid preference ID' });
    }

    const preference = preferencesDb.findById(id, req.userId!);
    if (!preference) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    res.json({ preference });
  } catch (error) {
    console.error('Get preference error:', error);
    res.status(500).json({ error: 'Failed to get preference' });
  }
});

// Save a new preference
router.post('/', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const { name, boxConfig, baseplateConfig } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Preference name is required' });
    }

    // Validate configs if provided
    if (boxConfig && typeof boxConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid box config' });
    }
    if (baseplateConfig && typeof baseplateConfig !== 'object') {
      return res.status(400).json({ error: 'Invalid baseplate config' });
    }

    const id = preferencesDb.create(
      req.userId!,
      name.trim(),
      boxConfig as BoxConfig | null,
      baseplateConfig as BaseplateConfig | null
    );

    const preference = preferencesDb.findById(id, req.userId!);
    res.status(201).json({ preference });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A preference with this name already exists' });
    }
    console.error('Save preference error:', error);
    res.status(500).json({ error: 'Failed to save preference' });
  }
});

// Update an existing preference
router.put('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid preference ID' });
    }

    const { name, boxConfig, baseplateConfig } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Preference name is required' });
    }

    // Check if preference exists and belongs to user
    const existing = preferencesDb.findById(id, req.userId!);
    if (!existing) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    preferencesDb.update(
      id,
      req.userId!,
      name.trim(),
      boxConfig as BoxConfig | null,
      baseplateConfig as BaseplateConfig | null
    );

    const preference = preferencesDb.findById(id, req.userId!);
    res.json({ preference });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'A preference with this name already exists' });
    }
    console.error('Update preference error:', error);
    res.status(500).json({ error: 'Failed to update preference' });
  }
});

// Delete a preference
router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid preference ID' });
    }

    // Check if preference exists and belongs to user
    const existing = preferencesDb.findById(id, req.userId!);
    if (!existing) {
      return res.status(404).json({ error: 'Preference not found' });
    }

    preferencesDb.delete(id, req.userId!);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete preference error:', error);
    res.status(500).json({ error: 'Failed to delete preference' });
  }
});

export { router as preferencesRouter };
