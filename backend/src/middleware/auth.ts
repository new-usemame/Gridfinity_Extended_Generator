import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.js';

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const payload = authService.verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.userId = payload.userId;
  req.userEmail = payload.email;
  next();
}
