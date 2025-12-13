import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types';
import * as userRepository from '../repositories/userRepository';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  user: Omit<User, 'password_hash'>;
  token: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

/**
 * Register a new user with password hashing
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // Validate input
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Name is required');
  }

  if (!input.email || !isValidEmail(input.email)) {
    throw new Error('Valid email is required');
  }

  if (!input.password || input.password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }

  if (!isValidRole(input.role)) {
    throw new Error('Invalid user role');
  }

  // Check if email already exists
  const existingUser = await userRepository.getUserByEmail(input.email);
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Create user
  const user = await userRepository.createUser({
    name: input.name,
    email: input.email,
    password_hash,
    role: input.role,
  });

  // Generate token
  const token = generateToken(user);

  // Return user without password hash
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * Login user with email and password
 */
export async function login(input: LoginInput): Promise<AuthResult> {
  // Validate input
  if (!input.email || !input.password) {
    throw new Error('Email and password are required');
  }

  // Get user by email
  const user = await userRepository.getUserByEmail(input.email);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Generate token
  const token = generateToken(user);

  // Return user without password hash
  const { password_hash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token,
  };
}

/**
 * Verify JWT token and return decoded payload
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate JWT token for user
 */
function generateToken(user: User): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  // Validate input
  if (!currentPassword || !newPassword) {
    throw new Error('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long');
  }

  // Get user
  const user = await userRepository.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  // Update user
  await userRepository.updateUser(userId, { password_hash });
}

/**
 * Hash a password (utility function)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
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
