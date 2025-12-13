/**
 * CampusConnect Type Definitions
 * 
 * This module defines all core types used throughout the system.
 * These interfaces represent the shape of data from SQLite database.
 */

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================


/**
 * Role represents the privilege level of a user in the system.
 * 
 * Ordering of privileges: STUDENT < ORGANIZER < ADMIN
 */
export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';

/**
 * EventStatus represents the lifecycle state of an event.
 */
export type EventStatus = 'PENDING' | 'VERIFIED' | 'CANCELLED';

/**
 * VenueType represents the type of venue available for events.
 */
export type VenueType = 'SEMINAR_HALL' | 'OPENAIR' | 'AUDITORIUM' | 'LECTURE_HALL' | 'CLASS_ROOM' | 'LAB';

// ============================================================================
// DATABASE MODEL INTERFACES
// ============================================================================

/**
 * User represents a user in the system (maps to users table in SQLite).
 */
export interface User {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    role: Role;
    created_at: string;
}

/**
 * Venue represents a physical location (maps to venues table in SQLite).
 */
export interface Venue {
    id: string;
    location: string;
    type: VenueType;
    capacity?: number;  // null/undefined for OPENAIR (unlimited capacity)
}

/**
 * Event represents a campus event (maps to events table in SQLite).
 */
export interface Event {
    id: string;
    title: string;
    description: string;
    date_time: string;  // ISO 8601 format
    venue_id: string;
    organizer_id: string;
    status: EventStatus;
    created_at: string;
}

/**
 * EventRegistration represents a user's registration for an event
 * (maps to event_registrations table in SQLite).
 */
export interface EventRegistration {
    id: string;
    event_id: string;
    user_id: string;
    is_waitlisted: boolean;
    registered_at: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result type for operations that may succeed or fail.
 */
export type Result<T, E = string> = 
    | { success: true; value: T }
    | { success: false; error: E };

