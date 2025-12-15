/**
 * Database Seed Data
 * Populates the database with initial data for testing
 */

import { createVenue } from '../repositories/venueRepository';
import { createRule } from '../repositories/notificationRuleRepository';
import { VenueType } from '../types';

/**
 * Seeds the database with initial venue data
 */
export async function seedVenues(): Promise<void> {
  console.log('Seeding venues...');

  const venues = [
    { location: 'Main Auditorium', type: 'AUDITORIUM' as VenueType, capacity: 500 },
    { location: 'Lecture Hall A', type: 'LECTURE_HALL' as VenueType, capacity: 200 },
    { location: 'Lecture Hall B', type: 'LECTURE_HALL' as VenueType, capacity: 150 },
    { location: 'Smart Classroom 101', type: 'SMART_CLASSROOM' as VenueType, capacity: 50 },
    { location: 'Smart Classroom 102', type: 'SMART_CLASSROOM' as VenueType, capacity: 50 },
    { location: 'Computer Lab 1', type: 'LAB' as VenueType, capacity: 40 },
    { location: 'Computer Lab 2', type: 'LAB' as VenueType, capacity: 40 },
    { location: 'Seminar Room 201', type: 'SEMINAR' as VenueType, capacity: 30 },
    { location: 'Conference Hall', type: 'MEETING_HALL' as VenueType, capacity: 100 },
    { location: 'Exam Hall 1', type: 'EXAM_HALL' as VenueType, capacity: 300 },
    { location: 'Central Courtyard', type: 'OPENAIR' as VenueType, capacity: undefined },
    { location: 'Library Cafe', type: 'CAFE' as VenueType, capacity: 60 },
  ];

  try {
    for (const venue of venues) {
      await createVenue(venue);
    }
    console.log(`✓ Seeded ${venues.length} venues`);
  } catch (error) {
    console.error('Error seeding venues:', error);
  }
}

/**
 * Seeds default notification rules (DSL examples)
 * Demonstrates little language functionality
 */
export async function seedNotificationRules(adminUserId: string): Promise<void> {
  console.log('Seeding notification rules...');

  const defaultRules = [
    {
      name: '24h Email Reminder',
      description: 'Send email reminder 24 hours before event starts',
      rule_text: 'SEND email WHEN hours_until = 24',
      enabled: true
    },
    {
      name: '1h Multi-Channel Alert',
      description: 'Send reminder via all channels 1 hour before event',
      rule_text: 'SEND email, sms, push WHEN hours_until = 1',
      enabled: true
    },
    {
      name: 'Large Event Early Alert',
      description: 'Send early reminder for events with capacity over 100',
      rule_text: 'SEND email, push WHEN hours_until = 36 AND capacity > 100',
      enabled: false // Disabled by default
    },
    {
      name: 'Last Minute Reminder',
      description: 'Push notification 30 minutes before event with available seats',
      rule_text: 'SEND push WHEN minutes_until = 30 AND available_seats > 0',
      enabled: false
    },
    {
      name: 'Weekly Reminder for Paid Events',
      description: 'Email reminder 7 days before for events with admission fee',
      rule_text: 'SEND email WHEN days_until = 7 AND price > 0',
      enabled: false
    }
  ];

  try {
    for (const rule of defaultRules) {
      await createRule({
        ...rule,
        created_by: adminUserId
      });
    }
    console.log(`✓ Seeded ${defaultRules.length} notification rules`);
  } catch (error) {
    console.error('Error seeding notification rules:', error);
  }
}

/**
 * Seeds all initial data
 * 
 * @param adminUserId Optional admin user ID for creating notification rules
 */
export async function seedDatabase(adminUserId?: string): Promise<void> {
  await seedVenues();
  if (adminUserId) {
    await seedNotificationRules(adminUserId);
  }
}
