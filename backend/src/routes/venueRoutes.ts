/**
 * Venue Routes
 * 
 * Handles venue CRUD endpoints.
 */

import { Router, Request, Response } from 'express';
import * as venueService from '../services/venueService';

const router = Router();

/**
 * POST /api/venues
 * Create a new venue
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const venue = await venueService.createVenue(req.body);
    res.status(201).json(venue);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/venues
 * Get all venues
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const venues = await venueService.getAllVenues();
    res.json(venues);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/venues/available
 * Get available venues for a time range
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const { startDatetime, endDatetime } = req.query;
    if (!startDatetime || !endDatetime) {
      return res.status(400).json({ error: 'startDatetime and endDatetime are required' });
    }
    const venues = await venueService.getAvailableVenues(
      startDatetime as string,
      endDatetime as string
    );
    res.json(venues);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * GET /api/venues/:id
 * Get venue by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }
    res.json(venue);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/venues/:id
 * Update venue
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    res.json(venue);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * DELETE /api/venues/:id
 * Delete venue
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await venueService.deleteVenue(req.params.id);
    res.json({ message: 'Venue deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
