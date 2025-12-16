import { EventRegistration, RegistrationStatus } from '../types';
import * as registrationRepository from '../repositories/registrationRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as userRepository from '../repositories/userRepository';
import * as venueRepository from '../repositories/venueRepository';
import * as notificationService from './notificationService';
import { requireEventPermission } from '../utils/permissionHelpers';
import { 
  validateRegistrationEligibility, 
  executeRegistrationTransaction 
} from '../utils/registrationHelpers';

/**
 * Registers a student for an event using a database transaction.
 * @param eventId requires existing UPCOMING event whose start is in the future and whose venue exists.
 * @param userId requires existing user with role STUDENT, ORGANIZER, or ADMIN; user must not already be registered.
 * @returns registration and resulting status (CONFIRMED or WAITLISTED); effects: inserts registration row atomically and may enqueue notification.
 * @throws Error when validation fails or the transaction cannot be completed.
 */
export async function registerForEvent(
  eventId: string,
  userId: string
): Promise<{ registration: EventRegistration; status: 'CONFIRMED' | 'WAITLISTED' }> {
  // Validate eligibility
  const [user, event, venue] = await validateRegistrationEligibility(userId, eventId);

  // Execute registration within transaction
  const [registration, registrationStatus] = await executeRegistrationTransaction(
    eventId,
    userId,
    venue
  );

  // Send notification (outside transaction - non-critical)
  try {
    if (registrationStatus === 'CONFIRMED') {
      await notificationService.notifyRegistrationConfirmed(userId, event);
    } else {
      await notificationService.notifyWaitlisted(userId, event);
    }
  } catch (notifyError) {
    console.error('Failed to send registration notification:', notifyError);
    // Don't fail the registration if notification fails
  }

  return {
    registration,
    status: registrationStatus,
  };
}

/**
 * Cancels a user's registration for an event.
 * @param eventId requires existing UPCOMING event.
 * @param userId requires existing registration for the event.
 * @returns void when unregistered; effects: deletes registration, may promote next waitlisted user, and emits notifications on best-effort basis.
 * @throws Error when event or registration is missing.
 */
export async function unregisterFromEvent(eventId: string, userId: string): Promise<void> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Check if event is upcoming
  if (event.status !== 'UPCOMING') {
    throw new Error('Can only unregister from upcoming events');
  }

  // Check if user is registered
  const registration = await registrationRepository.getRegistration(eventId, userId);
  if (!registration) {
    throw new Error('You are not registered for this event');
  }

  // Get venue to check if we need to promote from waitlist
  const venue = await venueRepository.getVenueById(event.venue_id);
  if (!venue) {
    throw new Error('Venue not found');
  }

  const wasConfirmed = registration.status === 'CONFIRMED';

  // Unregister user
  await registrationRepository.unregisterUser(eventId, userId);

  // Send unregistration notification
  try {
    await notificationService.notifyUnregistered(userId, event);
  } catch (notifyError) {
    console.error('Failed to send unregistration notification:', notifyError);
  }

  // If user was confirmed and venue has capacity limit, promote next from waitlist
  if (wasConfirmed && venue.type !== 'OPENAIR') {
    const nextInWaitlist = await registrationRepository.getNextFromWaitlist(eventId);
    if (nextInWaitlist) {
      await registrationRepository.promoteFromWaitlist(eventId, nextInWaitlist.user_id);
      
      // Notify promoted user
      try {
        await notificationService.notifyPromotedFromWaitlist(nextInWaitlist.user_id, event);
      } catch (notifyError) {
        console.error('Failed to send promotion notification:', notifyError);
      }
    }
  }
}

/**
 * Lists all registrations for an event.
 * @param eventId requires existing event.
 * @returns ordered registrations; effects: read-only.
 * @throws Error when event not found.
 */
export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return registrationRepository.getEventRegistrations(eventId);
}

/**
 * Lists confirmed registrations for an event.
 * @param eventId requires existing event.
 * @returns confirmed registrations; effects: read-only.
 * @throws Error when event not found.
 */
