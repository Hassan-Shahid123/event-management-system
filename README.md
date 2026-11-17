# CampusConnect Frontend

This branch contains the CampusConnect frontend, a React application written
in TypeScript and built with Vite. It provides the user interface for students,
organizers, and administrators.

## Requirements

- Node.js 20 or newer
- npm
- The CampusConnect backend running from the `main` branch

## Setup

Clone this branch into its own directory:

```bash
git clone --branch frontend --single-branch https://github.com/Hassan-Shahid123/event-management-system.git event-management-frontend
cd event-management-frontend
npm install
npm run dev
```

The Vite configuration does not define a custom port, so Vite uses its
standard development port, `http://localhost:5173`, unless you override it
with a command-line option such as `npm run dev -- --port 5174`.

The frontend API client is configured in
[`src/services/api.ts`](src/services/api.ts) to call:

```text
http://localhost:3000/api
```

Start the backend before using the frontend:

```bash
cd ../event-management-system
npm install
copy .env.example .env
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

## Features

- Login and registration
- Event browsing, searching, creation, editing, and details
- Event registration and personal registration history
- Venue management
- User and organizer-request management
- Notification display and notification-rule management
- Protected routes based on authentication and user role

## Useful commands

```bash
npm run dev       # Start the Vite development server
npm run build     # Type-check and create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## Project layout

```text
src/
  components/     Shared UI components
  context/        Authentication and notification state
  pages/          Application screens and page styles
  services/       API client and backend integration
  types/          Shared TypeScript types
```

## Working with the backend

Keep the two branches in separate directories:

```text
event-management-system/   # main branch: backend API
event-management-frontend/ # frontend branch: React/Vite application
```

The frontend expects the backend health endpoint at
`http://localhost:3000/health` and API routes under
`http://localhost:3000/api`. If the backend uses another port, update the API
base URL in `src/services/api.ts` before starting the frontend.
