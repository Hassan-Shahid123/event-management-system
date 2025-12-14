# CampusConnect Frontend

React + TypeScript frontend for the CampusConnect Event Management System.

## Features

- **Authentication**: Login and registration with JWT token management
- **Event Management**: Browse, search, create, and manage campus events
- **Event Registration**: Register for events, view registration status (confirmed/waitlisted)
- **Venue Management**: Admin interface for managing venues
- **Role-Based Access**: Different features for Students, Organizers, and Admins

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Axios** - HTTP client for API calls
- **date-fns** - Date formatting

## Prerequisites

- Node.js 18+ 
- npm
- Backend server running on `http://localhost:3000`

## Installation

```bash
cd frontend
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```

The app will run on `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/         # Reusable components
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/           # React Context providers
│   │   └── AuthContext.tsx
│   ├── pages/             # Page components
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── EventsPage.tsx
│   │   ├── EventDetailsPage.tsx
│   │   ├── CreateEventPage.tsx
│   │   ├── MyRegistrationsPage.tsx
│   │   └── VenuesPage.tsx
│   ├── services/          # API service layer
│   │   └── api.ts
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx            # Main app component with routing
│   ├── main.tsx           # Entry point
│   └── *.css              # Styling
├── package.json
└── vite.config.ts
```

## User Roles & Permissions

### Student
- Browse and search events
- Register for events
- View registration status
- Unregister from events

### Organizer
- All Student permissions
- Create new events
- Edit/delete own events
- Change event status

### Admin
- All Organizer permissions
- Edit/delete any event
- Manage venues
- View all users

## API Integration

The frontend connects to the backend API at `http://localhost:3000/api`. Key endpoints:

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/events` - Get all events
- `POST /api/events` - Create event
- `POST /api/registrations` - Register for event
- `GET /api/venues` - Get all venues

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file if you need to change the API URL:

```env
VITE_API_URL=http://localhost:3000/api
```

Then update `src/services/api.ts`:

```typescript
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
```

## Development Workflow

1. Start backend server (port 3000)
2. Start frontend dev server: `npm run dev`
3. Navigate to `http://localhost:5173`
4. Login with test credentials or register a new account

## Troubleshooting

### CORS Errors
Make sure the backend has CORS enabled and allows requests from `http://localhost:5173`

### API Connection Failed
- Verify backend is running on port 3000
- Check `src/services/api.ts` baseURL configuration
- Inspect browser console for detailed error messages

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Create a pull request

## License

MIT
