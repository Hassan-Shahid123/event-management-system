/**
 * Organizer Requests Page
 * Displays pending organizer requests for admin approval
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import type { User } from '../types';
import './OrganizerRequestsPage.css';

const OrganizerRequestsPage: React.FC = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const data = await usersAPI.getAllOrganizerRequests();
      setRequests(data);
      setError('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    if (!window.confirm('Are you sure you want to approve this organizer request?')) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.approveOrganizer(userId);
      setRequests(prev => prev.filter(req => req.id !== userId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleReject = async (userId: string) => {
    if (!window.confirm('Are you sure you want to reject this organizer request?')) {
      return;
    }

    setProcessingIds(prev => new Set(prev).add(userId));
    try {
      await usersAPI.rejectOrganizer(userId);
      setRequests(prev => prev.filter(req => req.id !== userId));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Failed to reject request');
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

      {error && <div className="error-banner">{error}</div>}

      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h2>No Organizer Requests</h2>
          <p>There are currently no organizer requests in the system.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => (
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
                  <span className="meta-item">
                    <strong>User ID:</strong> {request.id}
                  </span>
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
