# CampusConnect - Event Management System

A simplified TypeScript-based campus event management system using SQLite database.

## Project Structure

```
src/
├── database/           # Database connection and schema
│   ├── connection.ts   # SQLite connection management
│   ├── schema.ts       # Database table definitions
│   └── index.ts        # Database module exports
├── types.ts            # TypeScript interfaces for database models
└── index.ts            # Main entry point
```

## Database Schema

### Tables

1. **users** - User accounts (students, organizers, admins)
2. **venues** - Physical locations for events
3. **events** - Campus events
4. **event_registrations** - User registrations for events (includes waitlist)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

## Development

We're building this project step by step:
-  Database schema and types defined
-  Basic project structure cleaned up
-  Repository layer (CRUD operations)
-  Service layer (business logic)
-  API endpoints
-  Testing

## Technology Stack

- **TypeScript** - Type-safe JavaScript
- **SQLite** - Embedded database via better-sqlite3
- **Jest** - Testing framework (to be added)