export async function getConfirmedRegistrations(eventId: string): Promise<EventRegistration[]> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return registrationRepository.getConfirmedRegistrations(eventId);
}

/**
 * Lists waitlisted registrations for an event.
 * @param eventId requires existing event.
 * @returns waitlisted registrations; effects: read-only.
 * @throws Error when event not found.
 */
export async function getWaitlistedRegistrations(eventId: string): Promise<EventRegistration[]> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return registrationRepository.getWaitlistedRegistrations(eventId);
}

/**
 * Lists registrations belonging to a user.
 * @param userId requires existing user.
 * @returns registrations for the user; effects: read-only.
 * @throws Error when user not found.
 */
export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
  // Validate user exists
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return registrationRepository.getUserRegistrations(userId);
}

/**
 * Checks whether a user is registered for an event.
 * @returns true if registration exists; effects: read-only.
 */
export async function isUserRegistered(eventId: string, userId: string): Promise<boolean> {
  return registrationRepository.isUserRegistered(eventId, userId);
}

/**
 * Retrieves registration details for a user-event pair.
 * @returns registration or null; effects: read-only.
 */
export async function getRegistration(
  eventId: string,
  userId: string
): Promise<EventRegistration | null> {
  return registrationRepository.getRegistration(eventId, userId);
}

/**
 * Counts registrations for an event, optionally filtered by status.
 * @param eventId requires existing event.
 * @param status optional filter.
 * @returns count; effects: read-only.
 * @throws Error when event not found.
 */
export async function getRegistrationCount(
  eventId: string,
  status?: RegistrationStatus
): Promise<number> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return registrationRepository.getRegistrationCount(eventId, status);
}

/**
 * Counts waitlisted registrations for an event.
 * @param eventId requires existing event.
 * @returns number of waitlisted entries; effects: read-only.
 * @throws Error when event not found.
 */
export async function getWaitlistCount(eventId: string): Promise<number> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  return registrationRepository.getWaitlistCount(eventId);
}

/**
 * Computes remaining capacity for an event.
 * @param eventId requires existing event with venue.
 * @returns null for unlimited (OPENAIR) or non-negative available count; effects: read-only.
 * @throws Error when event or venue is missing.
 */
export async function getAvailableSpots(eventId: string): Promise<number | null> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Get venue
  const venue = await venueRepository.getVenueById(event.venue_id);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Open air venues have unlimited spots
  if (venue.type === 'OPENAIR') {
    return null; // null means unlimited
  }

  // Calculate available spots
  const venueCapacity = venue.capacity || 0;
  const confirmedCount = await registrationRepository.getRegistrationCount(eventId, 'CONFIRMED');

  return Math.max(0, venueCapacity - confirmedCount);
}

/**
 * Determines whether an event has reached capacity.
 * @param eventId requires existing event.
 * @returns true if capacity is zero, false otherwise (including unlimited venues).
 */
export async function isEventFull(eventId: string): Promise<boolean> {
  const availableSpots = await getAvailableSpots(eventId);
  
  // null means unlimited capacity (open air venue)
  if (availableSpots === null) {
    return false;
  }

  return availableSpots === 0;
}

/**
 * Promotes a waitlisted user to confirmed when capacity allows.
 * @param eventId requires existing event.
 * @param userId requires existing waitlisted registration for the event.
 * @param requestingUserId requires event organizer or ADMIN and available capacity (unless unlimited).
 * @returns updated registration; effects: updates registration status.
 * @throws Error when validation fails or capacity unavailable.
 */
