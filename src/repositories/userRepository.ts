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
        approved_by: undefined,
        approved_at: undefined,
        deleted: 0,
        deleted_at: undefined,
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
    };
}

/**
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
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
 * Soft deletes a user by marking them as deleted.
 * @returns true when deletion executed; effects: marks user as deleted.
 */
export async function deleteUser(id: string): Promise<boolean> {
    const db = await getDatabase();
    const deleted_at = new Date().toISOString();
    
    db.run(`UPDATE users SET deleted = 1, deleted_at = ? WHERE id = ?`, [deleted_at, id]);
    saveDatabase();
    
    return true;
}

/**
 * Freezes a user account by marking them as deleted (frozen).
 * @param id user id to freeze.
 * @returns updated user; effects: marks user as frozen.
 */
export async function freezeUser(id: string): Promise<User> {
    const db = await getDatabase();
    const deleted_at = new Date().toISOString();
    
    db.run(`UPDATE users SET deleted = 1, deleted_at = ? WHERE id = ?`, [deleted_at, id]);
    saveDatabase();
    
    const updated = await getUserById(id);
    if (!updated) {
        throw new Error('User not found after freezing');
    }
    
    return updated;
}

/**
 * Unfreezes a user account by marking them as active.
 * @param id user id to unfreeze.
 * @returns updated user; effects: marks user as active.
 */
export async function unfreezeUser(id: string): Promise<User> {
    const db = await getDatabase();
    
    db.run(`UPDATE users SET deleted = 0, deleted_at = NULL WHERE id = ?`, [id]);
    saveDatabase();
    
    const updated = await getUserById(id);
    if (!updated) {
        throw new Error('User not found after unfreezing');
    }
    
    return updated;
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
    }));
}

/**
 * Returns all organizer requests (PENDING, APPROVED, REJECTED).
 * @returns list of all organizers ordered by created_at desc; effects: read-only.
 */
export async function getAllOrganizerRequests(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = 'ORGANIZER' 
         ORDER BY 
           CASE status 
             WHEN 'PENDING' THEN 1 
             WHEN 'REJECTED' THEN 2 
             WHEN 'APPROVED' THEN 3 
           END,
           created_at DESC`
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
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
        `UPDATE users SET status = 'APPROVED', approved_by = ?, approved_at = ? WHERE id = ? AND (status = 'PENDING' OR status = 'REJECTED')`,
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

/**
 * Returns all approved organizers (including frozen ones).
 * @returns list of approved organizers; effects: read-only.
 */
export async function getApprovedOrganizers(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = 'ORGANIZER' AND status = 'APPROVED' ORDER BY deleted ASC, created_at DESC`
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
    }));
}

/**
 * Returns all students (including frozen ones).
 * @returns list of students; effects: read-only.
 */
export async function getStudents(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = 'STUDENT' ORDER BY deleted ASC, created_at DESC`
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
        deleted: row[8] as number,
        deleted_at: row[9] as string | undefined,
        created_at: row[10] as string
    }));
}

