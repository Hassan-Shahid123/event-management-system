/**
 * Event Repository
 * 
 * Handles all database operations for events table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Event, EventStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new event
 */
export async function createEvent(eventData: {
    title: string;
    description: string;
    date_time: string;
    venue_id: string;
    organizer_id: string;
}): Promise<Event> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const status: EventStatus = 'PENDING';

    db.run(
        `INSERT INTO events (id, title, description, date_time, venue_id, organizer_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, eventData.title, eventData.description, eventData.date_time, 
         eventData.venue_id, eventData.organizer_id, status, created_at]
    );

    saveDatabase();

    return {
        id,
        ...eventData,
        status,
        created_at
    };
}

/**
 * Get event by ID
 */
export async function getEventById(id: string): Promise<Event | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE id = ?`,
        [id]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    };
}

/**
 * Get all events
 */
export async function getAllEvents(): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(`SELECT * FROM events ORDER BY date_time DESC`);

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}

/**
 * Get events by organizer
 */
export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE organizer_id = ? ORDER BY date_time DESC`,
        [organizerId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}

/**
 * Get events by status
 */
export async function getEventsByStatus(status: EventStatus): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE status = ? ORDER BY date_time DESC`,
        [status]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}

/**
 * Get events by venue
 */
export async function getEventsByVenue(venueId: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE venue_id = ? ORDER BY date_time DESC`,
        [venueId]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}

/**
 * Get upcoming events (future events that are verified)
 */
export async function getUpcomingEvents(): Promise<Event[]> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const result = db.exec(
        `SELECT * FROM events 
         WHERE status = 'VERIFIED' AND date_time > ?
         ORDER BY date_time ASC`,
        [now]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}

/**
 * Update event
 */
export async function updateEvent(
    id: string,
    updates: Partial<Pick<Event, 'title' | 'description' | 'date_time' | 'venue_id' | 'status'>>
): Promise<boolean> {
    const db = await getDatabase();
    
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
        fields.push('title = ?');
        values.push(updates.title);
    }
    if (updates.description !== undefined) {
        fields.push('description = ?');
        values.push(updates.description);
    }
    if (updates.date_time !== undefined) {
        fields.push('date_time = ?');
        values.push(updates.date_time);
    }
    if (updates.venue_id !== undefined) {
        fields.push('venue_id = ?');
        values.push(updates.venue_id);
    }
    if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
    }

    if (fields.length === 0) {
        return false;
    }

    values.push(id);

    db.run(
        `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    return true;
}

/**
 * Delete event
 */
export async function deleteEvent(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    // Note: Registrations will be automatically deleted due to CASCADE
    db.run(`DELETE FROM events WHERE id = ?`, [id]);
    saveDatabase();
    
    return true;
}

/**
 * Change event status
 */
export async function changeEventStatus(id: string, status: EventStatus): Promise<boolean> {
    return updateEvent(id, { status });
}

/**
 * Search events by title
 */
export async function searchEventsByTitle(searchTerm: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events 
         WHERE title LIKE ? OR description LIKE ?
         ORDER BY date_time DESC`,
        [`%${searchTerm}%`, `%${searchTerm}%`]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        date_time: row[3] as string,
        venue_id: row[4] as string,
        organizer_id: row[5] as string,
        status: row[6] as EventStatus,
        created_at: row[7] as string
    }));
}
