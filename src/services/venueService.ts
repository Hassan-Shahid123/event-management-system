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
    // Indoor venues must have a capacity
    if (input.capacity === undefined || input.capacity <= 0) {
      throw new Error('Indoor venues must have a positive capacity');
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
 * Get available venues for a date range
 */
export async function getAvailableVenues(startDate: string, endDate: string): Promise<Venue[]> {
  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  return venueRepository.getAvailableVenues(startDate, endDate);
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
      // If changing to or already indoor, capacity must be positive
      const finalCapacity = input.capacity !== undefined ? input.capacity : existingVenue.capacity;
      if (finalCapacity === undefined || finalCapacity === null || finalCapacity <= 0) {
        throw new Error('Indoor venues must have a positive capacity');
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
 * Check if venue is available for a date range
 */
export async function isVenueAvailable(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<boolean> {
  // Validate venue exists
  const venue = await venueRepository.getVenueById(venueId);
  if (!venue) {
    throw new Error('Venue not found');
  }

  // Validate dates
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date format');
  }

  if (end <= start) {
    throw new Error('End date must be after start date');
  }

  return venueRepository.isVenueAvailable(venueId, startDate, endDate);
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
  return ['OPENAIR', 'INDOOR'].includes(type);
}

/**
 * Get venue statistics
 */
export async function getVenueStats(): Promise<{
  total: number;
  indoor: number;
  openair: number;
}> {
  const allVenues = await venueRepository.getAllVenues();
  
  return {
    total: allVenues.length,
    indoor: allVenues.filter(v => v.type === 'INDOOR').length,
    openair: allVenues.filter(v => v.type === 'OPENAIR').length,
  };
}
