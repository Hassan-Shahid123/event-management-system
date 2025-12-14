/**
 * Event Routes
 * 
 * Handles event CRUD endpoints.
 */

import { Router, Request, Response } from 'express';
import * as eventService from '../services/eventService';

const router = Router();

/**
 * POST /api/events
 * Create a new event
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const event = await eventService.createEvent(req.body);
    res.status(201).json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/events
 * Get all events
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const events = await eventService.getAllEvents();
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/search/:term
 * Search events by title
 */
router.get('/search/:term', async (req: Request, res: Response) => {
  try {
    const events = await eventService.searchEventsByTitle(req.params.term);
    res.json(events);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/events/:id
 * Get event by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/events/:id
 * Update event
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { requestingUserId, ...updates } = req.body;
    if (!requestingUserId) {
      return res.status(400).json({ error: 'requestingUserId is required' });
    }
    const event = await eventService.updateEvent(
      req.params.id,
      updates,
      requestingUserId
    );
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/events/:id
 * Delete event
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { requestingUserId } = req.body;
    if (!requestingUserId) {
      return res.status(400).json({ error: 'requestingUserId is required' });
    }
    await eventService.deleteEvent(req.params.id, requestingUserId);
    res.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * PATCH /api/events/:id/status
 * Change event status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, requestingUserId } = req.body;
    if (!status || !requestingUserId) {
      return res.status(400).json({ error: 'status and requestingUserId are required' });
    }
    const event = await eventService.changeEventStatus(
      req.params.id,
      status,
      requestingUserId
    );
    res.json(event);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
