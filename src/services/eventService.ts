import { Event, EventStatus } from '../types';
import * as eventRepository from '../repositories/eventRepository';
import * as venueRepository from '../repositories/venueRepository';
import * as userRepository from '../repositories/userRepository';

export interface CreateEventInput {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  organizer_id: string;
  venue_id: string;
  status?: EventStatus;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  venue_id?: string;
  status?: EventStatus;
}

/**
 * Create a new event
 */
export async function createEvent(input: CreateEventInput): Promise<Event> {
  // Validate input
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Title is required');
  }

  if (!input.description || input.description.trim().length === 0) {
    throw new Error('Description is required');
  }

  // Validate dates
  const startDate = new Date(input.start_date);
  const endDate = new Date(input.end_date);

  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start date format');
  }

  if (isNaN(endDate.getTime())) {
    throw new Error('Invalid end date format');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  if (startDate < new Date()) {
    throw new Error('Event cannot be scheduled in the past');
  }

  // Validate organizer exists and is an organizer or admin
  const organizer = await userRepository.getUserById(input.organizer_id);
  if (!organizer) {
    throw new Error('Organizer not found');
  }

  if (organizer.role !== 'ORGANIZER' && organizer.role !== 'ADMIN') {
    throw new Error('Only organizers and admins can create events');
  }

  // Validate venue exists
  const venue = await venueRepository.getVenueById(input.venue_id);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Check venue availability
  const isAvailable = await venueRepository.isVenueAvailable(
    input.venue_id,
    input.start_date,
    input.end_date
  );

  if (!isAvailable) {
    throw new Error('Venue is not available for the selected dates');
  }

  // Set default status if not provided
  const status = input.status || 'UPCOMING';

  if (!isValidEventStatus(status)) {
    throw new Error('Invalid event status');
  }

  return eventRepository.createEvent({
    ...input,
    status,
  });
}

/**
 * Get event by ID
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  return eventRepository.getEventById(eventId);
}

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
  return eventRepository.getAllEvents();
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
  // Validate organizer exists
  const organizer = await userRepository.getUserById(organizerId);
  if (!organizer) {
    throw new Error('Organizer not found');
  }

  return eventRepository.getEventsByOrganizer(organizerId);
}

/**
 * Get events by status
 */
export async function getEventsByStatus(status: EventStatus): Promise<Event[]> {
  if (!isValidEventStatus(status)) {
    throw new Error('Invalid event status');
  }

  return eventRepository.getEventsByStatus(status);
}

/**
 * Get events by venue
 */
