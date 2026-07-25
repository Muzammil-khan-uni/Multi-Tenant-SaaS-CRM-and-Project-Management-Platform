import { useState, useEffect, useCallback } from 'react';
import axios from '../api/axios';
import socketService from '../services/socketManager';

let notificationStore = {
  notifications: [],
  unreadCount: 0,
  loading: true,
  listeners: new Set(),
};

const notifyListeners = () => {
  notificationStore.listeners.forEach((listener) => listener());
};

const updateStore = (updates) => {
  notificationStore = { ...notificationStore, ...updates };
  notifyListeners();
};

const initializeStore = async () => {
  try {
    const { data } = await axios.get('/notifications?limit=10');
    updateStore({
      notifications: data.data,
      unreadCount: data.unreadCount,
      loading: false,
    });
  } catch {
    updateStore({ loading: false });
  }
};

let socketInitialized = false;
const setupSocketListener = () => {
  if (socketInitialized) return;
  socketInitialized = true;

  socketService.onNotification((notification) => {
    updateStore({
      notifications: [notification, ...notificationStore.notifications],
      unreadCount: notificationStore.unreadCount + 1,
    });
  });
};

initializeStore();
setupSocketListener();

export const useNotifications = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    notificationStore.listeners.add(listener);
    return () => {
      notificationStore.listeners.delete(listener);
    };
  }, []);

  const markAsRead = useCallback(async (id) => {
    try {
      await axios.put(`/notifications/${id}/read`);
      updateStore({
        notifications: notificationStore.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, notificationStore.unreadCount - 1),
      });
    } catch {
      // Silently fail
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await axios.put('/notifications/read-all');
      updateStore({
        notifications: notificationStore.notifications.map((n) => ({
          ...n,
          isRead: true,
        })),
        unreadCount: 0,
      });
    } catch {
      // Silently fail
    }
  }, []);

  const refresh = useCallback(async () => {
    updateStore({ loading: true });
    try {
      const { data } = await axios.get('/notifications?limit=10');
      updateStore({
        notifications: data.data,
        unreadCount: data.unreadCount,
        loading: false,
      });
    } catch {
      updateStore({ loading: false });
    }
  }, []);

  return {
    notifications: notificationStore.notifications,
    unreadCount: notificationStore.unreadCount,
    loading: notificationStore.loading,
    refresh,
    markAsRead,
    markAllAsRead,
  };
};
