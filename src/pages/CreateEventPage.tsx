/**
 * Create Event Page
 * Form to create a new event (ORGANIZER/ADMIN only)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI, venuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Venue } from '../types';
import './CreateEventPage.css';

const CreateEventPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const notification = useNotification();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    if (startDatetime && endDatetime) {
      checkVenueAvailability();
    } else {
      setAvailableVenues(venues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDatetime, endDatetime, venues]);

  const loadVenues = async () => {
    try {
      const data = await venuesAPI.getAll();
      setVenues(data);
      setAvailableVenues(data);
    } catch {
      setError('Failed to load venues');
    }
  };

  const checkVenueAvailability = async () => {
    // Validate datetime inputs before making API call
    if (!startDatetime || !endDatetime) {
      setAvailableVenues(venues);
      return;
    }

    const startDate = new Date(startDatetime);
    const endDate = new Date(endDatetime);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setAvailableVenues(venues);
      return;
    }

    // Check if end is after start
    if (endDate <= startDate) {
      setAvailableVenues(venues);
      return;
    }

    try {
      setCheckingAvailability(true);
      // Convert datetime-local format to ISO string
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const available = await venuesAPI.getAvailable(startISO, endISO);
      setAvailableVenues(available);
    } catch {
      setAvailableVenues(venues);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in');
      return;
    }

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      setError('End time must be after start time');
      return;
    }

    setIsLoading(true);

    try {
      // Convert datetime-local format to ISO string
      const startISO = new Date(startDatetime).toISOString();
      const endISO = new Date(endDatetime).toISOString();
      
      const event = await eventsAPI.create({
        title,
        description,
        start_datetime: startISO,
        end_datetime: endISO,
        venue_id: venueId,
        organizer_id: user.id,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      notification.success('Event created successfully!');
      navigate(`/events/${event.id}`);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create event';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role !== 'ORGANIZER' && user?.role !== 'ADMIN') {
    return (
      <div className="error-message">
        You must be an Organizer or Admin to create events.
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="form-container">
        <h1>Create New Event</h1>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Event Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Tech Workshop 2025"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Describe your event..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDatetime">Start Date & Time *</label>
              <input
                type="datetime-local"
                id="startDatetime"
                value={startDatetime}
                onChange={(e) => setStartDatetime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDatetime">End Date & Time *</label>
              <input
                type="datetime-local"
                id="endDatetime"
                value={endDatetime}
                onChange={(e) => setEndDatetime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="venue">Venue *</label>
            {checkingAvailability && (
              <div className="info-message">Checking venue availability...</div>
            )}
            {!checkingAvailability && startDatetime && endDatetime && (
              <div className="info-message">
                Showing {availableVenues.length} available venue(s) for selected time
              </div>
            )}
            <select
              id="venue"
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              required
            >
              <option value="">Select a venue</option>
              {availableVenues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.location} - {venue.type} 
                  {venue.capacity && ` (Capacity: ${venue.capacity})`}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary">
              {isLoading ? 'Creating...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEventPage;
