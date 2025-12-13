import { Event, EventStatus } from '../types';
import * as eventRepository from '../repositories/eventRepository';
import * as venueRepository from '../repositories/venueRepository';
import * as userRepository from '../repositories/userRepository';
import * as notificationService from './notificationService';
import { validateDatetimeRange, isValidEventStatus } from '../utils/validation';
import { requireEventPermission } from '../utils/permissionHelpers';

export interface CreateEventInput {
  title: string;
  description: string;
  start_datetime: string;
  end_datetime: string;
  organizer_id: string;
  venue_id: string;
  status?: EventStatus;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  start_datetime?: string;
  end_datetime?: string;
  venue_id?: string;
  status?: EventStatus;
}

/**
 * Creates and persists a new event.
 * @param input requires non-empty title/description, valid ISO datetimes where end > start and start is in the future, organizer exists with role ORGANIZER or ADMIN, venue exists and is available; optional status must be a valid event status.
 * @returns created event (status defaults to UPCOMING); effects: inserts an event row.
 * @throws Error when validation fails, organizer/venue is missing, or venue is unavailable.
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
  validateDatetimeRange(input.start_datetime, input.end_datetime, true);

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
    input.start_datetime,
    input.end_datetime
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
 * Retrieves an event by id.
 * @param eventId requires non-empty id.
 * @returns event or null if not found; effects: read-only.
 */
export async function getEventById(eventId: string): Promise<Event | null> {
  return eventRepository.getEventById(eventId);
}

/**
 * Lists all events.
 * @returns events ordered by repository query; effects: read-only.
 */
export async function getAllEvents(): Promise<Event[]> {
  return eventRepository.getAllEvents();
}

/**
 * Lists events for a specific organizer.
 * @param organizerId requires existing user; caller must supply a valid organizer id.
 * @returns events for organizer; effects: read-only.
 * @throws Error when organizer is missing.
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
 * Lists events by status.
 * @param status requires valid event status.
 * @returns matching events; effects: read-only.
 * @throws Error when status is invalid.
 */
export async function getEventsByStatus(status: EventStatus): Promise<Event[]> {
  if (!isValidEventStatus(status)) {
    throw new Error('Invalid event status');
  }

  return eventRepository.getEventsByStatus(status);
}

/**
 * Lists events scheduled in a venue.
 * @param venueId requires existing venue id.
 * @returns matching events; effects: read-only.
 * @throws Error when venue is missing.
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
 * Lists upcoming (future) events.
 * @returns events whose start is after now; effects: read-only.
 */
export async function getUpcomingEvents(): Promise<Event[]> {
  return eventRepository.getUpcomingEvents();
}

/**
 * Updates mutable fields of an event.
 * @param eventId requires an existing event.
 * @param input optional fields; requires non-empty title/description when provided, valid datetimes (end > start) when provided, available venue when changed, valid status when provided.
 * @param requestingUserId requires organizer of event or ADMIN; event cannot be INPROGRESS/COMPLETED when changing dates.
 * @returns updated event; effects: persists changes.
 * @throws Error when validation fails, event not found, or caller lacks permission.
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

  requireEventPermission(requestingUser, existingEvent);

  // Validate input
  if (input.title !== undefined && input.title.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (input.description !== undefined && input.description.trim().length === 0) {
    throw new Error('Description cannot be empty');
  }

  // Validate dates if provided
  if (input.start_datetime !== undefined || input.end_datetime !== undefined) {
    const startDate = new Date(input.start_datetime || existingEvent.start_datetime);
    const endDate = new Date(input.end_datetime || existingEvent.end_datetime);

    if (input.start_datetime && isNaN(startDate.getTime())) {
      throw new Error('Invalid start datetime format');
    }

    if (input.end_datetime && isNaN(endDate.getTime())) {
      throw new Error('Invalid end datetime format');
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
      const startDatetime = input.start_datetime || existingEvent.start_datetime;
      const endDatetime = input.end_datetime || existingEvent.end_datetime;

      const isAvailable = await venueRepository.isVenueAvailable(
        input.venue_id,
        startDatetime,
        endDatetime
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
 * Deletes an event.
 * @param eventId requires existing event that is not INPROGRESS.
 * @param requestingUserId requires organizer of the event or ADMIN.
 * @returns void when deletion succeeds; effects: removes event row (registrations cascade).
 * @throws Error when event not found, caller lacks permission, or status is INPROGRESS.
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

  requireEventPermission(requestingUser, event);

  // Don't allow deleting events that are in progress
  if (event.status === 'INPROGRESS') {
    throw new Error('Cannot delete events that are in progress');
  }

  await eventRepository.deleteEvent(eventId);
}

/**
 * Changes an event's status with transition checks.
 * @param eventId requires existing event.
 * @param newStatus requires valid status and a permitted transition from current status.
 * @param requestingUserId requires organizer of event or ADMIN.
 * @returns updated event; effects: updates status and triggers cancellation notifications when moving to CANCELLED.
 * @throws Error when event missing, transition invalid, or caller unauthorized.
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

  requireEventPermission(requestingUser, event);

  // Validate status
  if (!isValidEventStatus(newStatus)) {
    throw new Error('Invalid event status');
  }

  // Validate status transition
  if (!isValidStatusTransition(event.status, newStatus)) {
    throw new Error(`Cannot change status from ${event.status} to ${newStatus}`);
  }

  const updatedEvent = await eventRepository.changeEventStatus(eventId, newStatus);

  // Send notifications for cancellation
  if (newStatus === 'CANCELLED') {
    try {
      await notificationService.notifyEventCancelled(updatedEvent);
    } catch (notifyError) {
      console.error('Failed to send cancellation notifications:', notifyError);
    }
  }

  return updatedEvent;
}

/**
 * Searches events by title substring (case-insensitive per database collation).
 * @param searchTerm requires non-empty term.
 * @returns matching events; effects: read-only.
 * @throws Error when searchTerm is empty.
 */
export async function searchEventsByTitle(searchTerm: string): Promise<Event[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('Search term is required');
  }

  return eventRepository.searchEventsByTitle(searchTerm);
}

/**
 * Convenience wrapper that cancels an event.
 * @returns updated event after status change to CANCELLED; effects: same as changeEventStatus.
 */
export async function cancelEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'CANCELLED', requestingUserId);
}

/**
 * Convenience wrapper that marks an event INPROGRESS.
 */
export async function startEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'INPROGRESS', requestingUserId);
}

/**
 * Convenience wrapper that marks an event COMPLETED.
 */
export async function completeEvent(eventId: string, requestingUserId: string): Promise<Event> {
  return changeEventStatus(eventId, 'COMPLETED', requestingUserId);
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
 * Summarizes event counts by status.
 * @returns total counts of events by lifecycle state; effects: read-only aggregation.
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
    upcoming: allEvents.filter((e: Event) => e.status === 'UPCOMING').length,
    inProgress: allEvents.filter((e: Event) => e.status === 'INPROGRESS').length,
    completed: allEvents.filter((e: Event) => e.status === 'COMPLETED').length,
    cancelled: allEvents.filter((e: Event) => e.status === 'CANCELLED').length,
  };
}
