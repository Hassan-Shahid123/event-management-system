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
 * Invariant: A user has exactly one role at any time.
 */
export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';
export type UserRole = Role; // Alias for compatibility

/**
 * EventStatus represents the lifecycle state of an event.
 * Valid transitions: UPCOMING -> {INPROGRESS, CANCELLED}; INPROGRESS -> {COMPLETED, CANCELLED}.
 * COMPLETED and CANCELLED are terminal states.
 */
export type EventStatus = 'UPCOMING' | 'INPROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * VenueType represents the type of venue available for events.
 * OPENAIR venues have unlimited capacity (capacity field should be null/undefined).
 * All other types require a positive capacity value.
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
 * CONFIRMED users are guaranteed a spot; WAITLISTED users may be promoted when capacity allows.
 */
export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED';

/**
 * NotificationType represents the type of notification.
 * Used to categorize and display notifications appropriately.
 */
export type NotificationType = 
    | 'REGISTRATION_CONFIRMED'
    | 'REGISTRATION_WAITLISTED'
    | 'PROMOTED_FROM_WAITLIST'
    | 'EVENT_CANCELLED'
    | 'EVENT_UPDATED'
    | 'EVENT_REMINDER'
    | 'UNREGISTERED';

// ============================================================================
// DATABASE MODEL INTERFACES
// ============================================================================

/**
 * User represents a user in the system (maps to users table in SQLite).
 * 
 * Invariants:
 * - email is unique across all users
 * - password_hash should never be returned to clients (use Omit<User, 'password_hash'>)
 * - created_at is immutable after creation
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
 * Invariants:
 * - capacity is required for all venue types except OPENAIR (unlimited capacity)
 * - capacity, when present, must be positive
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
 * 
 * Invariants:
 * - start_datetime and end_datetime are ISO 8601 format strings
 * - end_datetime must be after start_datetime
 * - status follows valid transitions (see EventStatus)
 * - venue_id and organizer_id reference existing records
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
 * 
 * Invariants:
 * - unique constraint: (event_id, user_id) pair is unique
 * - status is either CONFIRMED or WAITLISTED
 * - registered_at is immutable after creation
 */
export interface EventRegistration {
    id: string;
    event_id: string;
    user_id: string;
    status: RegistrationStatus;
    registered_at: string;
}

/**
 * Notification represents a user notification
 * (maps to notifications table in SQLite).
 * 
 * Invariants:
 * - user_id references an existing user
 * - event_id, when present, references an existing event
 * - is_read defaults to false and can be set true but not back to false
 */
export interface Notification {
    id: string;
    user_id: string;
    event_id?: string;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
}

