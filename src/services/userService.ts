import { User, UserRole } from '../types';
import * as userRepository from '../repositories/userRepository';
import { hashPassword } from './authService';
import { isValidEmail, isValidRole } from '../utils/validation';
import { removePasswordHash, removePasswordHashes } from '../utils/userHelpers';
import { hasRole } from '../utils/permissionHelpers';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
}

/**
 * Retrieves a user by id without returning the password hash.
 * @param userId requires existing user id.
 * @returns user without password_hash or null if missing; effects: read-only.
 */
export async function getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  return removePasswordHash(user);
}

/**
 * Retrieves a user by email without returning the password hash.
 * @param email requires valid email format.
 * @returns user without password_hash or null; effects: read-only.
 */
export async function getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    return null;
  }

  return removePasswordHash(user);
}

/**
 * Lists all users without password hashes.
 * @returns users; effects: read-only.
 */
export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
  const users = await userRepository.getAllUsers();
  return removePasswordHashes(users);
}

/**
 * Lists users filtered by role, omitting password hashes.
 * @param role requires valid role.
 * @returns users; effects: read-only.
 */
export async function getUsersByRole(role: UserRole): Promise<Omit<User, 'password_hash'>[]> {
  const users = await userRepository.getUsersByRole(role);
  return removePasswordHashes(users);
}

/**
 * Updates mutable fields of a user (excluding password here).
 * @param userId requires existing user.
 * @param input optional fields; requires non-empty name, valid email if provided, valid role if provided; new email must be unique.
 * @returns updated user without password_hash; effects: persists changes.
 * @throws Error when validation fails or user missing.
 */
export async function updateUser(
  userId: string,
  input: UpdateUserInput
): Promise<Omit<User, 'password_hash'>> {
  // Validate input
  if (input.name !== undefined && input.name.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }

  if (input.email !== undefined && !isValidEmail(input.email)) {
    throw new Error('Invalid email format');
  }

  if (input.role !== undefined && !isValidRole(input.role)) {
    throw new Error('Invalid user role');
  }

  // Check if user exists
  const existingUser = await userRepository.getUserById(userId);
  if (!existingUser) {
    throw new Error('User not found');
  }

  // If email is being changed, check if new email is already taken
  if (input.email && input.email !== existingUser.email) {
    const emailTaken = await userRepository.emailExists(input.email);
    if (emailTaken) {
      throw new Error('Email already in use');
    }
  }

  // Update user
  const updatedUser = await userRepository.updateUser(userId, input);

  return removePasswordHash(updatedUser);
}

/**
 * Deletes a user.
 * @param userId requires existing user.
 * @returns void; effects: removes user row.
 * @throws Error when user missing.
 */
export async function deleteUser(userId: string): Promise<void> {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await userRepository.deleteUser(userId);
}

/**
 * Checks whether an email is already registered.
 * @returns true if a user with the email exists; effects: read-only.
 */
export async function emailExists(email: string): Promise<boolean> {
  return userRepository.emailExists(email);
}

/**
 * Counts users by role.
 * @param role requires valid role.
 * @returns number of users with the role; effects: read-only.
 */
export async function getUserCountByRole(role: UserRole): Promise<number> {
  return userRepository.getUserCountByRole(role);
}

/**
 * Aggregates user counts by role.
 * @returns totals for students, organizers, admins; effects: read-only.
 */
export async function getUserStats(): Promise<{
  total: number;
  students: number;
  organizers: number;
  admins: number;
}> {
  const [students, organizers, admins] = await Promise.all([
    userRepository.getUserCountByRole('STUDENT'),
    userRepository.getUserCountByRole('ORGANIZER'),
    userRepository.getUserCountByRole('ADMIN'),
  ]);

  return {
    total: students + organizers + admins,
    students,
    organizers,
    admins,
  };
}

/**
 * Checks whether a user satisfies a required role (ADMIN always allowed).
 * @param user user to evaluate.
 * @param requiredRole single role or list of acceptable roles.
 * @returns true when user has permission; effects: pure.
 */
export function hasPermission(user: User, requiredRole: UserRole | UserRole[]): boolean {
  return hasRole(user, requiredRole);
}

/**
 * Retrieves all pending organizer requests.
 * @returns list of organizer users with status PENDING; effects: read-only.
 */
