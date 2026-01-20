import { Router, Response } from 'express';
import { feedbackDb } from '../services/database.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all feedback (public, no auth required)
router.get('/', async (_req, res: Response) => {
  try {
    const feedback = await feedbackDb.findAll();
    res.json({ feedback });
  } catch (error) {
    console.error('Get all feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Get current user's feedback (auth required)
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const feedback = await feedbackDb.findByUserId(req.userId!);
    res.json({ feedback: feedback || null });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

// Create feedback (auth required, one per user)
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if user already has feedback
    const existing = await feedbackDb.findByUserId(req.userId!);
    if (existing) {
      return res.status(409).json({ error: 'You have already submitted feedback. Use PUT to update it.' });
    }

    const id = await feedbackDb.create(req.userId!, title.trim(), content.trim());
    const feedback = await feedbackDb.findByUserId(req.userId!);
    res.status(201).json({ feedback });
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'You have already submitted feedback. Use PUT to update it.' });
    }
    console.error('Create feedback error:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

// Update feedback (auth required, only own feedback)
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid feedback ID' });
    }

    const { title, content } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if feedback exists and belongs to user
    const existing = await feedbackDb.findByUserId(req.userId!);
    if (!existing) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (existing.id !== id) {
      return res.status(403).json({ error: 'You can only edit your own feedback' });
    }

    await feedbackDb.update(id, req.userId!, title.trim(), content.trim());
    const feedback = await feedbackDb.findByUserId(req.userId!);
    res.json({ feedback });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ error: 'Failed to update feedback' });
  }
});

export { router as feedbackRouter };
