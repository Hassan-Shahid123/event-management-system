/**
 * Event Repository
 * 
 * Handles all database operations for events table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Event, EventStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getFirstRow, getAllRows } from '../utils/dbHelpers';

/**
 * Map database row to Event object
 */
function mapRowToEvent(row: any[]): Event {
    return {
        id: row[0] as string,
        title: row[1] as string,
        description: row[2] as string,
        start_datetime: row[3] as string,
        end_datetime: row[4] as string,
        venue_id: row[5] as string,
        organizer_id: row[6] as string,
        status: row[7] as EventStatus,
        created_at: row[8] as string
    };
}

/**
 * Persists a new event row.
 * @param eventData requires title/description text, ISO datetimes, valid venue/organizer ids, and optional status.
 * @returns created event with generated id and timestamps; effects: writes to events table.
 */
export async function createEvent(eventData: {
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    venue_id: string;
    organizer_id: string;
    status?: EventStatus;
}): Promise<Event> {
    const db = await getDatabase();
    const id = uuidv4();
    const created_at = new Date().toISOString();
    const status: EventStatus = eventData.status || 'UPCOMING';

    db.run(
        `INSERT INTO events (id, title, description, start_datetime, end_datetime, venue_id, organizer_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, eventData.title, eventData.description, eventData.start_datetime, eventData.end_datetime,
         eventData.venue_id, eventData.organizer_id, status, created_at]
    );

    saveDatabase();

    return {
        id,
        title: eventData.title,
        description: eventData.description,
        start_datetime: eventData.start_datetime,
        end_datetime: eventData.end_datetime,
        venue_id: eventData.venue_id,
        organizer_id: eventData.organizer_id,
        status,
        created_at
    };
}

/**
 * Loads an event by id.
 * @param id event id.
 * @returns event or null when missing; effects: read-only.
 */
export async function getEventById(id: string): Promise<Event | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE id = ?`,
        [id]
    );

    const row = getFirstRow(result);
    if (!row) return null;
    
    return mapRowToEvent(row);
}

/**
 * Returns all events ordered by start_datetime descending.
 */
export async function getAllEvents(): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(`SELECT * FROM events ORDER BY start_datetime DESC`);

    return getAllRows(result).map(mapRowToEvent);
}

/**
 * Returns events created by the given organizer.
 * @param organizerId organizer user id.
 */
export async function getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE organizer_id = ? ORDER BY start_datetime DESC`,
        [organizerId]
    );

    return getAllRows(result).map(mapRowToEvent);
}

/**
 * Returns events filtered by status.
 */
export async function getEventsByStatus(status: EventStatus): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE status = ? ORDER BY start_datetime DESC`,
        [status]
    );

    return getAllRows(result).map(mapRowToEvent);
}

/**
 * Returns events scheduled at a venue.
 */
export async function getEventsByVenue(venueId: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events WHERE venue_id = ? ORDER BY start_datetime DESC`,
        [venueId]
    );

    return getAllRows(result).map(mapRowToEvent);
}

/**
 * Returns events whose start is in the future ordered soonest-first.
 */
export async function getUpcomingEvents(): Promise<Event[]> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    
    const result = db.exec(
        `SELECT * FROM events 
         WHERE start_datetime > ?
         ORDER BY start_datetime ASC`,
        [now]
    );

    return getAllRows(result).map(mapRowToEvent);
}

/**
 * Updates specified fields on an event.
 * @param id event id; requires existing event.
 * @param updates partial fields to change.
 * @returns updated event; effects: writes to events table.
 * @throws Error when event missing after update.
 */
export async function updateEvent(
    id: string,
    updates: Partial<Pick<Event, 'title' | 'description' | 'start_datetime' | 'end_datetime' | 'venue_id' | 'status'>>
): Promise<Event> {
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
    if (updates.start_datetime !== undefined) {
        fields.push('start_datetime = ?');
        values.push(updates.start_datetime);
    }
    if (updates.end_datetime !== undefined) {
        fields.push('end_datetime = ?');
        values.push(updates.end_datetime);
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
        const event = await getEventById(id);
        if (!event) {
            throw new Error('Event not found');
        }
        return event;
    }

    values.push(id);

    db.run(
        `UPDATE events SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    
    const updated = await getEventById(id);
    if (!updated) {
        throw new Error('Event not found after update');
    }
    
    return updated;
}

/**
 * Deletes an event by id.
 * @param id event id.
 * @returns void; effects: removes row and cascades dependent rows.
 */
export async function deleteEvent(id: string): Promise<void> {
    const db = await getDatabase();
    
    // Note: Registrations will be automatically deleted due to CASCADE
    db.run(`DELETE FROM events WHERE id = ?`, [id]);
    saveDatabase();
}

/**
 * Convenience wrapper to update only the status field.
 */
export async function changeEventStatus(id: string, status: EventStatus): Promise<Event> {
    return updateEvent(id, { status });
}

/**
 * Searches events whose title contains a term.
 * @param searchTerm substring to match.
 * @returns matching events ordered by start_datetime descending.
 */
export async function searchEventsByTitle(searchTerm: string): Promise<Event[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM events 
         WHERE title LIKE ? 
         ORDER BY start_datetime DESC`,
        [`%${searchTerm}%`]
    );

    return getAllRows(result).map(mapRowToEvent);
}