export async function getEventsByVenue(venueId: string): Promise<Event[]> {
  // Validate venue exists
  const venue = await venueRepository.getVenueById(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  return eventRepository.getEventsByVenue(venueId);
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  return eventRepository.getUpcomingEvents();
}

/**
 * Update event
 */
export async function updateEvent(
  eventId: string,
  input: UpdateEventInput,
  requestingUserId: string
): Promise<Event> {
  // Validate event exists
  const existingEvent = await eventRepository.getEventById(eventId);
  if (!existingEvent) {
    throw new Error('Event not found');
  }

  // Validate requesting user has permission
  const requestingUser = await userRepository.getUserById(requestingUserId);
  if (!requestingUser) {
    throw new Error('User not found');
  }

  // Only organizer of the event or admin can update
  if (
    existingEvent.organizer_id !== requestingUserId &&
    requestingUser.role !== 'ADMIN'
  ) {
    throw new Error('You do not have permission to update this event');
  }

  // Validate input
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (input.description !== undefined && input.description.trim().length === 0) {
    throw new Error('Description cannot be empty');
  }

  // Validate dates if provided
  if (input.start_date !== undefined || input.end_date !== undefined) {
    const startDate = new Date(input.start_date || existingEvent.start_date);
    const endDate = new Date(input.end_date || existingEvent.end_date);

    if (input.start_date && isNaN(startDate.getTime())) {
      throw new Error('Invalid start date format');
    }

    if (input.end_date && isNaN(endDate.getTime())) {
      throw new Error('Invalid end date format');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Don't allow changing dates if event is in progress or completed
    if (existingEvent.status === 'INPROGRESS' || existingEvent.status === 'COMPLETED') {
      throw new Error('Cannot change dates for events that are in progress or completed');
    }
  }

  // Validate venue if provided
  if (input.venue_id !== undefined) {
    const venue = await venueRepository.getVenueById(input.venue_id);
    if (!venue) {
      throw new Error('Venue not found');
    }

    // Check venue availability if venue is being changed
    if (input.venue_id !== existingEvent.venue_id) {
      const startDate = input.start_date || existingEvent.start_date;
      const endDate = input.end_date || existingEvent.end_date;

      const isAvailable = await venueRepository.isVenueAvailable(
        input.venue_id,
        startDate,
        endDate
      );

      if (!isAvailable) {
        throw new Error('Venue is not available for the selected dates');
      }
    }
  }

  // Validate status if provided
  if (input.status !== undefined && !isValidEventStatus(input.status)) {
    throw new Error('Invalid event status');
  }

  return eventRepository.updateEvent(eventId, input);
}

/**
 * Delete event
 */
export async function deleteEvent(eventId: string, requestingUserId: string): Promise<void> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Validate requesting user has permission
  const requestingUser = await userRepository.getUserById(requestingUserId);
  if (!requestingUser) {
    throw new Error('User not found');
  }

  // Only organizer of the event or admin can delete
  if (event.organizer_id !== requestingUserId && requestingUser.role !== 'ADMIN') {
    throw new Error('You do not have permission to delete this event');
  }

  // Don't allow deleting events that are in progress
  if (event.status === 'INPROGRESS') {
    throw new Error('Cannot delete events that are in progress');
  }

  await eventRepository.deleteEvent(eventId);
}

/**
 * Change event status
 */
export async function changeEventStatus(
  eventId: string,
  newStatus: EventStatus,
  requestingUserId: string
): Promise<Event> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Validate requesting user has permission
  const requestingUser = await userRepository.getUserById(requestingUserId);
  if (!requestingUser) {
    throw new Error('User not found');
  }

  // Only organizer of the event or admin can change status
  if (event.organizer_id !== requestingUserId && requestingUser.role !== 'ADMIN') {
    throw new Error('You do not have permission to change this event status');
  }

  // Validate status
  if (!isValidEventStatus(newStatus)) {
    throw new Error('Invalid event status');
  }

  // Validate status transition
  if (!isValidStatusTransition(event.status, newStatus)) {
    throw new Error(`Cannot change status from ${event.status} to ${newStatus}`);
  }

  return eventRepository.changeEventStatus(eventId, newStatus);
}

/**
 * Search events by title
 */
export async function searchEventsByTitle(searchTerm: string): Promise<Event[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('Search term is required');
  }

  return eventRepository.searchEventsByTitle(searchTerm);
}

/**
 * Cancel event (shorthand for changing status to CANCELLED)
 */
export async function cancelEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'CANCELLED', requestingUserId);
}

/**
 * Start event (shorthand for changing status to INPROGRESS)
 */
export async function startEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'INPROGRESS', requestingUserId);
}

/**
 * Complete event (shorthand for changing status to COMPLETED)
 */
export async function completeEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'COMPLETED', requestingUserId);
}

/**
 * Validate event status
 */
function isValidEventStatus(status: string): status is EventStatus {
  return ['UPCOMING', 'INPROGRESS', 'COMPLETED', 'CANCELLED'].includes(status);
}

/**
 * Validate status transition
 */
function isValidStatusTransition(from: EventStatus, to: EventStatus): boolean {
  // Allow same status (no-op)
  if (from === to) {
    return true;
  }

  const validTransitions: Record<EventStatus, EventStatus[]> = {
    UPCOMING: ['INPROGRESS', 'CANCELLED'],
    INPROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [], // Cannot change from completed
    CANCELLED: [], // Cannot change from cancelled
  };

  return validTransitions[from].includes(to);
}

/**
 * Get event statistics
 */
export async function getEventStats(): Promise<{
  total: number;
  upcoming: number;
  inProgress: number;
  completed: number;
  cancelled: number;
}> {
  const allEvents = await eventRepository.getAllEvents();

  return {
    total: allEvents.length,
    upcoming: allEvents.filter(e => e.status === 'UPCOMING').length,
    inProgress: allEvents.filter(e => e.status === 'INPROGRESS').length,
    completed: allEvents.filter(e => e.status === 'COMPLETED').length,
    cancelled: allEvents.filter(e => e.status === 'CANCELLED').length,
  };
}
