/**
 * Permission Helper Utilities
 * 
 * Shared authorization check functions.
 */

import { Event, User, UserRole } from '../types';

/**
 * Checks if user has permission to modify an event.
 * User must be either the event organizer or an ADMIN.
 * @param user requesting user.
 * @param event event to check permission for.
 * @returns true if user can modify the event.
 */
export function canModifyEvent(user: User, event: Event): boolean {
  return event.organizer_id === user.id || user.role === 'ADMIN';
}

/**
 * Checks if user has one of the required roles.
 * ADMIN always has permission.
 * @param user user to check.
 * @param requiredRoles single role or array of acceptable roles.
 * @returns true if user has permission.
 */
export function hasRole(user: User, requiredRoles: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Admin has all permissions
  if (user.role === 'ADMIN') {
    return true;
  }

  return roles.includes(user.role);
}

/**
 * Validates that user has permission to modify event, throws if not.
 * @param user requesting user.
 * @param event event to modify.
 * @throws Error if user lacks permission.
 */
export function requireEventPermission(user: User, event: Event): void {
  if (!canModifyEvent(user, event)) {
    throw new Error('You do not have permission to modify this event');
  }
}
