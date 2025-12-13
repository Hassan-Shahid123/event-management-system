/**
 * Venue Repository
 * 
 * Handles all database operations for venues table.
 */

import { getDatabase, saveDatabase } from '../database';
import { Venue, VenueType } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new venue
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
 * Get venue by ID
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
 * Get all venues
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
 * Get venues by type
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
 * Get available venues (with capacity for at least minCapacity people)
 */
export async function getAvailableVenues(minCapacity: number): Promise<Venue[]> {
    const db = await getDatabase();
    
    const result = db.exec(
        `SELECT * FROM venues 
         WHERE capacity >= ? OR capacity IS NULL 
         ORDER BY capacity DESC`,
        [minCapacity]
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
 * Update venue
 */
export async function updateVenue(
    id: string,
    updates: Partial<Pick<Venue, 'location' | 'type' | 'capacity'>>
): Promise<boolean> {
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
        return false;
    }

    values.push(id);

    db.run(
        `UPDATE venues SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    saveDatabase();
    return true;
}

/**
 * Delete venue
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
 * Check if venue is available (not at capacity for a specific event)
 */
export async function isVenueAvailable(venueId: string, registrationCount: number): Promise<boolean> {
    const venue = await getVenueById(venueId);
    
    if (!venue) {
        return false;
    }

    // OPENAIR venues have unlimited capacity
    if (venue.capacity === undefined || venue.capacity === null) {
        return true;
    }

    return registrationCount < venue.capacity;
}
