/**
 * REST API Server
 * 
 * Main Express application setup with route mounting.
 */

import express from 'express';
import cors from 'cors';
import {
  authRoutes,
  userRoutes,
  venueRoutes,
  eventRoutes,
  registrationRoutes
} from './routes';
import { getDatabase, seedDatabase } from './database';
import { getAllVenues } from './repositories/venueRepository';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'CampusConnect API is running' });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);

// Initialize database and start server
async function startServer() {
  try {
    await getDatabase();
    
    // Check if database needs seeding
    const venues = await getAllVenues();
    if (venues.length === 0) {
      console.log('Database is empty. Seeding with initial data...');
      await seedDatabase();
    }
    
    app.listen(PORT, () => {
      console.log(`CampusConnect API Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
}

startServer();

export default app;
