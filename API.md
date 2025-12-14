# API Documentation

## Running the Server

```bash
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Your Name Doe",
  "email": "email@example.com",
  "password": "password123",
  "role": "STUDENT"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "hassan@example.com",
  "password": "password123"
}
```

### Users

#### Get All Users
```http
GET /api/users
```

#### Get User by ID
```http
GET /api/users/:id
```

#### Update User
```http
PUT /api/users/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

#### Delete User
```http
DELETE /api/users/:id
```

### Venues

#### Create Venue
```http
POST /api/venues
Content-Type: application/json

{
  "location": "Main Hall",
  "type": "AUDITORIUM",
  "capacity": 200
}
```

#### Get All Venues
```http
GET /api/venues
```

#### Get Venue by ID
```http
GET /api/venues/:id
```

#### Update Venue
```http
PUT /api/venues/:id
Content-Type: application/json

{
  "location": "Updated Hall",
  "capacity": 250
}
```

#### Delete Venue
```http
DELETE /api/venues/:id
```

#### Get Available Venues
```http
GET /api/venues/available?startDatetime=2025-01-15T10:00:00Z&endDatetime=2025-01-15T12:00:00Z
```

### Events

#### Create Event
```http
POST /api/events
Content-Type: application/json

{
  "title": "Tech Workshop",
  "description": "Learn TypeScript",
  "start_datetime": "2025-01-15T10:00:00Z",
  "end_datetime": "2025-01-15T12:00:00Z",
  "organizer_id": "user-uuid",
  "venue_id": "venue-uuid"
}
```

#### Get All Events
```http
GET /api/events
```

#### Get Event by ID
```http
GET /api/events/:id
```

#### Update Event
```http
PUT /api/events/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "description": "Updated description",
  "requestingUserId": "user-uuid"
}
```

#### Delete Event
```http
DELETE /api/events/:id
Content-Type: application/json

{
  "requestingUserId": "user-uuid"
}
```

#### Change Event Status
```http
PATCH /api/events/:id/status
Content-Type: application/json

{
  "status": "INPROGRESS",
  "requestingUserId": "user-uuid"
}
```

#### Search Events
```http
GET /api/events/search/:searchTerm
```

### Registrations

#### Register for Event
```http
POST /api/registrations
Content-Type: application/json

{
  "eventId": "event-uuid",
  "userId": "user-uuid"
}
```

#### Unregister from Event
```http
DELETE /api/registrations
Content-Type: application/json

{
  "eventId": "event-uuid",
  "userId": "user-uuid"
}
```

#### Get Event Registrations
```http
GET /api/registrations/event/:eventId
```

#### Get User Registrations
```http
GET /api/registrations/user/:userId
```

#### Get Registration Stats
```http
GET /api/registrations/event/:eventId/stats
```

## Testing with cURL

### Register a user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Student",
    "email": "student@test.com",
    "password": "password123",
    "role": "STUDENT"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@test.com",
    "password": "password123"
  }'
```

### Get all events
```bash
curl http://localhost:3000/api/events
```

## Testing with Tools

- **Postman**: Import endpoints and test interactively
- **Thunder Client** (VS Code): REST API client extension
- **curl**: Command-line testing (examples above)
