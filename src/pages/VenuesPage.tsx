/**
 * Venues Management Page (Admin only)
 */

import React, { useState, useEffect } from 'react';
import { venuesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import type { Venue, VenueType } from '../types';
import './VenuesPage.css';

const VenuesPage: React.FC = () => {
  const { user } = useAuth();
  const notification = useNotification();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filteredVenues, setFilteredVenues] = useState<Venue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [location, setLocation] = useState('');
  const [type, setType] = useState<VenueType>('CLASSROOM');
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [formLoading, setFormLoading] = useState(false);
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState('');
  const [editType, setEditType] = useState<VenueType>('CLASSROOM');
  const [editCapacity, setEditCapacity] = useState<number | undefined>(undefined);

  useEffect(() => {
    loadVenues();
  }, []);

  useEffect(() => {
    // Filter venues based on search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredVenues(
        venues.filter(
          venue =>
            venue.location.toLowerCase().includes(term) ||
            venue.type.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredVenues(venues);
    }
  }, [searchTerm, venues]);

  const loadVenues = async () => {
    try {
      setIsLoading(true);
      const data = await venuesAPI.getAll();
      setVenues(data);
      setFilteredVenues(data);
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
      const newVenue = await venuesAPI.create({
        location,
        type,
        capacity: type === 'OPENAIR' ? undefined : capacity,
      });

      // Add new venue to state directly
      setVenues(prev => [...prev, newVenue]);

      // Reset form
      setLocation('');
      setType('CLASSROOM');
      setCapacity(undefined);
      setShowCreateForm(false);
      
      notification.success('Venue created successfully!');
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Failed to create venue');
    } finally {
      setFormLoading(false);
    }
  };

  const startEditVenue = (venue: Venue) => {
    setEditingVenueId(venue.id);
    setEditLocation(venue.location);
    setEditType(venue.type);
    setEditCapacity(venue.capacity || undefined);
  };

  const cancelEdit = () => {
    setEditingVenueId(null);
    setEditLocation('');
    setEditType('CLASSROOM');
    setEditCapacity(undefined);
  };

  const handleUpdateVenue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingVenueId) return;
    setFormLoading(true);

    try {
      const updatedVenue = await venuesAPI.update(editingVenueId, {
        location: editLocation,
        type: editType,
        capacity: editType === 'OPENAIR' ? undefined : editCapacity,
      });
      
      // Update venue in state directly
      setVenues(prev => prev.map(v => v.id === editingVenueId ? updatedVenue : v));
      
      notification.success('Venue updated successfully');
      cancelEdit();
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Failed to update venue');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVenue = async (id: string) => {
    try {
      await venuesAPI.delete(id);
      
      // Remove venue from state directly
      setVenues(prev => prev.filter(v => v.id !== id));
      
      notification.success('Venue deleted successfully');
    } catch (err: any) {
      notification.error(err.response?.data?.error || 'Failed to delete venue');
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
      <div className="venues-header">
        <h1>Venue Management</h1>
        <p className="subtitle">Manage campus venues and their availability</p>
      </div>

      <div className="venue-actions">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add New Venue'}
        </button>
      </div>

      {!showCreateForm && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search venues by location or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      )}

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

      {!showCreateForm && (
        <div className="venues-list">
          <h2>All Venues ({filteredVenues.length})</h2>
          {filteredVenues.length === 0 ? (
            <div className="no-venues">{searchTerm ? 'No venues found matching your search.' : 'No venues available'}</div>
          ) : (
            <div className="venues-grid">
              {filteredVenues.map((venue) => (
              <div key={venue.id} className="venue-card">
                <div className="venue-header">
                  <h3>{venue.location}</h3>
                  <div className="venue-actions">
                    {editingVenueId === venue.id ? (
                      <button onClick={cancelEdit} className="btn-secondary btn-compact" type="button">
                        Cancel
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditVenue(venue)}
                          className="btn-secondary btn-compact"
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVenue(venue.id)}
                          className="btn-danger-small"
                          type="button"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {editingVenueId === venue.id ? (
                  <form className="venue-edit-form" onSubmit={handleUpdateVenue}>
                    <div className="form-group">
                      <label htmlFor={`edit-location-${venue.id}`}>Location *</label>
                      <input
                        id={`edit-location-${venue.id}`}
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`edit-type-${venue.id}`}>Venue Type *</label>
                      <select
                        id={`edit-type-${venue.id}`}
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as VenueType)}
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

                    {editType !== 'OPENAIR' && (
                      <div className="form-group">
                        <label htmlFor={`edit-capacity-${venue.id}`}>Capacity *</label>
                        <input
                          id={`edit-capacity-${venue.id}`}
                          type="number"
                          value={editCapacity || ''}
                          onChange={(e) => setEditCapacity(Number(e.target.value))}
                          required
                          min="1"
                        />
                      </div>
                    )}
                    <div className="venue-actions">
                      <button onClick={cancelEdit} className="btn-secondary btn-compact" type="button">
                        Cancel
                      </button>
                      <button
                        className="btn-primary btn-compact"
                        type="submit"
                        disabled={formLoading}
                      >
                        {formLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="venue-details">
                    <div><strong>Type:</strong> {venue.type}</div>
                    {venue.capacity && (
                      <div><strong>Capacity:</strong> {venue.capacity} people</div>
                    )}
                    {venue.type === 'OPENAIR' && (
                      <div><strong>Capacity:</strong> Unlimited</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </div>
      )}
    </div>
  );
};

export default VenuesPage;
