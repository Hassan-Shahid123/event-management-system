/**
 * SQLite Database Schema
 * 
 * This file contains the SQL statements to create all database tables.
 */

export const createTablesSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('STUDENT', 'ORGANIZER', 'ADMIN')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Venues table
CREATE TABLE IF NOT EXISTS venues (
    id TEXT PRIMARY KEY,
    location TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('SEMINAR_HALL', 'OPENAIR', 'AUDITORIUM', 'LECTURE_HALL', 'CLASS_ROOM', 'LAB')),
    capacity INTEGER  -- NULL for OPENAIR (unlimited capacity)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    date_time TEXT NOT NULL,
    venue_id TEXT NOT NULL,
    organizer_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'VERIFIED', 'CANCELLED')) DEFAULT 'PENDING',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE RESTRICT,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Event registrations table (handles both registered and waitlisted users)
CREATE TABLE IF NOT EXISTS event_registrations (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    is_waitlisted INTEGER NOT NULL DEFAULT 0 CHECK(is_waitlisted IN (0, 1)),
    registered_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(event_id, user_id)  -- A user can only register once per event
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_events_venue ON events(venue_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_registrations_user ON event_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;
