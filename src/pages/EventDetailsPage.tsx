/**
 * Event Details Page
 * Shows full event information with registration capability
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { eventsAPI, venuesAPI, registrationsAPI, usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { format } from 'date-fns';
import type { Event, Venue, User, RegistrationStatsResponse, EventRegistrationWithUser } from '../types';
import './EventDetailsPage.css';

const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const notification = useNotification();

  const [event, setEvent] = useState<Event | null>(null);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [organizer, setOrganizer] = useState<User | null>(null);
  const [stats, setStats] = useState<RegistrationStatsResponse | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<EventRegistrationWithUser[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadEventDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

        // If user is the organizer of this event, load registered users list
        if (eventData.organizer_id === user.id) {
          console.log('Loading registered users for organizer. Event ID:', id, 'User ID:', user.id);
          try {
            const registrationsWithUsers = await registrationsAPI.getEventRegistrationsWithUsers(id, user.id);
            console.log('Registered users loaded:', registrationsWithUsers);
            setRegisteredUsers(registrationsWithUsers);
          } catch (err) {
            console.error('Failed to load registered users:', err);
          }
        } else {
          console.log('User is not the organizer. Event organizer_id:', eventData.organizer_id, 'User id:', user.id);
        }
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

    if (!id) {
      notification.error('Event ID is missing');
      return;
    }

    try {
      setActionLoading(true);
      await registrationsAPI.register(id, user.id);
      setIsRegistered(true);
      await loadEventDetails(); // Refresh stats
      notification.success('Successfully registered for event!');
    } catch (err: any) {
      console.error('Registration error:', err);
      notification.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnregister = async () => {
    if (!user) return;

    if (!id) {
      notification.error('Event ID is missing');
      return;
    }

    try {
      setActionLoading(true);
      await registrationsAPI.unregister(id, user.id);
      setIsRegistered(false);
      await loadEventDetails(); // Refresh stats
      notification.info('Successfully unregistered from event');
    } catch (err: any) {
      console.error('Unregister error:', err);
      notification.error(err.response?.data?.error || 'Unregister failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || !event) return;

    try {
      setActionLoading(true);
      await eventsAPI.delete(event.id, user.id);
      notification.success('Event deleted successfully');
      navigate('/events');
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Delete failed');
      setActionLoading(false);
    }
  };

  const canEditEvent = () => {
    if (!user || !event) return false;
    return user.role === 'ADMIN' || event.organizer_id === user.id;
  };

  const isOrganizer = () => {
    if (!user || !event) return false;
    return event.organizer_id === user.id;
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
          <section className="event-section full-width">
            <h2>Description</h2>
            <p>{event.description}</p>
          </section>

          <div className="info-grid">
            <section className="event-section">
              <h2>Date & Time</h2>
              <div className="info-list">
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
                <div className="info-list">
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
                <div className="info-list">
                  <div><strong>Name:</strong> {organizer.name}</div>
                  <div><strong>Email:</strong> {organizer.email}</div>
                </div>
              )}
            </section>

            <section className="event-section">
              <h2>Registration Status</h2>
              {stats && (
                <div className="info-list">
                  <div>
                    <strong>Confirmed:</strong> {stats.confirmed}
                  </div>
                  <div>
                    <strong>Waitlisted:</strong> {stats.waitlisted}
                  </div>
                  <div>
                    <strong>Total:</strong> {stats.total}
                  </div>
                  {stats.capacity && (
                    <div>
                      <strong>Available:</strong> {Math.max(0, stats.capacity - stats.confirmed)}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {user && event.status === 'UPCOMING' && (
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

          {event.status !== 'UPCOMING' && (
            <div className="info-message">
              Registration is closed for this event.
            </div>
          )}

          {isOrganizer() && (
            <div className="registered-users-section">
              <h2>Registered Participants ({registeredUsers.length})</h2>
              {registeredUsers.length === 0 ? (
                <div className="info-message">No participants registered yet.</div>
              ) : (
                <div className="registered-users-list">
                  {registeredUsers.map((reg) => (
                    <div key={reg.id} className="registered-user-card">
                      <div className="user-info">
                        <div className="user-name">{reg.user.name}</div>
                        <div className="user-email">{reg.user.email}</div>
                      </div>
                      <div className="registration-info">
                        <span className={`status-badge status-${reg.status.toLowerCase()}`}>
                          {reg.status}
                        </span>
                        <div className="registered-date">
                          {format(new Date(reg.registered_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPage;
