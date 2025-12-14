/**
 * Venue Repository
 * 
 * Handles all database operations for venues table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Venue, VenueType } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getFirstRow, getAllRows, getCountValue } from '../utils/dbHelpers';

/**
 * Inserts a new venue row.
 * @param venueData requires location, type, and optional capacity (ignored for OPENAIR).
 * @returns created venue; effects: writes to venues table.
 */
export async function createVenue(venueData: {
    location: string;
    type: VenueType;
    capacity?: number;
}): Promise<Venue> {
    const db = await getDatabase();
    const id = uuidv4();

    // OPENAIR venues should have NULL capacity (unlimited)
    const capacity = venueData.type === 'OPENAIR' ? null : venueData.capacity;

    db.run(
        `INSERT INTO venues (id, location, type, capacity)
         VALUES (?, ?, ?, ?)`,
        [id, venueData.location, venueData.type, capacity ?? null]
    );

    saveDatabase();

    return {
        id,
        location: venueData.location,
        type: venueData.type,
        capacity: capacity ?? undefined
    };
}

/**
 * Loads a venue by id.
 * @returns venue or null; effects: read-only.
 */
export async function getVenueById(id: string): Promise<Venue | null> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM venues WHERE id = ?`,
        [id]
    );

    if (result.length === 0 || !result[0] || !result[0].values || result[0].values.length === 0) {
        return null;
    }

    const row = result[0].values[0];
    if (!row) return null;
    
    return {
        id: row[0] as string,
        location: row[1] as string,
        type: row[2] as VenueType,
        capacity: row[3] as number | undefined
    };
}

/**
 * Returns all venues ordered by location.
 */
export async function getAllVenues(): Promise<Venue[]> {
    const db = await getDatabase();
    
    const result = db.exec(`SELECT * FROM venues ORDER BY location`);

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        location: row[1] as string,
        type: row[2] as VenueType,
        capacity: row[3] as number | undefined
    }));
}

/**
 * Returns venues filtered by type.
 */
export async function getVenuesByType(type: VenueType): Promise<Venue[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM venues WHERE type = ? ORDER BY location`,
        [type]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        location: row[1] as string,
        type: row[2] as VenueType,
        capacity: row[3] as number | undefined
    }));
}

/**
 * Returns venues not booked within a datetime interval.
 * @param startDatetime start ISO datetime.
 * @param endDatetime end ISO datetime.
 */
export async function getAvailableVenues(startDatetime: string, endDatetime: string): Promise<Venue[]> {
    const db = await getDatabase();
    
    // Get venues that don't have any events in the given datetime range
    const result = db.exec(
        `SELECT v.* FROM venues v
         WHERE v.id NOT IN (
             SELECT e.venue_id FROM events e
             WHERE e.status != 'CANCELLED'
             AND (
                 (e.start_datetime <= ? AND e.end_datetime >= ?)
                 OR (e.start_datetime <= ? AND e.end_datetime >= ?)
                 OR (e.start_datetime >= ? AND e.end_datetime <= ?)
             )
         )
         ORDER BY v.type, v.location`,
        [startDatetime, startDatetime, endDatetime, endDatetime, startDatetime, endDatetime]
    );

    if (result.length === 0 || !result[0] || !result[0].values) {
        return [];
    }

    return result[0].values.map(row => ({
        id: row[0] as string,
        location: row[1] as string,
        type: row[2] as VenueType,
        capacity: row[3] as number | undefined
    }));
}

/**
 * Updates venue fields.
 * @param id venue id.
 * @param updates partial venue fields; OPENAIR forces capacity NULL.
 * @returns updated venue; effects: writes to venues table.
 * @throws Error when venue missing after update.
 */
export async function updateVenue(
    id: string,
    updates: Partial<Pick<Venue, 'location' | 'type' | 'capacity'>>
): Promise<Venue> {
    const db = await getDatabase();
    
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.location !== undefined) {
        fields.push('location = ?');
        values.push(updates.location);
    }
    if (updates.type !== undefined) {
        fields.push('type = ?');
        values.push(updates.type);
        
        // If changing to OPENAIR, set capacity to NULL
        if (updates.type === 'OPENAIR') {
            fields.push('capacity = NULL');
        }
    }
    if (updates.capacity !== undefined && updates.type !== 'OPENAIR') {
        fields.push('capacity = ?');
        values.push(updates.capacity);
    }

    if (fields.length === 0) {
        const venue = await getVenueById(id);
        if (!venue) {
            throw new Error('Venue not found');
        }
        return venue;
    }

    values.push(id);

    db.run(
        `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    
    const updated = await getVenueById(id);
    if (!updated) {
        throw new Error('Venue not found after update');
    }
    
    return updated;
}

/**
 * Deletes a venue if not referenced by events.
 * @param id venue id.
 * @returns true when deleted; effects: removes row or throws if in use.
 */
export async function deleteVenue(id: string): Promise<boolean> {
    const db = await getDatabase();
    
    // Check if venue is used by any events
    const eventsResult = db.exec(
        `SELECT COUNT(*) FROM events WHERE venue_id = ?`,
        [id]
    );

    if (eventsResult.length > 0 && eventsResult[0] && eventsResult[0].values && eventsResult[0].values[0] && (eventsResult[0].values[0][0] as number) > 0) {
        throw new Error('Cannot delete venue: it is being used by events');
    }

    db.run(`DELETE FROM venues WHERE id = ?`, [id]);
    saveDatabase();
    
    return true;
}

/**
 * Checks for overlapping non-cancelled events at a venue.
 * @returns true when no overlaps; effects: read-only.
 */
export async function isVenueAvailable(venueId: string, startDatetime: string, endDatetime: string): Promise<boolean> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT COUNT(*) as count FROM events
         WHERE venue_id = ? 
         AND status != 'CANCELLED'
         AND (
             (start_datetime <= ? AND end_datetime >= ?)
             OR (start_datetime <= ? AND end_datetime >= ?)
             OR (start_datetime >= ? AND end_datetime <= ?)
         )`,
        [venueId, startDatetime, startDatetime, endDatetime, endDatetime, startDatetime, endDatetime]
    );

    if (!result[0] || !result[0].values || result[0].values.length === 0) {
        return true;
    }

    const row = result[0].values[0];
    if (!row) {
        return true;
    }

    const count = row[0] as number;
    return count === 0;
}
