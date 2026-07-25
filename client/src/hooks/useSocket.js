import { useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socketManager';

export const useSocket = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const cleanupRef = useRef([]);

  useEffect(() => {
    if (isAuthenticated) {
      socketService.connect();
    }

    return () => {
      cleanupRef.current.forEach((cleanup) => cleanup());
      cleanupRef.current = [];
    };
  }, [isAuthenticated]);

  const addCleanup = useCallback((cleanupFn) => {
    cleanupRef.current.push(cleanupFn);
  }, []);

  const subscribeToTaskUpdates = useCallback(
    (taskId, callback) => {
      const cleanup = socketService.onTaskUpdated((data) => {
        if (data.taskId === taskId) {
          callback(data);
        }
      });
      addCleanup(cleanup);
    },
    [addCleanup]
  );

  const subscribeToComments = useCallback(
    (taskId, callback) => {
      const cleanup = socketService.onNewComment((data) => {
        if (data.taskId === taskId) {
          callback(data);
        }
      });
      addCleanup(cleanup);
    },
    [addCleanup]
  );

  const subscribeToNotifications = useCallback(
    (callback) => {
      const cleanup = socketService.onNotificationReceived(callback);
      addCleanup(cleanup);
    },
    [addCleanup]
  );

  const subscribeToUserPresence = useCallback(
    (callback) => {
      const cleanup1 = socketService.onUserOffline(callback);
      const cleanup2 = socketService.onUserJoinedProject(callback);
      addCleanup(cleanup1);
      addCleanup(cleanup2);
    },
    [addCleanup]
  );

  return {
    socket: socketService,
    isConnected: socketService.isConnected(),
    subscribeToTaskUpdates,
    subscribeToComments,
    subscribeToNotifications,
    subscribeToUserPresence,
  };
};
