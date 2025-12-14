/**
 * User Helper Utilities
 * 
 * Shared helper functions for user operations.
 */

import { User } from '../types';

/**
 * Removes password_hash from user object for safe return.
 * @param user user object with password_hash.
 * @returns user object without password_hash field.
 */
export function removePasswordHash(user: User): Omit<User, 'password_hash'> {
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Removes password_hash from array of users.
 * @param users array of users with password_hash.
 * @returns array of users without password_hash.
 */
export function removePasswordHashes(users: User[]): Omit<User, 'password_hash'>[] {
  return users.map(removePasswordHash);
}
