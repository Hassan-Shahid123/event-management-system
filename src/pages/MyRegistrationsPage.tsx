/**
 * My Registrations Page
 * Shows user's registered events
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { registrationsAPI, eventsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import type { EventRegistration, Event } from '../types';
import './MyRegistrationsPage.css';

interface EventWithRegistration {
  event: Event;
  registration: EventRegistration;
}

const MyRegistrationsPage: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<EventWithRegistration[]>([]);
  const [filteredRegistrations, setFilteredRegistrations] = useState<EventWithRegistration[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadRegistrations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Filter registrations based on search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredRegistrations(
        registrations.filter(
          ({ event }) =>
            event.title.toLowerCase().includes(term) ||
            event.description.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredRegistrations(registrations);
    }
  }, [searchTerm, registrations]);

  const loadRegistrations = async () => {
    if (!user) {
      setError('User not logged in');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const regs = await registrationsAPI.getUserRegistrations(user.id);
      
      // Load event details for each registration
      const withEvents = await Promise.all(
        regs.map(async (reg) => {
          try {
            const event = await eventsAPI.getById(reg.event_id);
            return { event, registration: reg };
          } catch (err) {
            console.error(`Failed to load event ${reg.event_id}:`, err);
            return null;
          }
        })
      );

      // Filter out failed event loads
      setRegistrations(withEvents.filter(item => item !== null) as any[]);
      setFilteredRegistrations(withEvents.filter(item => item !== null) as any[]);
    } catch (err: any) {
      console.error('Failed to load registrations:', err);
      setError(err.response?.data?.error || 'Failed to load registrations');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return <div className="loading">Loading your registrations...</div>;
  }

  return (
    <div className="my-registrations-page">
      <div className="registrations-header">
        <h1>My Registrations</h1>
        <p className="subtitle">View and manage your event registrations</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search events by title or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredRegistrations.length === 0 ? (
        <div className="no-registrations">
          <p>{searchTerm ? 'No registrations found matching your search.' : "You haven't registered for any events yet."}</p>
          <Link to="/events" className="btn-primary">
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="registrations-list">
          {filteredRegistrations.map(({ event, registration }) => (
            <Link
              to={`/events/${event.id}`}
              key={registration.id}
              className="registration-card"
            >
              <div className="registration-header">
                <h3>{event.title}</h3>
                <span className={`status-badge status-${event.status.toLowerCase()}`}>
                  {event.status}
                </span>
              </div>
              
              <p className="event-description">{event.description}</p>
              
              <div className="registration-details">
                <div>
                  <strong>Registration Status:</strong>{' '}
                  <span className={`reg-status ${registration.status.toLowerCase()}`}>
                    {registration.status}
                  </span>
                </div>
                <div>
                  <strong>Start:</strong> {formatDateTime(event.start_datetime)}
                </div>
                <div>
                  <strong>Registered:</strong> {formatDateTime(registration.registered_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyRegistrationsPage;
