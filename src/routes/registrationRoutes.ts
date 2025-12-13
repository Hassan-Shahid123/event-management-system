/**
 * Registration Routes
 * 
 * Handles event registration endpoints.
 */

import { Router, Request, Response } from 'express';
import * as registrationService from '../services/registrationService';

const router = Router();

/**
 * POST /api/registrations
 * Register for an event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res.status(400).json({ error: 'eventId and userId are required' });
    }
    const result = await registrationService.registerForEvent(eventId, userId);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/registrations
 * Unregister from an event
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { eventId, userId } = req.body;
    if (!eventId || !userId) {
      return res.status(400).json({ error: 'eventId and userId are required' });
    }
    await registrationService.unregisterFromEvent(eventId, userId);
    res.json({ message: 'Unregistered successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/registrations/event/:eventId
 * Get all registrations for an event
 */
router.get('/event/:eventId', async (req: Request, res: Response) => {
  try {
    const registrations = await registrationService.getEventRegistrations(
      req.params.eventId
    );
    res.json(registrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/registrations/event/:eventId/stats
 * Get registration statistics for an event
 */
router.get('/event/:eventId/stats', async (req: Request, res: Response) => {
  try {
    const stats = await registrationService.getEventRegistrationStats(
      req.params.eventId
    );
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/registrations/user/:userId
 * Get all registrations for a user
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const registrations = await registrationService.getUserRegistrations(
      req.params.userId
    );
    res.json(registrations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
