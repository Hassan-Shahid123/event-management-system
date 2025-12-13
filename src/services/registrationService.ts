import { EventRegistration, RegistrationStatus } from '../types';
import * as registrationRepository from '../repositories/registrationRepository';
import * as eventRepository from '../repositories/eventRepository';
import * as userRepository from '../repositories/userRepository';
import * as venueRepository from '../repositories/venueRepository';

/**
 * Register a user for an event
 */
export async function registerForEvent(
  eventId: string,
  userId: string
): Promise<{ registration: EventRegistration; status: 'CONFIRMED' | 'WAITLISTED' }> {
  // Validate user exists
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Only students can register for events
  if (user.role !== 'STUDENT') {
    throw new Error('Only students can register for events');
  }

  // Validate event exists
  const event = await eventRepository.getEventById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Check if event is upcoming
  if (event.status !== 'UPCOMING') {
    throw new Error('Can only register for upcoming events');
  }

  // Check if event is in the future
  const eventStartDate = new Date(event.start_date);
  if (eventStartDate < new Date()) {
    throw new Error('Cannot register for past events');
  }

  // Check if user is already registered
  const existingRegistration = await registrationRepository.isUserRegistered(eventId, userId);
  if (existingRegistration) {
    throw new Error('You are already registered for this event');
  }

  // Get venue to check capacity
  const venue = await venueRepository.getVenueById(event.venue_id);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Determine registration status based on capacity
  let registrationStatus: RegistrationStatus;

  if (venue.type === 'OPENAIR') {
    // Open air venues have unlimited capacity
    registrationStatus = 'CONFIRMED';
  } else {
    // Check current confirmed registrations
    const confirmedCount = await registrationRepository.getRegistrationCount(eventId, 'CONFIRMED');
    const venueCapacity = venue.capacity || 0;

    if (confirmedCount < venueCapacity) {
      registrationStatus = 'CONFIRMED';
    } else {
      registrationStatus = 'WAITLISTED';
    }
  }

  // Register user
  const registration = await registrationRepository.registerUser(eventId, userId, registrationStatus);

  return {
    registration,
    status: registrationStatus,
  };
}

/**
 * Unregister a user from an event
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

  // If user was confirmed and venue has capacity limit, promote next from waitlist
  if (wasConfirmed && venue.type !== 'OPENAIR') {
    const nextInWaitlist = await registrationRepository.getNextFromWaitlist(eventId);
    if (nextInWaitlist) {
      await registrationRepository.promoteFromWaitlist(eventId, nextInWaitlist.user_id);
    }
  }
}

/**
 * Get all registrations for an event
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
 * Get confirmed registrations for an event
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
 * Get waitlisted registrations for an event
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
 * Get all events a user is registered for
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
 * Check if a user is registered for an event
 */
export async function isUserRegistered(eventId: string, userId: string): Promise<boolean> {
  return registrationRepository.isUserRegistered(eventId, userId);
}

/**
 * Get registration details
 */
export async function getRegistration(
  eventId: string,
  userId: string
): Promise<EventRegistration | null> {
  return registrationRepository.getRegistration(eventId, userId);
}

/**
 * Get registration count by status
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
 * Get waitlist count
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
 * Get available spots for an event
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
 * Check if event is full
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
 * Manually promote a user from waitlist (admin/organizer action)
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

  // Only organizer of the event or admin can manually promote
  if (event.organizer_id !== requestingUserId && requestingUser.role !== 'ADMIN') {
    throw new Error('You do not have permission to promote users from waitlist');
  }

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
 * Cancel all registrations for an event (when event is cancelled)
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

  // Only organizer of the event or admin can cancel registrations
  if (event.organizer_id !== requestingUserId && requestingUser.role !== 'ADMIN') {
    throw new Error('You do not have permission to cancel registrations for this event');
  }

  await registrationRepository.deleteEventRegistrations(eventId);
}

/**
 * Get registration statistics for an event
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
 * Get overall registration statistics
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
