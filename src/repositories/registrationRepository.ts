/**
 * Registration Repository
 * 
 * Handles all database operations for event_registrations table.
 */

import { getDatabase, saveDatabase } from '../database';
import { EventRegistration } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Register a user for an event
 */
export async function registerUser(
    eventId: string,
    userId: string,
    isWaitlisted: boolean = false
): Promise<EventRegistration> {
    const db = await getDatabase();
    const id = uuidv4();
    const registered_at = new Date().toISOString();

    db.run(
        `INSERT INTO event_registrations (id, event_id, user_id, is_waitlisted, registered_at)
         VALUES (?, ?, ?, ?, ?)`,
        [id, eventId, userId, isWaitlisted ? 1 : 0, registered_at]
    );

    saveDatabase();

    return {
        id,
        event_id: eventId,
        user_id: userId,
        is_waitlisted: isWaitlisted,
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
        is_waitlisted: (row[3] as number) === 1,
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
         WHERE event_id = ? AND is_waitlisted = 0 
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
        is_waitlisted: false,
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
         WHERE event_id = ? AND is_waitlisted = 1 
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
        is_waitlisted: true,
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
        is_waitlisted: (row[3] as number) === 1,
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
        is_waitlisted: (row[3] as number) === 1,
        registered_at: row[4] as string
    };
}

/**
 * Move a user from waitlist to confirmed registration
 */
export async function promoteFromWaitlist(eventId: string, userId: string): Promise<boolean> {
    const db = await getDatabase();
    
    db.run(
        `UPDATE event_registrations SET is_waitlisted = 0 WHERE event_id = ? AND user_id = ?`,
        [eventId, userId]
    );

    saveDatabase();
    return true;
}

/**
 * Get registration count for an event (confirmed only)
 */
export async function getRegistrationCount(eventId: string): Promise<number> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND is_waitlisted = 0`,
        [eventId]
    );

    return result.length > 0 && result[0] && result[0].values && result[0].values[0] ? (result[0].values[0][0] as number) : 0;
}

/**
 * Get waitlist count for an event
 */
export async function getWaitlistCount(eventId: string): Promise<number> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) FROM event_registrations WHERE event_id = ? AND is_waitlisted = 1`,
        [eventId]
    );

    return result.length > 0 && result[0] && result[0].values && result[0].values[0] ? (result[0].values[0][0] as number) : 0;
}

/**
 * Get next person from waitlist (oldest registration)
 */
export async function getNextFromWaitlist(eventId: string): Promise<EventRegistration | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM event_registrations 
         WHERE event_id = ? AND is_waitlisted = 1 
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
        is_waitlisted: true,
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
