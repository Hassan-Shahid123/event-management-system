import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../types';
import * as userRepository from '../repositories/userRepository';
import { isValidEmail, isValidRole, MIN_PASSWORD_LENGTH } from '../utils/validation';
import { removePasswordHash } from '../utils/userHelpers';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
/** Number of bcrypt salt rounds for password hashing (10 is recommended balance of security and performance) */
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
 * Registers a new user and returns an auth token.
 * @param input requires non-empty name, valid email format, password length >= 6, and role in {STUDENT, ORGANIZER, ADMIN}; email must be unused.
 * @returns newly created user without password_hash plus JWT; effects: inserts user with hashed password.
 * @throws Error when validation fails or email is already registered.
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  // Validate input
  if (!input.name || input.name.trim().length === 0) {
    throw new Error('Name is required');
  }

  if (!input.email || !isValidEmail(input.email)) {
    throw new Error('Valid email is required');
  }

  if (!input.password || input.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (!isValidRole(input.role)) {
    throw new Error('Invalid user role');
  }

  // Check if email already exists
  const existingUser = await userRepository.getUserByEmail(input.email);
  if (existingUser) {
    // Special message for rejected organizers trying to re-register
    if (existingUser.status === 'REJECTED' && input.role === 'ORGANIZER') {
      throw new Error('Your previous organizer request was rejected. Please visit the admin office for more information.');
    }
    throw new Error('Email already registered');
  }

  // Hash password
  const password_hash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // Determine status: PENDING for organizers, APPROVED for students and admins
  const status = input.role === 'ORGANIZER' ? 'PENDING' : 'APPROVED';

  // Create user
  const user = await userRepository.createUser({
    name: input.name,
    email: input.email,
    password_hash,
    role: input.role,
    status,
  });

  // Generate token
  const token = generateToken(user);

  return {
    user: removePasswordHash(user),
    token,
  };
}

/**
 * Authenticates a user by email and password.
 * @param input requires non-empty email and password matching a stored user.
 * @returns user without password_hash plus JWT; effects: none beyond token issuance.
 * @throws Error when credentials are invalid or user not found.
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

  // Check if account is deleted
  if (user.deleted === 1) {
    throw new Error('Your account has been deleted by the administrator. Please contact admin for more information.');
  }

  // Check user status
  if (user.status === 'PENDING') {
    throw new Error('Your account is awaiting admin approval');
  }
  
  if (user.status === 'REJECTED') {
    throw new Error('Your account request has been rejected. Please contact admin for more information');
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
 * Verifies a JWT and returns its payload.
 * @param token requires a signed token issued by this service.
 * @returns decoded payload containing user id, email, and role; effects: none.
 * @throws Error when the token is invalid or expired.
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
 * Generates a JWT for the given user.
 * @param user requires persisted user record.
 * @returns signed token embedding user id, email, and role; effects: none.
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
 * Changes a user's password after verifying the current password.
 * @param userId user to update; must exist.
 * @param currentPassword requires matching the existing password.
 * @param newPassword requires length >= 6.
 * @returns resolves when the password hash is updated; effects: persists new hash for the user.
 * @throws Error when user is missing, validation fails, or current password is incorrect.
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

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
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
 * Hashes a plaintext password.
 * @param password plaintext to hash; requires non-empty string.
 * @returns bcrypt hash string.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}
