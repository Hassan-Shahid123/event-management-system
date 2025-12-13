import { Venue, VenueType } from '../types';
import * as venueRepository from '../repositories/venueRepository';

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
 * Create a new venue
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
 * Get venue by ID
 */
export async function getVenueById(venueId: string): Promise<Venue | null> {
  return venueRepository.getVenueById(venueId);
}

/**
 * Get all venues
 */
export async function getAllVenues(): Promise<Venue[]> {
  return venueRepository.getAllVenues();
}

/**
 * Get venues by type
 */
export async function getVenuesByType(type: VenueType): Promise<Venue[]> {
  if (!isValidVenueType(type)) {
    throw new Error('Invalid venue type');
  }

  return venueRepository.getVenuesByType(type);
}

/**
 * Get available venues for a datetime range
 */
export async function getAvailableVenues(startDatetime: string, endDatetime: string): Promise<Venue[]> {
  // Validate datetimes
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid datetime format');
  }

  if (end <= start) {
    throw new Error('End datetime must be after start datetime');
  }

  return venueRepository.getAvailableVenues(startDatetime, endDatetime);
}

/**
 * Update venue
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
 * Delete venue
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
 * Check if venue is available for a datetime range
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
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid datetime format');
  }

  if (end <= start) {
    throw new Error('End datetime must be after start datetime');
  }

  return venueRepository.isVenueAvailable(venueId, startDatetime, endDatetime);
}

/**
 * Get venue capacity (returns null for open air venues)
 */
export function getVenueCapacity(venue: Venue): number | null {
  return venue.type === 'OPENAIR' ? null : venue.capacity ?? null;
}

/**
 * Check if venue has capacity limit
 */
export function hasCapacityLimit(venue: Venue): boolean {
  return venue.type !== 'OPENAIR';
}

/**
 * Validate venue type
 */
function isValidVenueType(type: string): type is VenueType {
  return ['LAB', 'EXAM_HALL', 'LECTURE_HALL', 'SMART_CLASSROOM', 'CLASSROOM', 'MEETING_HALL', 'OPENAIR', 'SEMINAR', 'AUDITORIUM', 'CAFE'].includes(type);
}

/**
 * Get venue statistics
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
