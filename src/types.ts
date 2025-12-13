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
export type UserRole = Role; // Alias for compatibility

/**
 * EventStatus represents the lifecycle state of an event.
 */
export type EventStatus = 'UPCOMING' | 'INPROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * VenueType represents the type of venue available for events.
 */
export type VenueType = 
    | 'LAB'
    | 'EXAM_HALL'
    | 'LECTURE_HALL'
    | 'SMART_CLASSROOM'
    | 'CLASSROOM'
    | 'MEETING_HALL'
    | 'OPENAIR'
    | 'SEMINAR'
    | 'AUDITORIUM'
    | 'CAFE';

/**
 * RegistrationStatus represents the status of an event registration.
 */
export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED';

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
 * 
 * Note: capacity is required for all venue types except OPENAIR (unlimited capacity).
 * Validation should be enforced at the service layer.
 */
export interface Venue {
    id: string;
    location: string;
    type: VenueType;
    capacity?: number;  // Required for all types except OPENAIR (unlimited)
}

/**
 * Event represents a campus event (maps to events table in SQLite).
 */
export interface Event {
    id: string;
    title: string;
    description: string;
    start_datetime: string;  // ISO 8601 format (includes date and time)
    end_datetime: string;    // ISO 8601 format (includes date and time)
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
    status: RegistrationStatus;
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

