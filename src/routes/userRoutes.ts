/**
 * User Routes
 * 
 * Handles user CRUD endpoints.
 */

import { Router, Request, Response } from 'express';
import * as userService from '../services/userService';

const router = Router();

/**
 * GET /api/users
 * Get all users
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/stats
 * Get user statistics by role
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await userService.getUserStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/pending-organizers
 * Get all pending organizer requests (admin only)
 */
router.get('/pending-organizers', async (req: Request, res: Response) => {
  try {
    const requests = await userService.getPendingOrganizerRequests();
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/organizer-requests
 * Get all organizer requests (pending, approved, rejected) (admin only)
 */
router.get('/organizer-requests', async (req: Request, res: Response) => {
  try {
    const requests = await userService.getAllOrganizerRequests();
    res.json(requests);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/approved-organizers
 * Get all approved organizers (admin only)
 */
router.get('/approved-organizers', async (req: Request, res: Response) => {
  try {
    const organizers = await userService.getApprovedOrganizers();
    res.json(organizers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/students
 * Get all students (admin only)
 */
router.get('/students', async (req: Request, res: Response) => {
  try {
    const students = await userService.getStudents();
    res.json(students);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/users/:id/approve
 * Approve an organizer request (admin only)
 */
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = await import('../services/authService');
    const payload = verifyToken(token);
    const adminId = payload.userId;

    const user = await userService.approveOrganizerRequest(req.params.id, adminId);
    res.json({ message: 'Organizer request approved successfully', user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/users/:id/reject
 * Reject an organizer request (admin only)
 */
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    const { verifyToken } = await import('../services/authService');
    const payload = verifyToken(token);
    const adminId = payload.userId;

    const user = await userService.rejectOrganizerRequest(req.params.id, adminId);
    res.json({ message: 'Organizer request rejected successfully', user });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
