/**
 * SQLite Database Schema
 * 
 * This file contains the SQL statements to create all database tables.
 * Exported as a single DDL string executed during database initialization.
 */

export const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('STUDENT', 'ORGANIZER', 'ADMIN')),
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')) DEFAULT 'APPROVED',
    approved_by TEXT,
    approved_at TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('LAB', 'EXAM_HALL', 'LECTURE_HALL', 'SMART_CLASSROOM', 'CLASSROOM', 'MEETING_HALL', 'OPENAIR', 'SEMINAR', 'AUDITORIUM', 'CAFE')),
    capacity INTEGER  -- NULL for OPENAIR (unlimited capacity)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    start_datetime TEXT NOT NULL,
    end_datetime TEXT NOT NULL,
    venue_id TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('UPCOMING', 'INPROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'UPCOMING',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event registrations table (handles both confirmed and waitlisted users)
CREATE TABLE IF NOT EXISTS event_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('CONFIRMED', 'WAITLISTED')) DEFAULT 'CONFIRMED',
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)  -- A user can only register once per event
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT,
    type TEXT NOT NULL CHECK(type IN (
        'REGISTRATION_CONFIRMED',
        'REGISTRATION_WAITLISTED',
        'PROMOTED_FROM_WAITLIST',
        'EVENT_CANCELLED',
        'EVENT_UPDATED',
        'EVENT_REMINDER',
        'UNREGISTERED'
    )),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status);
`;
