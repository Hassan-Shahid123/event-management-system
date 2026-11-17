# CampusConnect Event Management System

CampusConnect is a full-stack event management system for campus communities.
Administrators and organizers can manage events and venues, while students can
discover events and register for them.

## Technology and implementation

The backend is written in **TypeScript** and runs on Node.js with Express.
TypeScript provides typed models, service interfaces, route handlers, and
database access. The frontend is a separate React/Vite TypeScript application
on the `frontend` branch.

The backend also includes a small notification-rule language. Its formal
grammar is defined in [`src/query/grammar.ts`](src/query/grammar.ts) and the
parser grammar is implemented in
[`src/query/query.peggy`](src/query/query.peggy). Rules such as
`SEND EMAIL WHEN hours_until = 24 AND status = UPCOMING` are parsed into an
abstract syntax tree and evaluated by the notification services. This lets
administrators configure notification conditions without changing application
code.

Regular expressions are used for focused input validation. For example,
[`src/utils/validation.ts`](src/utils/validation.ts) uses a regular expression
to validate the basic structure of email addresses before account operations
continue. The rule grammar also uses pattern definitions for numeric and
alphanumeric tokens while parsing notification rules.

The repository is organized into two branches:

- `main` contains the backend API.
- `frontend` contains the React/Vite frontend and is intentionally kept as a
  separate branch.

## Main properties

- Role-based users: `STUDENT`, `ORGANIZER`, and `ADMIN`
- JWT authentication with password hashing
- Event creation, editing, cancellation, status tracking, and discovery
- Venue management with venue types and capacity limits
- Event registration, duplicate-registration protection, and waitlists
- Notifications for registrations, updates, cancellations, promotions, and
  reminders
- Admin-configurable notification rules using a small rule language, for
  example:
  `SEND EMAIL WHEN hours_until = 24 AND status = UPCOMING`
- Background schedulers for event status synchronization and email reminders
- SQLite persistence with the database initialized from
  [`src/database/schema.ts`](src/database/schema.ts)
- REST endpoints grouped under `/api/auth`, `/api/users`, `/api/venues`,
  `/api/events`, `/api/registrations`, and `/api/notification-rules`

## Backend setup

Requirements:

- Node.js 20 or newer
- npm

Install dependencies and create the local environment file:

```bash
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

Update `.env` before using email reminders:

```env
JWT_SECRET=replace-with-a-long-random-secret
PORT=3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

`EMAIL_PASSWORD` should be an app password, not a regular Gmail password.
Never commit `.env` or real credentials.

Run the backend:

```bash
npm run dev
```

The API is available at `http://localhost:3000`. Verify it is running with:

```text
GET http://localhost:3000/health
```

The SQLite database is stored locally in `campus_connect.db`. It is created
and updated by the backend database initialization code.

## Frontend setup

The frontend is in the `frontend` branch. Clone it separately:

```bash
git clone --branch frontend --single-branch https://github.com/Hassan-Shahid123/event-management-system.git event-management-frontend
cd event-management-frontend
npm install
npm run dev
```

The frontend's `vite.config.ts` does not set a custom port, so Vite uses its
default development port, `http://localhost:5173`, unless you override it.
The frontend is configured to call the backend at
`http://localhost:3000/api`, so start the backend first. See the
[frontend branch README](https://github.com/Hassan-Shahid123/event-management-system/blob/frontend/README.md)
for frontend-specific setup and commands.

To work with both applications, keep two directories:

```text
event-management-system/   # main branch: backend
event-management-frontend/ # frontend branch: React application
```

Do not copy the frontend files into the backend checkout or merge the
`frontend` branch into `main`; the branches are maintained separately.

## Useful commands

Backend:

```bash
npm run build       # TypeScript build and parser generation
npm test            # Jest tests
npm run lint        # ESLint
```

Frontend (run inside the frontend checkout):

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Project layout

```text
src/
  database/       SQLite connection and schema
  query/          notification-rule AST, grammar, parser, and interpreter
  repositories/   database access
  routes/         Express route modules
  services/       business logic and background schedulers
  utils/          validation, permissions, and shared helpers
```

## Development workflow

1. Start the backend from the `main` branch.
2. Clone and run the `frontend` branch in a second directory.
3. Use the frontend for normal user flows, or call the REST API directly.
4. Run the relevant build, test, and lint commands before pushing changes.
5. Keep backend changes on `main`/`dev` and frontend changes on `frontend`.
