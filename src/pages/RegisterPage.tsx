/**
 * Register Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import './Auth.css';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const { register } = useAuth();
  const navigate = useNavigate();

  // Scroll to top when success message is displayed
  useEffect(() => {
    if (successMessage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [successMessage]);

  // Scroll to top when general error is displayed
  useEffect(() => {
    if (errors.general) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [errors.general]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: typeof errors = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    // Validate password
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Validate confirm password
    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      await register({ name, email, password, role });
      
      // Show success message based on role
      if (role === 'ORGANIZER') {
        setSuccessMessage('Your request has been sent to the admin for approval. You will be notified once approved.');
        // Clear form
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRole('STUDENT');
        // Don't navigate - show message instead
      } else {
        navigate('/events');
      }
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string } } };
      const errorMsg = typeof apiError.response?.data?.error === 'string'
        ? apiError.response.data.error
        : err instanceof Error
        ? err.message
        : 'Registration failed. Please try again.';
      
      // Check for rejected organizer message - show at top
      if (errorMsg.toLowerCase().includes('rejected') || errorMsg.toLowerCase().includes('admin office')) {
        setErrors({ general: errorMsg });
      }
      // Try to map other API errors to specific fields
      else if (errorMsg.toLowerCase().includes('email')) {
        setErrors({ email: errorMsg });
      } else if (errorMsg.toLowerCase().includes('password')) {
        setErrors({ password: errorMsg });
      } else {
        setErrors({ general: errorMsg });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>CampusConnect</h1>
        <h2>Register</h2>
        
        {successMessage && <div className="success-message">{successMessage}</div>}
        {errors.general && <div className="error-message">{errors.general}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Your Name"
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your.email@example.com"
              className={errors.email ? 'input-error' : ''}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
              className={errors.password ? 'input-error' : ''}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Re-enter password"
              className={errors.confirmPassword ? 'input-error' : ''}
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              required
            >
              <option value="STUDENT">Student</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary">
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
