/**
 * Venues Management Page (Admin only)
 */

import React, { useState, useEffect } from 'react';
import { venuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { Venue, VenueType } from '../types';
import './VenuesPage.css';

const VenuesPage: React.FC = () => {
  const { user } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [location, setLocation] = useState('');
  const [type, setType] = useState<VenueType>('CLASSROOM');
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadVenues();
  }, []);

  const loadVenues = async () => {
    try {
      setIsLoading(true);
      const data = await venuesAPI.getAll();
      setVenues(data);
    } catch (err: any) {
      setError('Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await venuesAPI.create({
        location,
        type,
        capacity: type === 'OPENAIR' ? undefined : capacity,
      });

      // Reset form
      setLocation('');
      setType('CLASSROOM');
      setCapacity(undefined);
      setShowCreateForm(false);
      
      alert('Venue created successfully!');
      loadVenues();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create venue');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('Are you sure you want to delete this venue?')) return;

    try {
      await venuesAPI.delete(id);
      alert('Venue deleted successfully');
      loadVenues();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete venue');
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="error-message">
        Only administrators can manage venues.
      </div>
    );
  }

  if (isLoading) {
    return <div className="loading">Loading venues...</div>;
  }

  return (
    <div className="venues-page">
      <div className="page-header">
        <h1>Venue Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add New Venue'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showCreateForm && (
        <div className="create-venue-form">
          <h2>Create New Venue</h2>
          <form onSubmit={handleCreateVenue}>
            <div className="form-group">
              <label htmlFor="location">Location *</label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                placeholder="e.g., Main Hall, Room 101"
              />
            </div>

            <div className="form-group">
              <label htmlFor="type">Venue Type *</label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as VenueType)}
                required
              >
                <option value="LAB">Lab</option>
                <option value="EXAM_HALL">Exam Hall</option>
                <option value="LECTURE_HALL">Lecture Hall</option>
                <option value="SMART_CLASSROOM">Smart Classroom</option>
                <option value="CLASSROOM">Classroom</option>
                <option value="MEETING_HALL">Meeting Hall</option>
                <option value="OPENAIR">Open Air</option>
                <option value="SEMINAR">Seminar</option>
                <option value="AUDITORIUM">Auditorium</option>
                <option value="CAFE">Cafe</option>
              </select>
            </div>

            {type !== 'OPENAIR' && (
              <div className="form-group">
                <label htmlFor="capacity">Capacity *</label>
                <input
                  type="number"
                  id="capacity"
                  value={capacity || ''}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  required
                  min="1"
                  placeholder="Maximum number of people"
                />
              </div>
            )}

            <button type="submit" disabled={formLoading} className="btn-primary">
              {formLoading ? 'Creating...' : 'Create Venue'}
            </button>
          </form>
        </div>
      )}

      <div className="venues-list">
        <h2>All Venues ({venues.length})</h2>
        {venues.length === 0 ? (
          <div className="no-venues">No venues available</div>
        ) : (
          <div className="venues-grid">
            {venues.map((venue) => (
              <div key={venue.id} className="venue-card">
                <div className="venue-header">
                  <h3>{venue.location}</h3>
                  <button
                    onClick={() => handleDeleteVenue(venue.id)}
                    className="btn-danger-small"
                  >
                    Delete
                  </button>
                </div>
                <div className="venue-details">
                  <div><strong>Type:</strong> {venue.type}</div>
                  {venue.capacity && (
                    <div><strong>Capacity:</strong> {venue.capacity} people</div>
                  )}
                  {venue.type === 'OPENAIR' && (
                    <div><strong>Capacity:</strong> Unlimited</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VenuesPage;