export async function getPendingOrganizerRequests(): Promise<Omit<User, 'password_hash'>[]> {
  const requests = await userRepository.getPendingOrganizerRequests();
  return removePasswordHashes(requests);
}

/**
 * Retrieves all organizer requests (PENDING, APPROVED, REJECTED).
 * @returns list of all organizer users; effects: read-only.
 */
export async function getAllOrganizerRequests(): Promise<Omit<User, 'password_hash'>[]> {
  const requests = await userRepository.getAllOrganizerRequests();
  return removePasswordHashes(requests);
}

/**
 * Retrieves all approved organizers (not deleted).
 * @returns list of approved organizers; effects: read-only.
 */
export async function getApprovedOrganizers(): Promise<Omit<User, 'password_hash'>[]> {
  const organizers = await userRepository.getApprovedOrganizers();
  return removePasswordHashes(organizers);
}

/**
 * Retrieves all students (not deleted).
 * @returns list of students; effects: read-only.
 */
export async function getStudents(): Promise<Omit<User, 'password_hash'>[]> {
  const students = await userRepository.getStudents();
  return removePasswordHashes(students);
}

/**
 * Approves an organizer request.
 * @param userId organizer user id to approve.
 * @param adminId requires existing ADMIN performing the approval.
 * @returns approved user without password_hash; effects: sets status to APPROVED.
 * @throws Error when user not found, not pending, or admin lacks permission.
 */
export async function approveOrganizerRequest(
  userId: string,
  adminId: string
): Promise<Omit<User, 'password_hash'>> {
  // Verify admin permissions
  const admin = await userRepository.getUserById(adminId);
  if (!admin) {
    throw new Error('Admin user not found');
  }
  
  if (admin.role !== 'ADMIN') {
    throw new Error('Only admins can approve organizer requests');
  }

  // Get the user to verify they are pending
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'ORGANIZER') {
    throw new Error('User is not an organizer');
  }

  if (user.status !== 'PENDING' && user.status !== 'REJECTED') {
    throw new Error('User request cannot be approved (already approved)');
  }

  // Approve the organizer
  const approvedUser = await userRepository.approveOrganizer(userId, adminId);
  
  return removePasswordHash(approvedUser);
}

/**
 * Rejects an organizer request.
 * @param userId organizer user id to reject.
 * @param adminId requires existing ADMIN performing the rejection.
 * @returns rejected user without password_hash; effects: sets status to REJECTED.
 * @throws Error when user not found, not pending, or admin lacks permission.
 */
export async function rejectOrganizerRequest(
  userId: string,
  adminId: string
): Promise<Omit<User, 'password_hash'>> {
  // Verify admin permissions
  const admin = await userRepository.getUserById(adminId);
  if (!admin) {
    throw new Error('Admin user not found');
  }
  
  if (admin.role !== 'ADMIN') {
    throw new Error('Only admins can reject organizer requests');
  }

  // Get the user to verify they are pending
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  if (user.role !== 'ORGANIZER') {
    throw new Error('User is not an organizer');
  }

  if (user.status !== 'PENDING') {
    throw new Error('User request is not pending');
  }

  // Reject the organizer
  const rejectedUser = await userRepository.rejectOrganizer(userId, adminId);
  
  return removePasswordHash(rejectedUser);
}

/**
 * Updates a user's role; only admins may perform this action.
 * @param userId target user id.
 * @param newRole requires valid role; prevents admin self-demotion.
 * @param adminId requires existing ADMIN performing the change.
 * @returns updated user without password_hash; effects: persists new role.
 * @throws Error when permissions or validation fail.
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  adminId: string
): Promise<Omit<User, 'password_hash'>> {
  // Verify admin permissions
  const admin = await userRepository.getUserById(adminId);
  if (!admin) {
    throw new Error('Admin user not found');
  }
  
  if (admin.role !== 'ADMIN') {
    throw new Error('Only admins can update user roles');
  }

  // Prevent self-demotion
  if (userId === adminId && newRole !== 'ADMIN') {
    throw new Error('Admins cannot demote themselves');
  }

  // Validate new role
  if (!isValidRole(newRole)) {
    throw new Error('Invalid user role');
  }

  // Check if user exists
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Update the role
  const updatedUser = await userRepository.updateUser(userId, { role: newRole });
  
  const { password_hash, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}
