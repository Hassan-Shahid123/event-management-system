/**
 * Organizer Requests Page
 * Displays pending organizer requests for admin approval
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import './OrganizerRequestsPage.css';

const OrganizerRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const notification = useNotification();
  const [requests, setRequests] = useState<User[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [admins, setAdmins] = useState<Map<string, User>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    // Filter requests based on search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      setFilteredRequests(
        requests.filter(
          req => 
            req.name.toLowerCase().includes(term) || 
            req.email.toLowerCase().includes(term) ||
            req.status.toLowerCase().includes(term)
        )
      );
    } else {
      setFilteredRequests(requests);
    }
  }, [searchTerm, requests]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await usersAPI.getAllOrganizerRequests();
      setRequests(data);
      setFilteredRequests(data);
      
      // Fetch admin details for approved/rejected requests
      const adminIds = new Set(
        data
          .filter(req => req.approved_by)
          .map(req => req.approved_by!)
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
      setError(error.response?.data?.error || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.approveOrganizer(userId);
      
      // Update state directly without refetching
      setRequests(prev => prev.map(req => 
        req.id === userId ? { ...req, status: 'APPROVED', approved_by: user?.id, approved_at: new Date().toISOString() } : req
      ));
      
      // Add current admin to admins map
      if (user) {
        setAdmins(prev => new Map(prev).set(user.id, user));
      }
      
      notification.success('Organizer request approved successfully!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      notification.error(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleReject = async (userId: string) => {
    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.rejectOrganizer(userId);
      
      // Update state directly without refetching
      setRequests(prev => prev.map(req => 
        req.id === userId ? { ...req, status: 'REJECTED', approved_by: user?.id, approved_at: new Date().toISOString() } : req
      ));
      
      // Add current admin to admins map
      if (user) {
        setAdmins(prev => new Map(prev).set(user.id, user));
      }
      
      notification.warning('Organizer request rejected.');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      notification.error(error.response?.data?.error || 'Failed to reject request');
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
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="requests-page">
        <div className="error-banner">You do not have permission to view this page.</div>
      </div>
    );
  }

  return (
    <div className="requests-page">
      <div className="requests-header">
        <h1>Organizer Requests</h1>
        <p className="subtitle">Review and manage all organizer registration requests</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search requests by name, email, or status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>{searchTerm ? 'No Requests Found' : 'No Organizer Requests'}</h2>
          <p>{searchTerm ? 'No requests match your search criteria.' : 'There are currently no organizer requests in the system.'}</p>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="request-info">
                <div className="request-header-row">
                  <h3>{request.name}</h3>
                  <span className={`badge badge-${request.status.toLowerCase()}`}>
                    {request.status}
                  </span>
                </div>
                <p className="request-email">{request.email}</p>
                <p className="request-date">Requested on: {formatDate(request.created_at)}</p>
                {request.approved_at && (
                  <p className="request-date">
                    {request.status === 'APPROVED' ? 'Approved' : 'Rejected'} on: {formatDate(request.approved_at)}
                  </p>
                )}
                <div className="request-meta">
                  <span className="meta-item">
                    <strong>Role:</strong> Organizer
                  </span>
                  {request.approved_by && admins.get(request.approved_by) && (
                    <span className="meta-item admin-info">
                      <strong>{request.status === 'APPROVED' ? 'Approved by:' : 'Rejected by:'}</strong>{' '}
                      {admins.get(request.approved_by)?.name} ({admins.get(request.approved_by)?.email})
                    </span>
                  )}
                </div>
              </div>

              <div className="request-actions">
                {request.status === 'PENDING' || request.status === 'REJECTED' ? (
                  <>
                    <button
                      className="btn-approve"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingIds.has(request.id)}
                    >
                      {processingIds.has(request.id) ? 'Processing...' : '✓ Approve'}
                    </button>
                    {request.status === 'PENDING' && (
                      <button
                        className="btn-reject"
                        onClick={() => handleReject(request.id)}
                        disabled={processingIds.has(request.id)}
                      >
                        {processingIds.has(request.id) ? 'Processing...' : '✗ Reject'}
                      </button>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizerRequestsPage;
