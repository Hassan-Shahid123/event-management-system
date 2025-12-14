/**
 * Navigation Bar Component
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/events" className="navbar-brand">
          🎓 CampusConnect
        </Link>

        <div className="navbar-links">
          {isAuthenticated ? (
            <>
              <Link to="/events" className="nav-link">Events</Link>
              <Link to="/my-registrations" className="nav-link">My Registrations</Link>
              
              {(user?.role === 'ORGANIZER' || user?.role === 'ADMIN') && (
                <Link to="/events/create" className="nav-link">Create Event</Link>
              )}
              
              {user?.role === 'ADMIN' && (
                <Link to="/venues" className="nav-link">Venues</Link>
              )}

              <div className="navbar-user">
                <span className="user-name">{user?.name}</span>
                <span className="user-role">({user?.role})</span>
                <button onClick={handleLogout} className="btn-logout">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
