/**
 * Notification Context
 * Provides notification functionality throughout the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification, { type NotificationType } from '../components/Notification';

interface NotificationData {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [nextId, setNextId] = useState(1);

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const id = nextId;
    setNextId(prev => prev + 1);
    setNotifications(prev => [...prev, { id, message, type }]);
  }, [nextId]);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((message: string) => {
    showNotification(message, 'success');
  }, [showNotification]);

  const error = useCallback((message: string) => {
    showNotification(message, 'error');
  }, [showNotification]);

  const warning = useCallback((message: string) => {
    showNotification(message, 'warning');
  }, [showNotification]);

  const info = useCallback((message: string) => {
    showNotification(message, 'info');
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, success, error, warning, info }}>
      {children}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
