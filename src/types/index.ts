/**
 * Type Definitions for CampusConnect Frontend
 * Matches backend API types (without sensitive data like password_hash)
 */

// ============================================================================
// ENUMS & STATUS TYPES
// ============================================================================

export type Role = 'STUDENT' | 'ORGANIZER' | 'ADMIN';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type EventStatus = 'UPCOMING' | 'INPROGRESS' | 'COMPLETED' | 'CANCELLED';

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

export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED';

export type NotificationType = 
    | 'REGISTRATION_CONFIRMED'
    | 'REGISTRATION_WAITLISTED'
    | 'PROMOTED_FROM_WAITLIST'
    | 'EVENT_CANCELLED'
    | 'EVENT_UPDATED'
    | 'EVENT_REMINDER'
    | 'UNREGISTERED';

// ============================================================================
// INTERFACES
// ============================================================================

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    status: UserStatus;
    approved_by?: string;
    approved_at?: string;
    deleted: number;
    deleted_at?: string;
    created_at: string;
}

export interface Venue {
    id: string;
    location: string;
    type: VenueType;
    capacity?: number;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    venue_id: string;
    organizer_id: string;
    status: EventStatus;
    created_at: string;
}

export interface EventRegistration {
    id: string;
    event_id: string;
    user_id: string;
    status: RegistrationStatus;
    registered_at: string;
}

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

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    role: Role;
}

export interface CreateEventRequest {
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    venue_id: string;
    organizer_id: string;
}

export interface UpdateEventRequest {
    title?: string;
    description?: string;
    start_datetime?: string;
    end_datetime?: string;
    venue_id?: string;
    requestingUserId: string;
}

export interface ChangeEventStatusRequest {
    status: EventStatus;
    requestingUserId: string;
}

export interface CreateVenueRequest {
    location: string;
    type: VenueType;
    capacity?: number;
}

export interface RegistrationStatsResponse {
    confirmed: number;
    waitlisted: number;
    total: number;
    capacity?: number;
}

export interface UserStatsResponse {
    STUDENT: number;
    ORGANIZER: number;
    ADMIN: number;
    total: number;
}
