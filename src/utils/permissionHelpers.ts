/**
 * Permission Helper Utilities
 * 
 * Shared authorization check functions.
 */

import { Request, Response, NextFunction } from 'express';
import { Event, User, UserRole } from '../types';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

/**
 * Middleware to require authentication
 * Verifies JWT token and attaches user to request
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Reconstruct user object from token payload
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      status: decoded.status,
    } as User;
    
    next();
  } catch (error) {
    console.error('[Auth] Token verification failed:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware to require specific role(s)
 * Must be used after requireAuth
 */
export function requireRole(roles: UserRole | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!hasRole(req.user, allowedRoles)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}

/**
 * Checks if user has permission to modify an event.
 * User must be either the event organizer or an ADMIN.
 * @param user requesting user.
 * @param event event to check permission for.
 * @returns true if user can modify the event.
 */
export function canModifyEvent(user: User, event: Event): boolean {
  return event.organizer_id === user.id || user.role === 'ADMIN';
}

/**
 * Checks if user has one of the required roles.
 * ADMIN always has permission.
 * @param user user to check.
 * @param requiredRoles single role or array of acceptable roles.
 * @returns true if user has permission.
 */
export function hasRole(user: User, requiredRoles: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Admin has all permissions
  if (user.role === 'ADMIN') {
    return true;
  }

  return roles.includes(user.role);
}

/**
 * Validates that user has permission to modify event, throws if not.
 * @param user requesting user.
 * @param event event to modify.
 * @throws Error if user lacks permission.
 */
export function requireEventPermission(user: User, event: Event): void {
  if (!canModifyEvent(user, event)) {
    throw new Error('You do not have permission to modify this event');
  }
}
