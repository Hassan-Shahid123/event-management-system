/**
 * Registration Helper Functions
 * 
 * Helper functions to break down complex registration logic.
 */

import { Event, Venue, User, RegistrationStatus } from '../types';
import * as eventRepository from '../repositories/eventRepository';
import * as userRepository from '../repositories/userRepository';
import * as venueRepository from '../repositories/venueRepository';
import * as registrationRepository from '../repositories/registrationRepository';
import { getDatabase, saveDatabase } from '../database';

/**
 * Validates that a user can register for an event.
 * @param userId user attempting to register.
 * @param eventId event to register for.
 * @returns tuple of [user, event, venue].
 * @throws Error when validation fails.
 */
export async function validateRegistrationEligibility(
  userId: string,
  eventId: string
): Promise<[User, Event, Venue]> {
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
  const eventStartDate = new Date(event.start_datetime);
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

  return [user, event, venue];
}

/**
 * Determines registration status based on venue capacity.
 * Uses a database transaction to prevent race conditions.
 * @param eventId event to check capacity for.
 * @param venue venue of the event.
 * @returns CONFIRMED if space available, WAITLISTED otherwise.
 */
export async function determineRegistrationStatus(
  eventId: string,
  venue: Venue
): Promise<RegistrationStatus> {
  const db = await getDatabase();

  // Open air venues have unlimited capacity
  if (venue.type === 'OPENAIR') {
    return 'CONFIRMED';
  }

  // Check current confirmed registrations (atomic read within transaction)
  const result = db.exec(
    `SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'CONFIRMED'`,
    [eventId]
  );
  const confirmedCount = result[0]?.values?.[0]?.[0] as number || 0;
  const venueCapacity = venue.capacity || 0;

  if (confirmedCount < venueCapacity) {
    return 'CONFIRMED';
  } else {
    return 'WAITLISTED';
  }
}

/**
 * Performs registration within a database transaction.
 * @param eventId event to register for.
 * @param userId user to register.
 * @param venue venue for capacity checking.
 * @returns tuple of [registration, status].
 * @throws Error if transaction fails.
 */
export async function executeRegistrationTransaction(
  eventId: string,
  userId: string,
  venue: Venue
): Promise<[any, RegistrationStatus]> {
  const db = await getDatabase();

  try {
    // Begin transaction
    db.run('BEGIN IMMEDIATE TRANSACTION');

    // Determine status within transaction
    const registrationStatus = await determineRegistrationStatus(eventId, venue);

    // Register user within transaction
    const registration = await registrationRepository.registerUser(eventId, userId, registrationStatus);

    // Commit transaction
    db.run('COMMIT');
    saveDatabase();

    return [registration, registrationStatus];
  } catch (error) {
    // Rollback on error
    try {
      db.run('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    throw error;
  }
}
