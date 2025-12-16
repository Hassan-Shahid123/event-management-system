/**
 * Events List Page
 * Displays all events with search functionality
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { eventsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import type { Event } from '../types';
import './EventsPage.css';

const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { user } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      performSearch();
    } else {
      setFilteredEvents(events);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, events]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await eventsAPI.getAll();
      setEvents(data);
      setFilteredEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  };

  const performSearch = async () => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setFilteredEvents(events);
      return;
    }

    try {
      const results = await eventsAPI.search(searchTerm);
      setFilteredEvents(results);
    } catch (err: any) {
      console.error('Search failed:', err);
      // Fallback to client-side filtering
      const filtered = events.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  const getStatusClass = (status: string) => {
    return `status-badge status-${status.toLowerCase()}`;
  };

  if (isLoading) {
    return <div className="loading">Loading events...</div>;
  }

  return (
    <div className="events-page">
      <div className="events-header">
        <h1>Campus Events</h1>
        <p className="subtitle">Discover and register for upcoming campus activities</p>
      </div>

      {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
        <div className="create-button-wrapper">
          <Link to="/events/create" className="btn-primary">
            Create Event
          </Link>
        </div>
      )}

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search events by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      {filteredEvents.length === 0 ? (
        <div className="no-events">
          {searchTerm ? 'No events found matching your search' : 'No events available'}
        </div>
      ) : (
        <div className="events-grid">
          {filteredEvents.map((event) => {
            const canEdit = user?.role === 'ORGANIZER' || user?.role === 'ADMIN';
            return (
              <div key={event.id} className="event-card">
                <div className="event-header">
                  <Link to={`/events/${event.id}`} className="event-title-link">
                    <h3>{event.title}</h3>
                  </Link>
                  <span className={getStatusClass(event.status)}>{event.status}</span>
                </div>
                <p className="event-description">{event.description}</p>
                <div className="event-details">
                  <div className="event-datetime">
                    <strong>Start:</strong> {formatDateTime(event.start_datetime)}
                  </div>
                  <div className="event-datetime">
                    <strong>End:</strong> {formatDateTime(event.end_datetime)}
                  </div>
                </div>
                <div className="event-actions">
                  <Link to={`/events/${event.id}`} className="btn-secondary btn-compact">
                    View Details
                  </Link>
                  {canEdit && (
                    <Link to={`/events/${event.id}/edit`} className="btn-primary btn-compact">
                      Edit Event
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventsPage;
