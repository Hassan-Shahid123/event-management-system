/**
 * REST API Server
 */
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import {
  authRoutes,
  userRoutes,
  venueRoutes,
  eventRoutes,
  registrationRoutes,
  notificationRuleRoutes
} from './routes';
import { startStatusScheduler } from './services/statusScheduler';
import { startScheduler as startReminderScheduler } from './services/reminderScheduler';

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
app.use('/api/notification-rules', notificationRuleRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`CampusConnect API Server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  // Start background status synchronizer
  startStatusScheduler();
  // Start email reminder scheduler (every 1 minute for testing)
  startReminderScheduler(60000); // 60000ms = 1 minute
});

export default app;
