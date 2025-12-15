/**
 * Users Page
 * Displays approved organizers and students for admin management
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import './UsersPage.css';

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const [organizersData, studentsData] = await Promise.all([
        usersAPI.getApprovedOrganizers(),
        usersAPI.getStudents()
      ]);
      setOrganizers(organizersData);
      setStudents(studentsData);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}'s account? They will not be able to login anymore.`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.delete(userId);
      setOrganizers(prev => prev.filter(u => u.id !== userId));
      setStudents(prev => prev.filter(u => u.id !== userId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="users-page">
        <div className="error-banner">You do not have permission to view this page.</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <h1>Users Management</h1>
        <p className="subtitle">Manage approved organizers and registered students</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : (
        <>
          {/* Approved Organizers Section */}
          <div className="users-section">
            <h2 className="section-title">Approved Organizers ({organizers.length})</h2>
            {organizers.length === 0 ? (
              <div className="empty-state-small">
                <p>No approved organizers found.</p>
              </div>
            ) : (
              <div className="users-list">
                {organizers.map((organizer) => (
                  <div key={organizer.id} className="user-card">
                    <div className="user-info">
                      <h3>{organizer.name}</h3>
                      <p className="user-email">{organizer.email}</p>
                      <p className="user-date">Joined: {formatDate(organizer.created_at)}</p>
                      <div className="user-meta">
                        <span className="badge badge-organizer">Organizer</span>
                        <span className="meta-item">
                          <strong>User ID:</strong> {organizer.id}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(organizer.id, organizer.name)}
                        disabled={deletingIds.has(organizer.id)}
                      >
                        {deletingIds.has(organizer.id) ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Students Section */}
          <div className="users-section">
            <h2 className="section-title">Students ({students.length})</h2>
            {students.length === 0 ? (
              <div className="empty-state-small">
                <p>No students found.</p>
              </div>
            ) : (
              <div className="users-list">
                {students.map((student) => (
                  <div key={student.id} className="user-card">
                    <div className="user-info">
                      <h3>{student.name}</h3>
                      <p className="user-email">{student.email}</p>
                      <p className="user-date">Joined: {formatDate(student.created_at)}</p>
                      <div className="user-meta">
                        <span className="badge badge-student">Student</span>
                        <span className="meta-item">
                          <strong>User ID:</strong> {student.id}
                        </span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(student.id, student.name)}
                        disabled={deletingIds.has(student.id)}
                      >
                        {deletingIds.has(student.id) ? 'Deleting...' : '🗑️ Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default UsersPage;
