/**
 * Event Routes
 * 
 * Handles event CRUD endpoints including query language support.
 */

import { Router, Request, Response } from 'express';
import * as eventService from '../services/eventService';
import { executeQuery, ParseError } from '../query';

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
 * POST /api/events/query
 * Query events using the Event Query Language
 * 
 * This endpoint demonstrates the "little languages" concept from software construction.
 * It accepts a domain-specific query language and returns matching events.
 * 
 * Body: { query: string }
 * 
 * Examples:
 * - { "query": "status = UPCOMING" }
 * - { "query": "status = UPCOMING AND capacity > 50" }
 * - { "query": "title CONTAINS workshop OR title CONTAINS seminar" }
 * - { "query": "(status = UPCOMING OR status = INPROGRESS) AND venue = auditorium" }
 * 
 * Returns:
 * {
 *   events: Event[],
 *   matched: number,
 *   total: number,
 *   executionTimeMs: number,
 *   query: string
 * }
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query string required',
        example: { query: 'status = UPCOMING' }
      });
    }

    // Get all events
    const allEvents = await eventService.getAllEvents();

    // Execute query using our little language
    const result = executeQuery(query, allEvents);

    res.json({
      ...result,
      query
    });

  } catch (error: any) {
    // Handle parse errors specially to provide better feedback
    if (error instanceof ParseError) {
      return res.status(400).json({ 
        error: 'Query syntax error',
        message: error.message,
        position: error.position,
        query: req.body.query,
        hint: 'Check grammar at /api/events/query/help'
      });
    }
    
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/events/query/help
 * Get query language documentation
 */
router.get('/query/help', (req: Request, res: Response) => {
  res.json({
    language: 'Event Query Language',
    version: '1.0.0',
    description: 'Domain-specific language for querying events',
    
    grammar: {
      Query: 'Expression EOF',
      Expression: 'AndExpr ( OR AndExpr )*',
      AndExpr: 'Condition ( AND Condition )*',
      Condition: 'Comparison | ( Expression )',
      Comparison: 'Field Operator Value'
    },
    
    fields: [
      'title - Event title',
      'status - Event status (UPCOMING, INPROGRESS, COMPLETED, CANCELLED)',
      'organizer - Organizer user ID',
      'venue - Venue ID',
      'date - Event date (YYYY-MM-DD)',
      'capacity - Event capacity (number)'
    ],
    
    operators: [
      '= - Equality',
      '!= - Inequality',
      'CONTAINS - Substring match (case-insensitive)',
      '> - Greater than',
      '< - Less than',
      '>= - Greater than or equal',
      '<= - Less than or equal'
    ],
    
    logicalOperators: [
      'AND - Both conditions must be true (higher precedence)',
      'OR - At least one condition must be true',
      '() - Grouping to override precedence'
    ],
    
    examples: [
      {
        description: 'Find upcoming events',
        query: 'status = UPCOMING'
      },
      {
        description: 'Find upcoming events with capacity > 50',
        query: 'status = UPCOMING AND capacity > 50'
      },
      {
        description: 'Find workshops or seminars',
        query: 'title CONTAINS workshop OR title CONTAINS seminar'
      },
      {
        description: 'Complex query with grouping',
        query: '(status = UPCOMING OR status = INPROGRESS) AND capacity > 100'
      },
      {
        description: 'Date range query',
        query: 'date > 2025-12-14 AND date < 2025-12-31'
      }
    ],
    
    conceptsDemonstrated: [
      'Grammar - Formal EBNF grammar definition',
      'Parsing - Recursive descent parser',
      'Little Languages - Domain-specific language for queries',
      'Recursive Data Types - AST with nested expressions',
      'Abstract Data Types - Token, Expression types',
      'Regular Expressions - Pattern matching in lexer',
      'Specifications - Pre/postconditions documented',
      'Immutability - AST nodes are readonly',
      'Type Safety - TypeScript static checking'
    ]
  });
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
