/**
 * User Repository
 * 
 * Handles all database operations for users table.
 */

import { getDatabase, saveDatabase } from '../database';
import { User, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new user
 */
export async function createUser(userData: {
    name: string;
    email: string;
    password_hash: string;
    role: Role;
}): Promise<User> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = new Date().toISOString();

    db.run(
        `INSERT INTO users (id, name, email, password_hash, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userData.name, userData.email, userData.password_hash, userData.role, created_at]
    );

    saveDatabase();

    return {
        id,
        ...userData,
        created_at
    };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE id = ?`,
        [id]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        created_at: row[5] as string
    };
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE email = ?`,
        [email]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        created_at: row[5] as string
    };
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(`SELECT * FROM users ORDER BY created_at DESC`);

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        created_at: row[5] as string
    }));
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: Role): Promise<User[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM users WHERE role = ? ORDER BY created_at DESC`,
        [role]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        name: row[1] as string,
        email: row[2] as string,
        password_hash: row[3] as string,
        role: row[4] as Role,
        created_at: row[5] as string
    }));
}

/**
 * Update user
 */
export async function updateUser(
    id: string,
    updates: Partial<Pick<User, 'name' | 'email' | 'password_hash' | 'role'>>
): Promise<boolean> {
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
        return false;
    }

    values.push(id);

    db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    return true;
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    db.run(`DELETE FROM users WHERE id = ?`, [id]);
    saveDatabase();
    
    return true;
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
    const user = await getUserByEmail(email);
    return user !== null;
}

/**
 * Get user count by role
 */
export async function getUserCountByRole(): Promise<Record<Role, number>> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );

    const counts: Record<Role, number> = {
        STUDENT: 0,
        ORGANIZER: 0,
        ADMIN: 0
    };

    if (result.length > 0 && result[0] && result[0].values) {
        result[0].values.forEach(row => {
            const role = row[0] as Role;
            const count = row[1] as number;
            counts[role] = count;
        });
    }

    return counts;
}
