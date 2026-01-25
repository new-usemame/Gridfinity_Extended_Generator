import { Router, Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { gameScoresDb } from '../services/database.js';
import { validateUsername } from '../utils/profanity.js';

const router = Router();

// Submit score
router.post('/scores', async (req: Request, res: Response) => {
  try {
    const { score, elapsedTime } = req.body;
    const userId = (req as AuthRequest).userId || null;
    const { username, makePublic } = req.body;

    if (!score || typeof score !== 'number') {
      return res.status(400).json({ error: 'Score is required and must be a number' });
    }

    let publicUsername: string | null = null;
    let isPublic = false;

    // If user is authenticated and provided username
    if (userId && username) {
      const validation = await validateUsername(username);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // Check if username is already taken
      const { userDb } = await import('../services/database.js');
      const existingUser = await userDb.findByPublicUsername(username, userId);
      
      if (existingUser) {
        return res.status(409).json({ error: 'Username is already taken' });
      }

      publicUsername = username;
      isPublic = makePublic === true;

      // Update user's username settings
      await gameScoresDb.updateUserUsername(userId, publicUsername, isPublic);
    }

    // Save score
    const scoreId = await gameScoresDb.create(
      score,
      elapsedTime || null,
      userId,
      isPublic ? publicUsername : null
    );

    // Get user's rank
    let rank: number | null = null;
    if (userId) {
      rank = await gameScoresDb.getUserRank(userId);
    }

    res.json({
      success: true,
      scoreId,
      rank,
      message: rank ? `You are ranked #${rank}` : 'Score saved successfully'
    });
  } catch (error) {
    console.error('Score submission error:', error);
    res.status(500).json({ 
      error: 'Failed to submit score',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get leaderboard (public, optional auth for user rank)
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Try to get userId from auth header if present (optional)
    let requestingUserId: number | null = null;
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const { authService } = await import('../services/auth.js');
          const payload = authService.verifyToken(token);
          if (payload) {
            requestingUserId = payload.userId;
          }
        } catch (e) {
          // Ignore auth errors, just proceed without user context
        }
      }
    }

    const leaderboard = await gameScoresDb.getLeaderboard(limit, requestingUserId || undefined);

    // Format response
    const formatted = leaderboard.map(entry => ({
      rank: entry.rank,
      username: entry.public_username || 'Anonymous',
      score: entry.score,
      elapsedTime: entry.elapsed_time_ms,
      isCurrentUser: requestingUserId ? entry.user_id === requestingUserId : false
    }));

    // Get user's rank if authenticated
    let userRank: number | null = null;
    if (requestingUserId) {
      userRank = await gameScoresDb.getUserRank(requestingUserId);
    }

    res.json({
      leaderboard: formatted,
      userRank
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user stats
router.get('/user-stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const highScore = await gameScoresDb.getUserHighScore(userId);
    const rank = await gameScoresDb.getUserRank(userId);
    
    // Check if user has a public username set
    const { userDb } = await import('../services/database.js');
    const user = await userDb.findById(userId);
    // Handle both SQLite (0/1) and PostgreSQL (true/false) boolean values
    const usernamePublic = (user as any)?.username_public;
    const hasPublicUsername = user && 
      (user as any).public_username && 
      (usernamePublic === true || usernamePublic === 1 || usernamePublic === '1');

    res.json({
      highScore: highScore?.score || 0,
      rank,
      hasPublicUsername: !!hasPublicUsername
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as gameRouter };
