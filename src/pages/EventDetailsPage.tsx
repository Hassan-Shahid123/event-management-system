/**
 * Event Details Page
 * Shows full event information with registration capability
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsAPI, venuesAPI, registrationsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import type { Event, Venue, User, RegistrationStatsResponse } from '../types';
import './EventDetailsPage.css';

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [stats, setStats] = useState<RegistrationStatsResponse | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadEventDetails();
    }
  }, [id]);

  const loadEventDetails = async () => {
    if (!id) {
      setError('Event ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const eventData = await eventsAPI.getById(id);
      setEvent(eventData);

      // Load venue
      const venueData = await venuesAPI.getById(eventData.venue_id);
      setVenue(venueData);

      // Load organizer
      const organizerData = await usersAPI.getById(eventData.organizer_id);
      setOrganizer(organizerData);

      // Load registration stats
      const statsData = await registrationsAPI.getEventStats(id);
      setStats(statsData);

      // Check if current user is registered
      if (user) {
        const userRegistrations = await registrationsAPI.getUserRegistrations(user.id);
        const registered = userRegistrations.some(reg => reg.event_id === id);
        setIsRegistered(registered);
      }
    } catch (err: any) {
      console.error('Failed to load event details:', err);
      setError(err.response?.data?.error || 'Failed to load event details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'STUDENT') {
      alert('Only students can register for events.');
      return;
    }

    if (!id) {
      alert('Event ID is missing');
      return;
    }

    try {
      setActionLoading(true);
      await registrationsAPI.register(id, user.id);
      setIsRegistered(true);
      await loadEventDetails(); // Refresh stats
      alert('Successfully registered for event!');
    } catch (err: any) {
      console.error('Registration error:', err);
      alert(err.response?.data?.error || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!user) return;

    if (!id) {
      alert('Event ID is missing');
      return;
    }

    if (!confirm('Are you sure you want to unregister from this event?')) return;

    try {
      setActionLoading(true);
      await registrationsAPI.unregister(id, user.id);
      setIsRegistered(false);
      await loadEventDetails(); // Refresh stats
      alert('Successfully unregistered from event');
    } catch (err: any) {
      console.error('Unregister error:', err);
      alert(err.response?.data?.error || 'Unregister failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || !event) return;

    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

    try {
      setActionLoading(true);
      await eventsAPI.delete(event.id, user.id);
      alert('Event deleted successfully');
      navigate('/events');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delete failed');
      setActionLoading(false);
    }
  };

  const canEditEvent = () => {
    if (!user || !event) return false;
    return user.role === 'ADMIN' || event.organizer_id === user.id;
  };

  const isStudent = user?.role === 'STUDENT';

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'EEEE, MMMM dd, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return <div className="loading">Loading event details...</div>;
  }

  if (error || !event) {
    return <div className="error-message">{error || 'Event not found'}</div>;
  }

  return (
    <div className="event-details-page">
      <div className="event-details-card">
        <div className="event-header">
          <div>
            <h1>{event.title}</h1>
            <span className={`status-badge status-${event.status.toLowerCase()}`}>
              {event.status}
            </span>
          </div>
          {canEditEvent() && (
            <div className="event-actions">
              <Link to={`/events/${event.id}/edit`} className="btn-secondary">
                Edit Event
              </Link>
              <button
                onClick={handleDeleteEvent}
                className="btn-danger"
                disabled={actionLoading}
              >
                Delete Event
              </button>
            </div>
          )}
        </div>

        <div className="event-content">
          <section className="event-section">
            <h2>Description</h2>
            <p>{event.description}</p>
          </section>

          <section className="event-section">
            <h2>Date & Time</h2>
            <div className="datetime-info">
              <div>
                <strong>Starts:</strong> {formatDateTime(event.start_datetime)}
              </div>
              <div>
                <strong>Ends:</strong> {formatDateTime(event.end_datetime)}
              </div>
            </div>
          </section>

          <section className="event-section">
            <h2>Venue</h2>
            {venue && (
              <div>
                <div><strong>Location:</strong> {venue.location}</div>
                <div><strong>Type:</strong> {venue.type}</div>
                {venue.capacity && (
                  <div><strong>Capacity:</strong> {venue.capacity} people</div>
                )}
              </div>
            )}
          </section>

          <section className="event-section">
            <h2>Organizer</h2>
            {organizer && (
              <div>
                <div><strong>Name:</strong> {organizer.name}</div>
                <div><strong>Email:</strong> {organizer.email}</div>
              </div>
            )}
          </section>

          <section className="event-section">
            <h2>Registration Status</h2>
            {stats && (
              <div className="registration-stats">
                <div>
                  <strong>Confirmed:</strong> {stats.confirmed}
                </div>
                <div>
                  <strong>Waitlisted:</strong> {stats.waitlisted}
                </div>
                <div>
                  <strong>Total Registered:</strong> {stats.total}
                </div>
                {stats.capacity && (
                  <div>
                    <strong>Available Spots:</strong> {Math.max(0, stats.capacity - stats.confirmed)}
                  </div>
                )}
              </div>
            )}
          </section>

          {user && event.status === 'UPCOMING' && isStudent && (
            <div className="registration-actions">
              {isRegistered ? (
                <button
                  onClick={handleUnregister}
                  className="btn-danger"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Unregister from Event'}
                </button>
              ) : (
                <button
                  onClick={handleRegister}
                  className="btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Processing...' : 'Register for Event'}
                </button>
              )}
            </div>
          )}

          {user && event.status === 'UPCOMING' && !isStudent && (
            <div className="info-message">
              Registration is available to students only.
            </div>
          )}

          {event.status !== 'UPCOMING' && (
            <div className="info-message">
              Registration is closed for this event.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
