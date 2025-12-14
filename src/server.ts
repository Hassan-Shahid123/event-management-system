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
import { startStatusScheduler } from './services/statusScheduler';

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

// Start server
app.listen(PORT, () => {
  console.log(`CampusConnect API Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  // Start background status synchronizer
  startStatusScheduler();
});

export default app;
