/**
 * Registration Repository
 * 
 * Handles all database operations for event_registrations table.
 */

import { getDatabase, saveDatabase } from '../database';
import { EventRegistration, RegistrationStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register a user for an event
 */
export async function registerUser(
    eventId: string,
    userId: string,
    status: RegistrationStatus = 'CONFIRMED'
): Promise<EventRegistration> {
    const db = await getDatabase();
    const id = uuidv4();
    const registered_at = new Date().toISOString();

    db.run(
        `INSERT INTO event_registrations (id, event_id, user_id, status, registered_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, eventId, userId, status, registered_at]
    );

    saveDatabase();

    return {
        id,
        event_id: eventId,
        user_id: userId,
        status,
        registered_at
    };
}

/**
 * Unregister a user from an event
 */
export async function unregisterUser(eventId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    
    db.run(
        `DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    saveDatabase();
    return true;
}

/**
 * Get all registrations for an event
 */
export async function getEventRegistrations(eventId: string): Promise<EventRegistration[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations WHERE event_id = ? ORDER BY registered_at ASC`,
        [eventId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: row[3] as RegistrationStatus,
        registered_at: row[4] as string
    }));
}

/**
 * Get confirmed registrations (not waitlisted) for an event
 */
export async function getConfirmedRegistrations(eventId: string): Promise<EventRegistration[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations 
         WHERE event_id = ? AND status = 'CONFIRMED' 
         ORDER BY registered_at ASC`,
        [eventId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: 'CONFIRMED' as RegistrationStatus,
        registered_at: row[4] as string
    }));
}

/**
 * Get waitlisted registrations for an event
 */
export async function getWaitlistedRegistrations(eventId: string): Promise<EventRegistration[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations 
         WHERE event_id = ? AND status = 'WAITLISTED' 
         ORDER BY registered_at ASC`,
        [eventId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: 'WAITLISTED' as RegistrationStatus,
        registered_at: row[4] as string
    }));
}

/**
 * Get all events a user is registered for
 */
export async function getUserRegistrations(userId: string): Promise<EventRegistration[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations WHERE user_id = ? ORDER BY registered_at DESC`,
        [userId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: row[3] as RegistrationStatus,
        registered_at: row[4] as string
    }));
}

/**
 * Check if a user is registered for an event
 */
export async function isUserRegistered(eventId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    return !!(result.length > 0 && result[0] && result[0].values && result[0].values[0] && (result[0].values[0][0] as number) > 0);
}

/**
 * Get registration details for a user and event
 */
export async function getRegistration(eventId: string, userId: string): Promise<EventRegistration | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: row[3] as RegistrationStatus,
        registered_at: row[4] as string
    };
}

/**
 * Move a user from waitlist to confirmed registration
 */
export async function promoteFromWaitlist(eventId: string, userId: string): Promise<EventRegistration> {
    const db = await getDatabase();
    
    db.run(
        `UPDATE event_registrations SET status = 'CONFIRMED' WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    saveDatabase();
    
    const registration = await getRegistration(eventId, userId);
    if (!registration) {
        throw new Error('Registration not found after promotion');
    }
    
    return registration;
}

/**
 * Get registration count for an event (optionally filter by status)
 */
export async function getRegistrationCount(eventId: string, status?: RegistrationStatus): Promise<number> {
    const db = await getDatabase();
    
    let query = `SELECT COUNT(*) FROM event_registrations WHERE event_id = ?`;
    const params: any[] = [eventId];
    
    if (status) {
        query += ` AND status = ?`;
        params.push(status);
    }
    
    const result = db.exec(query, params);

    if (!result[0] || !result[0].values || result[0].values.length === 0) {
        return 0;
    }
    
    const row = result[0].values[0];
    if (!row) {
        return 0;
    }

    return row[0] as number;
}

/**
 * Get waitlist count for an event
 */
export async function getWaitlistCount(eventId: string): Promise<number> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND status = 'WAITLISTED'`,
        [eventId]
    );

    if (!result[0] || !result[0].values || result[0].values.length === 0) {
        return 0;
    }
    
    const row = result[0].values[0];
    if (!row) {
        return 0;
    }

    return row[0] as number;
}

/**
 * Get next person from waitlist (oldest registration)
 */
export async function getNextFromWaitlist(eventId: string): Promise<EventRegistration | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations 
         WHERE event_id = ? AND status = 'WAITLISTED' 
         ORDER BY registered_at ASC 
         LIMIT 1`,
        [eventId]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        event_id: row[1] as string,
        user_id: row[2] as string,
        status: 'WAITLISTED' as RegistrationStatus,
        registered_at: row[4] as string
    };
}

/**
 * Delete all registrations for an event
 */
export async function deleteEventRegistrations(eventId: string): Promise<boolean> {
    const db = await getDatabase();
    
    db.run(`DELETE FROM event_registrations WHERE event_id = ?`, [eventId]);
    saveDatabase();
    
    return true;
}
