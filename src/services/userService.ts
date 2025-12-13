import { User, UserRole } from '../types';
import * as userRepository from '../repositories/userRepository';
import { hashPassword } from './authService';

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
 * Get user by ID (without password hash)
 */
export async function getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    return null;
  }

  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get user by email (without password hash)
 */
export async function getUserByEmail(email: string): Promise<Omit<User, 'password_hash'> | null> {
  const user = await userRepository.getUserByEmail(email);
  if (!user) {
    return null;
  }

  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get all users (without password hashes)
 */
export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
  const users = await userRepository.getAllUsers();
  return users.map(({ password_hash, ...user }) => user);
}

/**
 * Get users by role (without password hashes)
 */
export async function getUsersByRole(role: UserRole): Promise<Omit<User, 'password_hash'>[]> {
  const users = await userRepository.getUsersByRole(role);
  return users.map(({ password_hash, ...user }) => user);
}

/**
 * Update user profile
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

  const { password_hash, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  await userRepository.deleteUser(userId);
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  return userRepository.emailExists(email);
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(role: UserRole): Promise<number> {
  return userRepository.getUserCountByRole(role);
}

/**
 * Get user statistics
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
 * Validate user has permission for action
 */
export function hasPermission(user: User, requiredRole: UserRole | UserRole[]): boolean {
  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Admin has all permissions
  if (user.role === 'ADMIN') {
    return true;
  }

  return roles.includes(user.role);
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate user role
 */
function isValidRole(role: string): role is UserRole {
  return ['STUDENT', 'ORGANIZER', 'ADMIN'].includes(role);
}

/**
 * Update a user's role (Admin only)
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
