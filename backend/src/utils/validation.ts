/**
 * Validation Utilities
 * 
 * Shared validation functions to avoid code duplication.
 */

import { UserRole, EventStatus, VenueType } from '../types';

/**
 * Minimum password length for security.
 */
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Validates email format using regex.
 * @param email email string to validate.
 * @returns true if valid email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates user role against allowed values.
 * @param role role string to check.
 * @returns true if role is valid UserRole.
 */
export function isValidRole(role: string): role is UserRole {
  return ['STUDENT', 'ORGANIZER', 'ADMIN'].includes(role);
}

/**
 * Validates event status against allowed values.
 * @param status status string to check.
 * @returns true if status is valid EventStatus.
 */
export function isValidEventStatus(status: string): status is EventStatus {
  return ['UPCOMING', 'INPROGRESS', 'COMPLETED', 'CANCELLED'].includes(status);
}

/**
 * Valid venue types.
 */
export const VALID_VENUE_TYPES: VenueType[] = [
  'LAB', 'EXAM_HALL', 'LECTURE_HALL', 'SMART_CLASSROOM', 
  'CLASSROOM', 'MEETING_HALL', 'OPENAIR', 'SEMINAR', 
  'AUDITORIUM', 'CAFE'
];

/**
 * Validates venue type against allowed values.
 * @param type type string to check.
 * @returns true if type is valid VenueType.
 */
export function isValidVenueType(type: string): type is VenueType {
  return VALID_VENUE_TYPES.includes(type as VenueType);
}

/**
 * Validates datetime ordering and format.
 * @param startDatetime start ISO datetime string.
 * @param endDatetime end ISO datetime string.
 * @param requireFuture if true, requires start to be in future.
 * @throws Error when dates are invalid or improperly ordered.
 */
export function validateDatetimeRange(
  startDatetime: string,
  endDatetime: string,
  requireFuture: boolean = false
): void {
  const startDate = new Date(startDatetime);
  const endDate = new Date(endDatetime);

  if (isNaN(startDate.getTime())) {
    throw new Error('Invalid start datetime format');
  }

  if (isNaN(endDate.getTime())) {
    throw new Error('Invalid end datetime format');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  if (requireFuture && startDate < new Date()) {
    throw new Error('Event cannot be scheduled in the past');
  }
}
