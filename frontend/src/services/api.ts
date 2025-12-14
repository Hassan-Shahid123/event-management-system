/**
 * API Service Layer
 * Central place for all API calls to backend
 */

import axios from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  Event,
  Venue,
  EventRegistration,
  CreateEventRequest,
  UpdateEventRequest,
  ChangeEventStatusRequest,
  CreateVenueRequest,
  RegistrationStatsResponse,
  UserStatsResponse,
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// AUTHENTICATION API
// ============================================================================

export const authAPI = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', {
      userId,
      currentPassword,
      newPassword,
    });
  },
};

// ============================================================================
// USERS API
// ============================================================================

export const usersAPI = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/users');
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  update: async (id: string, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  getStats: async (): Promise<UserStatsResponse> => {
    const response = await api.get<UserStatsResponse>('/users/stats');
    return response.data;
  },
};

// ============================================================================
// EVENTS API
// ============================================================================

export const eventsAPI = {
  getAll: async (): Promise<Event[]> => {
    const response = await api.get<Event[]>('/events');
    return response.data;
  },

  getById: async (id: string): Promise<Event> => {
    const response = await api.get<Event>(`/events/${id}`);
    return response.data;
  },

  create: async (data: CreateEventRequest): Promise<Event> => {
    const response = await api.post<Event>('/events', data);
    return response.data;
  },

  update: async (id: string, data: UpdateEventRequest): Promise<Event> => {
    const response = await api.put<Event>(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: string, requestingUserId: string): Promise<void> => {
    await api.delete(`/events/${id}`, { data: { requestingUserId } });
  },

  changeStatus: async (id: string, data: ChangeEventStatusRequest): Promise<Event> => {
    const response = await api.patch<Event>(`/events/${id}/status`, data);
    return response.data;
  },

  search: async (term: string): Promise<Event[]> => {
    const response = await api.get<Event[]>(`/events/search/${term}`);
    return response.data;
  },
};

// ============================================================================
// VENUES API
// ============================================================================

export const venuesAPI = {
  getAll: async (): Promise<Venue[]> => {
    const response = await api.get<Venue[]>('/venues');
    return response.data;
  },

  getById: async (id: string): Promise<Venue> => {
    const response = await api.get<Venue>(`/venues/${id}`);
    return response.data;
  },

  create: async (data: CreateVenueRequest): Promise<Venue> => {
    const response = await api.post<Venue>('/venues', data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateVenueRequest>): Promise<Venue> => {
    const response = await api.put<Venue>(`/venues/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/venues/${id}`);
  },

  getAvailable: async (startDatetime: string, endDatetime: string): Promise<Venue[]> => {
    const response = await api.get<Venue[]>('/venues/available', {
      params: { startDatetime, endDatetime },
    });
    return response.data;
  },
};

// ============================================================================
// REGISTRATIONS API
// ============================================================================

export const registrationsAPI = {
  register: async (eventId: string, userId: string): Promise<EventRegistration> => {
    const response = await api.post<EventRegistration>('/registrations', {
      eventId,
      userId,
    });
    return response.data;
  },

  unregister: async (eventId: string, userId: string): Promise<void> => {
    await api.delete('/registrations', {
      data: { eventId, userId },
    });
  },

  getEventRegistrations: async (eventId: string): Promise<EventRegistration[]> => {
    const response = await api.get<EventRegistration[]>(`/registrations/event/${eventId}`);
    return response.data;
  },

  getUserRegistrations: async (userId: string): Promise<EventRegistration[]> => {
    const response = await api.get<EventRegistration[]>(`/registrations/user/${userId}`);
    return response.data;
  },

  getEventStats: async (eventId: string): Promise<RegistrationStatsResponse> => {
    const response = await api.get<RegistrationStatsResponse>(`/registrations/event/${eventId}/stats`);
    return response.data;
  },
};

export default api;
