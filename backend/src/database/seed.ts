/**
 * Database Seed Data
 * Populates the database with initial data for testing
 */

import { createVenue } from '../repositories/venueRepository';
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
 * Seeds all initial data
 */
export async function seedDatabase(): Promise<void> {
  await seedVenues();
}