export async function promoteFromWaitlist(
  eventId: string,
  userId: string,
  requestingUserId: string
): Promise<EventRegistration> {
  // Validate requesting user has permission
  const requestingUser = await userRepository.getUserById(requestingUserId);
  if (!requestingUser) {
    throw new Error('User not found');
  }

  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  requireEventPermission(requestingUser, event);

  // Check if user is on waitlist
  const registration = await registrationRepository.getRegistration(eventId, userId);
  if (!registration) {
    throw new Error('User is not registered for this event');
  }

  if (registration.status !== 'WAITLISTED') {
    throw new Error('User is not on the waitlist');
  }

  // Check if there are available spots
  const availableSpots = await getAvailableSpots(eventId);
  if (availableSpots !== null && availableSpots === 0) {
    throw new Error('No available spots to promote user');
  }

  return registrationRepository.promoteFromWaitlist(eventId, userId);
}

/**
 * Deletes all registrations for an event (e.g., on cancellation).
 * @param eventId requires existing event.
 * @param requestingUserId requires event organizer or ADMIN.
 * @returns void; effects: removes registrations for the event.
 * @throws Error when event missing or caller unauthorized.
 */
export async function cancelEventRegistrations(
  eventId: string,
  requestingUserId: string
): Promise<void> {
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

  await registrationRepository.deleteEventRegistrations(eventId);
}

/**
 * Aggregates registration statistics for an event.
 * @param eventId requires existing event with venue.
 * @returns counts of total/confirmed/waitlisted, venue capacity, available spots, and fullness flag.
 * @throws Error when event or venue missing.
 */
export async function getEventRegistrationStats(eventId: string): Promise<{
  total: number;
  confirmed: number;
  waitlisted: number;
  capacity: number | null;
  availableSpots: number | null;
  isFull: boolean;
}> {
  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Get venue
  const venue = await venueRepository.getVenueById(event.venue_id);
  if (!venue) {
    throw new Error('Venue not found');
  }

  const [confirmed, waitlisted, availableSpots, isFull] = await Promise.all([
    registrationRepository.getRegistrationCount(eventId, 'CONFIRMED'),
    registrationRepository.getWaitlistCount(eventId),
    getAvailableSpots(eventId),
    isEventFull(eventId),
  ]);

  return {
    total: confirmed + waitlisted,
    confirmed,
    waitlisted,
    capacity: venue.type === 'OPENAIR' ? null : venue.capacity || 0,
    availableSpots,
    isFull,
  };
}

/**
 * Aggregates registration totals across all events.
 * @returns totals for confirmed and waitlisted registrations; effects: reads registrations for every event.
 */
export async function getOverallRegistrationStats(): Promise<{
  totalRegistrations: number;
  confirmedRegistrations: number;
  waitlistedRegistrations: number;
}> {
  const allEvents = await eventRepository.getAllEvents();
  
  let totalConfirmed = 0;
  let totalWaitlisted = 0;

  for (const event of allEvents) {
    const confirmed = await registrationRepository.getRegistrationCount(event.id, 'CONFIRMED');
    const waitlisted = await registrationRepository.getWaitlistCount(event.id);
    totalConfirmed += confirmed;
    totalWaitlisted += waitlisted;
  }

  return {
    totalRegistrations: totalConfirmed + totalWaitlisted,
    confirmedRegistrations: totalConfirmed,
    waitlistedRegistrations: totalWaitlisted,
  };
}

/**
 * Gets all registrations for an event with user details.
 * @param eventId requires existing event.
 * @param requestingUserId requires event organizer or ADMIN.
 * @returns registrations with user details (without password); effects: read-only.
 * @throws Error when event missing or caller unauthorized.
 */
export async function getEventRegistrationsWithUsers(
  eventId: string,
  requestingUserId: string
): Promise<Array<EventRegistration & { user: { id: string; name: string; email: string } }>> {
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

  // Get registrations
  const registrations = await registrationRepository.getEventRegistrations(eventId);

  // Fetch user details for each registration
  const registrationsWithUsers = await Promise.all(
    registrations.map(async (reg) => {
      const user = await userRepository.getUserById(reg.user_id);
      return {
        ...reg,
        user: {
          id: user!.id,
          name: user!.name,
          email: user!.email,
        },
      };
    })
  );

  return registrationsWithUsers;
}
