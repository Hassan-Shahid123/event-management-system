import { Venue, VenueType } from '../types';
import * as venueRepository from '../repositories/venueRepository';
import { validateDatetimeRange, isValidVenueType } from '../utils/validation';

export interface CreateVenueInput {
  location: string;
  type: VenueType;
  capacity?: number;
}

export interface UpdateVenueInput {
  location?: string;
  type?: VenueType;
  capacity?: number;
}

/**
 * Creates a new venue record.
 * @param input requires non-empty location, valid venue type; capacity must be positive for non-OPENAIR and absent for OPENAIR.
 * @returns created venue; effects: inserts venue row.
 * @throws Error when validation fails.
 */
export async function createVenue(input: CreateVenueInput): Promise<Venue> {
  // Validate input
  if (!input.location || input.location.trim().length === 0) {
    throw new Error('Location is required');
  }

  if (!isValidVenueType(input.type)) {
    throw new Error('Invalid venue type');
  }

  // Validate capacity based on venue type
  if (input.type === 'OPENAIR') {
    // Open air venues should not have capacity limit
    if (input.capacity !== undefined) {
      throw new Error('Open air venues cannot have a capacity limit');
    }
  } else {
    // All other venue types must have a capacity
    if (input.capacity === undefined || input.capacity <= 0) {
      throw new Error('This venue type must have a positive capacity');
    }
  }

  return venueRepository.createVenue(input);
}

/**
 * Retrieves a venue by id.
 * @returns venue or null; effects: read-only.
 */
export async function getVenueById(venueId: string): Promise<Venue | null> {
  return venueRepository.getVenueById(venueId);
}

/**
 * Lists all venues.
 * @returns venues ordered by repository query; effects: read-only.
 */
export async function getAllVenues(): Promise<Venue[]> {
  return venueRepository.getAllVenues();
}

/**
 * Lists venues by type.
 * @param type requires valid venue type.
 * @returns venues of the given type; effects: read-only.
 * @throws Error when type invalid.
 */
export async function getVenuesByType(type: VenueType): Promise<Venue[]> {
  if (!isValidVenueType(type)) {
    throw new Error('Invalid venue type');
  }

  return venueRepository.getVenuesByType(type);
}

/**
 * Lists venues available within a datetime window.
 * @param startDatetime requires valid ISO datetime.
 * @param endDatetime requires valid ISO datetime after start.
 * @returns venues not booked in the interval; effects: read-only.
 * @throws Error when datetimes invalid or order incorrect.
 */
export async function getAvailableVenues(startDatetime: string, endDatetime: string): Promise<Venue[]> {
  // Validate datetimes
  validateDatetimeRange(startDatetime, endDatetime);

  return venueRepository.getAvailableVenues(startDatetime, endDatetime);
}

/**
 * Updates venue fields.
 * @param venueId requires existing venue.
 * @param input optional updates; requires non-empty location, valid type, and capacity consistent with resulting type (positive for non-OPENAIR, absent for OPENAIR).
 * @returns updated venue; effects: persists changes.
 * @throws Error when validation fails or venue missing.
 */
export async function updateVenue(venueId: string, input: UpdateVenueInput): Promise<Venue> {
  // Validate input
  if (input.location !== undefined && input.location.trim().length === 0) {
    throw new Error('Location cannot be empty');
  }

  if (input.type !== undefined && !isValidVenueType(input.type)) {
    throw new Error('Invalid venue type');
  }

  // Check if venue exists
  const existingVenue = await venueRepository.getVenueById(venueId);
  if (!existingVenue) {
    throw new Error('Venue not found');
  }

  // Determine the final type (either updated or existing)
  const finalType = input.type !== undefined ? input.type : existingVenue.type;

  // Validate capacity based on type
  if (input.capacity !== undefined || input.type !== undefined) {
    if (finalType === 'OPENAIR') {
      // If changing to or already open air, capacity must be undefined/null
      if (input.capacity !== undefined && input.capacity !== null) {
        throw new Error('Open air venues cannot have a capacity limit');
      }
    } else {
      // All other venue types must have a positive capacity
      const finalCapacity = input.capacity !== undefined ? input.capacity : existingVenue.capacity;
      if (finalCapacity === undefined || finalCapacity === null || finalCapacity <= 0) {
        throw new Error('This venue type must have a positive capacity');
      }
    }
  }

  return venueRepository.updateVenue(venueId, input);
}

/**
 * Deletes a venue if it exists.
 * @param venueId requires existing venue; may throw if repository enforces usage constraints.
 * @returns void; effects: removes venue row.
 * @throws Error when venue missing.
 */
export async function deleteVenue(venueId: string): Promise<void> {
  const venue = await venueRepository.getVenueById(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Check if venue is being used by any events
  // This check would ideally be done at the repository level with a foreign key check
  // For now, we'll just delete it
  await venueRepository.deleteVenue(venueId);
}

/**
 * Checks whether a venue is free for a datetime window.
 * @param venueId requires existing venue.
 * @param startDatetime requires valid ISO datetime.
 * @param endDatetime requires valid ISO datetime after start.
 * @returns true when no overlapping non-cancelled events; effects: read-only.
 * @throws Error when validation fails or venue missing.
 */
export async function isVenueAvailable(
  venueId: string,
  startDatetime: string,
  endDatetime: string
): Promise<boolean> {
  // Validate venue exists
  const venue = await venueRepository.getVenueById(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Validate datetimes
  validateDatetimeRange(startDatetime, endDatetime);

  return venueRepository.isVenueAvailable(venueId, startDatetime, endDatetime);
}

/**
 * Returns capacity for a venue (null when unlimited for OPENAIR).
 */
export function getVenueCapacity(venue: Venue): number | null {
  return venue.type === 'OPENAIR' ? null : venue.capacity ?? null;
}

/**
 * Indicates whether a venue enforces a capacity limit.
 */
export function hasCapacityLimit(venue: Venue): boolean {
  return venue.type !== 'OPENAIR';
}

/**
 * Aggregates venue counts by type.
 * @returns total venues and counts per type; effects: read-only.
 */
export async function getVenueStats(): Promise<{
  total: number;
  byType: Record<VenueType, number>;
}> {
  const allVenues = await venueRepository.getAllVenues();
  
  const byType: Record<VenueType, number> = {
    LAB: 0,
    EXAM_HALL: 0,
    LECTURE_HALL: 0,
    SMART_CLASSROOM: 0,
    CLASSROOM: 0,
    MEETING_HALL: 0,
    OPENAIR: 0,
    SEMINAR: 0,
    AUDITORIUM: 0,
    CAFE: 0,
  };

  for (const venue of allVenues) {
    byType[venue.type]++;
  }

  return {
    total: allVenues.length,
    byType,
  };
}
