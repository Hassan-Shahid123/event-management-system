/**
 * User Repository
 * 
 * Handles all database operations for users table.
 */

import { getDatabase, saveDatabase } from '../database';
import { User, Role, UserStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getFirstRow, getAllRows, getCountValue } from '../utils/dbHelpers';

/**
 * Inserts a new user row.
 * @param userData requires name, email, password_hash, and role.
 * @returns created user with generated id; effects: writes to users table.
 */
export async function createUser(userData: {
    name: string;
    email: string;
    password_hash: string;
    role: Role;
    status?: UserStatus;
}): Promise<User> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const status = userData.status || 'APPROVED';

    db.run(
        `INSERT INTO users (id, name, email, password_hash, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userData.name, userData.email, userData.password_hash, userData.role, status, created_at]
    );

    saveDatabase();

    return {
        id,
        name: userData.name,
        email: userData.email,
        password_hash: userData.password_hash,
        role: userData.role,
        status,
        created_at
    };
}

/**
 * Loads a user by id.
 * @returns user or null; effects: read-only.
 */
export async function getUserById(id: string): Promise<User | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE id = ?`,
        [id]
    );

    const row = getFirstRow(result);
    if (!row) return null;
    
    return {
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        status: row[5] as UserStatus,
        approved_by: row[6] as string | undefined,
        approved_at: row[7] as string | undefined,
        created_at: row[8] as string
    };
}

/**
 * Loads a user by email.
 * @returns user or null; effects: read-only.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE email = ?`,
        [email]
    );

    const row = getFirstRow(result);
    if (!row) return null;
    
    return {
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        status: row[5] as UserStatus,
        approved_by: row[6] as string | undefined,
        approved_at: row[7] as string | undefined,
        created_at: row[8] as string
    };
}

/**
 * Returns all users ordered by created_at descending.
 */
export async function getAllUsers(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(`SELECT * FROM users ORDER BY created_at DESC`);

    return getAllRows(result).map(row => ({
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        status: row[5] as UserStatus,
        approved_by: row[6] as string | undefined,
        approved_at: row[7] as string | undefined,
        created_at: row[8] as string
    }));
}

/**
 * Returns users filtered by role.
 */
export async function getUsersByRole(role: Role): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = ? ORDER BY created_at DESC`,
        [role]
    );

    return getAllRows(result).map(row => ({
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        status: row[5] as UserStatus,
        approved_by: row[6] as string | undefined,
        approved_at: row[7] as string | undefined,
        created_at: row[8] as string
    }));
}

/**
 * Updates specified fields on a user.
 * @param id user id.
 * @param updates partial user fields.
 * @returns updated user; effects: writes to users table.
 * @throws Error when user missing after update.
 */
export async function updateUser(
    id: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'password_hash' | 'role'>>
): Promise<User> {
    const db = await getDatabase();
    
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.email !== undefined) {
        fields.push('email = ?');
        values.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
        fields.push('password_hash = ?');
        values.push(updates.password_hash);
    }
    if (updates.role !== undefined) {
        fields.push('role = ?');
        values.push(updates.role);
    }

    if (fields.length === 0) {
        const user = await getUserById(id);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    values.push(id);

    db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    
    const updated = await getUserById(id);
    if (!updated) {
        throw new Error('User not found after update');
    }
    
    return updated;
}

/**
 * Deletes a user by id.
 * @returns true when deletion executed; effects: removes user row.
 */
export async function deleteUser(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    db.run(`DELETE FROM users WHERE id = ?`, [id]);
    saveDatabase();
    
    return true;
}

/**
 * Checks whether an email is already in use.
 * @returns true if found; effects: read-only.
 */
export async function emailExists(email: string): Promise<boolean> {
    const user = await getUserByEmail(email);
    return user !== null;
}

/**
 * Returns all pending organizer requests (users with role=ORGANIZER and status=PENDING).
 * @returns list of pending organizers ordered by created_at; effects: read-only.
 */
export async function getPendingOrganizerRequests(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = 'ORGANIZER' AND status = 'PENDING' ORDER BY created_at ASC`
    );

    return getAllRows(result).map(row => ({
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        status: row[5] as UserStatus,
        approved_by: row[6] as string | undefined,
        approved_at: row[7] as string | undefined,
        created_at: row[8] as string
    }));
}

/**
 * Approves an organizer request by setting status to APPROVED.
 * @param userId user id to approve.
 * @param adminId admin user id who approved.
 * @returns updated user; effects: writes to users table.
 * @throws Error when user not found or not pending.
 */
export async function approveOrganizer(userId: string, adminId: string): Promise<User> {
    const db = await getDatabase();
    const approved_at = new Date().toISOString();

    db.run(
        `UPDATE users SET status = 'APPROVED', approved_by = ?, approved_at = ? WHERE id = ? AND status = 'PENDING'`,
        [adminId, approved_at, userId]
    );

    saveDatabase();
    
    const updated = await getUserById(userId);
    if (!updated) {
        throw new Error('User not found after approval');
    }
    
    return updated;
}

/**
 * Rejects an organizer request by setting status to REJECTED.
 * @param userId user id to reject.
 * @param adminId admin user id who rejected.
 * @returns updated user; effects: writes to users table.
 * @throws Error when user not found or not pending.
 */
export async function rejectOrganizer(userId: string, adminId: string): Promise<User> {
    const db = await getDatabase();
    const approved_at = new Date().toISOString();

    db.run(
        `UPDATE users SET status = 'REJECTED', approved_by = ?, approved_at = ? WHERE id = ? AND status = 'PENDING'`,
        [adminId, approved_at, userId]
    );

    saveDatabase();
    
    const updated = await getUserById(userId);
    if (!updated) {
        throw new Error('User not found after rejection');
    }
    
    return updated;
}

/**
 * Counts users by role.
 */
export async function getUserCountByRole(role: Role): Promise<number> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) as count FROM users WHERE role = ?`,
        [role]
    );

    return getCountValue(result);
}
