# Project Cleanup Summary

## What Was Removed

The following directories and files were removed to simplify the project:

1. **`src/parsing/`** - Grammar and parsing logic (lexer, parser, rule engine)
2. **`src/concurrency/`** - Concurrency demonstrations and mutex implementations
3. **`src/utils/`** - Utility functions (assertions, logger)
4. **`src/models/`** - Old model implementations with complex factory functions
5. **`src/services/`** - Old service layer implementations
6. **`src/persistence/`** - Old persistence layer
7. **`tests/`** - All old test files

## What Was Kept/Created

### Current Project Structure

```
src/
├── database/
│   ├── connection.ts    # SQLite database connection (better-sqlite3)
│   ├── schema.ts        # SQL table definitions
│   └── index.ts         # Database exports
├── types.ts             # TypeScript interfaces for database models
├── index.ts             # Main entry point
└── test.ts              # Simple database test
```

### Database Tables

1. **users**
   - id (PRIMARY KEY)
   - name
   - email (UNIQUE)
   - password_hash
   - role (STUDENT, ORGANIZER, ADMIN)
   - created_at

2. **venues**
   - id (PRIMARY KEY)
   - location
   - type (SEMINAR_HALL, OPENAIR, AUDITORIUM, LECTURE_HALL, CLASS_ROOM, LAB)
   - capacity (NULL for OPENAIR = unlimited)

3. **events**
   - id (PRIMARY KEY)
   - title
   - description
   - date_time
   - venue_id (FOREIGN KEY → venues)
   - organizer_id (FOREIGN KEY → users)
   - status (PENDING, VERIFIED, CANCELLED)
   - created_at

4. **event_registrations**
   - id (PRIMARY KEY)
   - event_id (FOREIGN KEY → events)
   - user_id (FOREIGN KEY → users)
   - is_waitlisted (0 or 1)
   - registered_at
   - UNIQUE(event_id, user_id)

## TypeScript Interfaces

Instead of complex classes with readonly properties and factory functions, we now have simple interfaces that match the SQLite table structure:

- `User` - Maps to users table
- `Venue` - Maps to venues table  
- `Event` - Maps to events table
- `EventRegistration` - Maps to event_registrations table

## Key Changes

1. **Removed "branded types"** - No more `UserId`, `EventId`, etc. Just use `string`
2. **Removed readonly properties** - Interfaces are simple and match database schema
3. **Simplified type names** - Database column names use snake_case (e.g., `date_time`, `venue_id`)
4. **Removed complex inheritance** - No more `BaseUser`, `Student`, `Organizer`, `Admin` types
5. **Single User interface** - Role is determined by the `role` field

## Next Steps

1. ✅ Database schema created
2. ✅ Type definitions simplified
3. ⏳ Install dependencies (`npm install`)
4. 🔲 Create repository layer (CRUD operations for each table)
5. 🔲 Create service layer (business logic)
6. 🔲 Create API layer (REST endpoints)
7. 🔲 Add authentication
8. 🔲 Add validation
9. 🔲 Write tests

## Why These Changes?

**Before:** The project was using an academic approach (MIT 6.102 style) with:
- Immutable data structures
- Factory functions
- Branded types
- Complex abstractions

**After:** Using a practical web development approach with:
- Simple database-mapped interfaces
- Direct SQL operations
- Standard TypeScript types
- Step-by-step development

This makes the project easier to:
- Understand and maintain
- Integrate with web frameworks (Express, etc.)
- Map to SQL databases
- Build incrementally
