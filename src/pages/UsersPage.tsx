/**
 * Users Page
 * Displays approved organizers and students for admin management
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import './UsersPage.css';

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const notification = useNotification();
  const [organizers, setOrganizers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredOrganizers(
        organizers.filter(
          org => 
            org.name.toLowerCase().includes(term) || 
            org.email.toLowerCase().includes(term)
        )
      );
      setFilteredStudents(
        students.filter(
          student => 
            student.name.toLowerCase().includes(term) || 
            student.email.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredOrganizers(organizers);
      setFilteredStudents(students);
    }
  }, [searchTerm, organizers, students]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const [organizersData, studentsData] = await Promise.all([
        usersAPI.getApprovedOrganizers(),
        usersAPI.getStudents()
      ]);
      setOrganizers(organizersData);
      setStudents(studentsData);
      
      // Fetch admin details for organizers (who were approved by admins)
      const adminIds = new Set(
        organizersData
          .filter(org => org.approved_by)
          .map(org => org.approved_by!)
      );
      
      const adminMap = new Map<string, User>();
      await Promise.all(
        Array.from(adminIds).map(async (adminId) => {
          try {
            const admin = await usersAPI.getById(adminId);
            adminMap.set(adminId, admin);
          } catch (err) {
            console.error('Failed to fetch admin:', adminId);
          }
        })
      );
      
      setAdmins(adminMap);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreeze = async (userId: string, userName: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.freezeUser(userId);
      
      // Update state directly without refetching
      setOrganizers(prev => prev.map(org => 
        org.id === userId ? { ...org, deleted: 1 as number, deleted_at: new Date().toISOString() } : org
      ));
      setStudents(prev => prev.map(student => 
        student.id === userId ? { ...student, deleted: 1 as number, deleted_at: new Date().toISOString() } : student
      ));
      
      notification.success(`${userName}'s account has been frozen successfully.`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      notification.error(error.response?.data?.error || 'Failed to freeze user');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleUnfreeze = async (userId: string, userName: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.unfreezeUser(userId);
      
      // Update state directly without refetching
      setOrganizers(prev => prev.map(org => 
        org.id === userId ? { ...org, deleted: 0 as number, deleted_at: undefined } : org
      ));
      setStudents(prev => prev.map(student => 
        student.id === userId ? { ...student, deleted: 0 as number, deleted_at: undefined } : student
      ));
      
      notification.success(`${userName}'s account has been unfrozen successfully.`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      notification.error(error.response?.data?.error || 'Failed to unfreeze user');
    } finally {
      setProcessingIds(prev => {
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

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
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
            <h2 className="section-title">Approved Organizers ({filteredOrganizers.length})</h2>
            {filteredOrganizers.length === 0 ? (
              <div className="empty-state-small">
                <p>{searchTerm ? 'No organizers found matching your search' : 'No approved organizers found.'}</p>
              </div>
            ) : (
              <div className="users-list">
                {filteredOrganizers.map((organizer) => (
                  <div key={organizer.id} className="user-card">
                    <div className="user-info">
                      <h3>{organizer.name}</h3>
                      <p className="user-email">{organizer.email}</p>
                      <p className="user-date">Joined: {formatDate(organizer.created_at)}</p>
                      <div className="user-meta">
                        <span className="badge badge-organizer">Organizer</span>
                        {organizer.deleted === 1 && (
                          <span className="badge badge-frozen">FROZEN</span>
                        )}
                      </div>
                      {organizer.approved_by && admins.get(organizer.approved_by) && (
                        <div className="admin-info">
                          <strong>Approved by:</strong> {admins.get(organizer.approved_by)?.name} ({admins.get(organizer.approved_by)?.email})
                        </div>
                      )}
                    </div>
                    <div className="user-actions">
                      {organizer.deleted === 1 ? (
                        <button
                          className="btn-unfreeze"
                          onClick={() => handleUnfreeze(organizer.id, organizer.name)}
                          disabled={processingIds.has(organizer.id)}
                        >
                          {processingIds.has(organizer.id) ? 'Processing...' : '🔓 Unfreeze'}
                        </button>
                      ) : (
                        <button
                          className="btn-freeze"
                          onClick={() => handleFreeze(organizer.id, organizer.name)}
                          disabled={processingIds.has(organizer.id)}
                        >
                          {processingIds.has(organizer.id) ? 'Processing...' : '❄️ Freeze'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Students Section */}
          <div className="users-section">
            <h2 className="section-title">Students ({filteredStudents.length})</h2>
            {filteredStudents.length === 0 ? (
              <div className="empty-state-small">
                <p>{searchTerm ? 'No students found matching your search' : 'No students found.'}</p>
              </div>
            ) : (
              <div className="users-list">
                {filteredStudents.map((student) => (
                  <div key={student.id} className="user-card">
                    <div className="user-info">
                      <h3>{student.name}</h3>
                      <p className="user-email">{student.email}</p>
                      <p className="user-date">Joined: {formatDate(student.created_at)}</p>
                      <div className="user-meta">
                        <span className="badge badge-student">Student</span>
                        {student.deleted === 1 && (
                          <span className="badge badge-frozen">FROZEN</span>
                        )}
                      </div>
                    </div>
                    <div className="user-actions">
                      {student.deleted === 1 ? (
                        <button
                          className="btn-unfreeze"
                          onClick={() => handleUnfreeze(student.id, student.name)}
                          disabled={processingIds.has(student.id)}
                        >
                          {processingIds.has(student.id) ? 'Processing...' : '🔓 Unfreeze'}
                        </button>
                      ) : (
                        <button
                          className="btn-freeze"
                          onClick={() => handleFreeze(student.id, student.name)}
                          disabled={processingIds.has(student.id)}
                        >
                          {processingIds.has(student.id) ? 'Processing...' : '❄️ Freeze'}
                        </button>
                      )}
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
