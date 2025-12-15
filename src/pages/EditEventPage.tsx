/**
 * Edit Event Page
 * Form to edit an existing event (ORGANIZER/ADMIN only)
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsAPI, venuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Event, Venue } from '../types';
import './EditEventPage.css';

const EditEventPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [venueId, setVenueId] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [availableVenues, setAvailableVenues] = useState<Venue[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (id) {
      loadEventAndVenues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (startDatetime && endDatetime && event) {
      checkVenueAvailability();
    } else {
      setAvailableVenues(venues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDatetime, endDatetime, venues, event]);

  const loadEventAndVenues = async () => {
    if (!id) {
      setError('Event ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Load event data
      const eventData = await eventsAPI.getById(id);
      setEvent(eventData);

      // Check permissions
      if (user && user.role !== 'ADMIN' && eventData.organizer_id !== user.id) {
        setError('You do not have permission to edit this event');
        setIsLoading(false);
        return;
      }

      // Pre-populate form fields
      setTitle(eventData.title);
      setDescription(eventData.description);
      
      // Convert ISO strings to datetime-local format
      const startDate = new Date(eventData.start_datetime);
      const endDate = new Date(eventData.end_datetime);
      setStartDatetime(formatDateTimeLocal(startDate));
      setEndDatetime(formatDateTimeLocal(endDate));
      setVenueId(eventData.venue_id);

      // Load venues
      const venuesData = await venuesAPI.getAll();
      setVenues(venuesData);
      setAvailableVenues(venuesData);

    } catch (err: any) {
      console.error('Failed to load event:', err);
      setError(err.response?.data?.error || 'Failed to load event');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const checkVenueAvailability = async () => {
    if (!startDatetime || !endDatetime || !event) {
      setAvailableVenues(venues);
      return;
    }

    const startDate = new Date(startDatetime);
    const endDate = new Date(endDatetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      setAvailableVenues(venues);
      return;
    }

    if (endDate <= startDate) {
      setAvailableVenues(venues);
      return;
    }

    try {
      setCheckingAvailability(true);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      
      // Get available venues excluding current event
      const available = await venuesAPI.getAvailable(startISO, endISO);
      
      // Include current venue even if it appears unavailable
      // (since the current event is occupying it)
      const currentVenue = venues.find(v => v.id === event.venue_id);
      if (currentVenue && !available.find(v => v.id === currentVenue.id)) {
        setAvailableVenues([...available, currentVenue]);
      } else {
        setAvailableVenues(available);
      }
    } catch (err) {
      console.error('Failed to check venue availability:', err);
      setAvailableVenues(venues);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user || !id) {
      setError('You must be logged in');
      return;
    }

    if (new Date(endDatetime) <= new Date(startDatetime)) {
      setError('End time must be after start time');
      return;
    }

    setIsSaving(true);

    try {
      const startISO = new Date(startDatetime).toISOString();
      const endISO = new Date(endDatetime).toISOString();
      
      await eventsAPI.update(id, {
        title,
        description,
        start_datetime: startISO,
        end_datetime: endISO,
        venue_id: venueId,
        requestingUserId: user.id,
      });
      
      alert('Event updated successfully!');
      navigate(`/events/${id}`);
    } catch (err: any) {
      console.error('Error updating event:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update event';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="loading">Loading event...</div>;
  }

  if (error && !event) {
    return (
      <div className="error-message">
        {error}
      </div>
    );
  }

  if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) {
    return (
      <div className="error-message">
        You must be an Organizer or Admin to edit events.
      </div>
    );
  }

  return (
    <div className="edit-event-page">
      <div className="form-container">
        <h1>Edit Event</h1>

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
              onClick={() => navigate(`/events/${id}`)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="btn-primary">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditEventPage;
