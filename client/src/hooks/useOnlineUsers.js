import { useState, useEffect } from 'react';
import socketService from '../services/socketManager';

export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanup1 = socketService.onOnlineUsersUpdate((users) => {
      setOnlineUsers(users || []);
      setLoading(false);
    });

    const cleanup2 = socketService.onUserOffline(({ userId }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.id !== userId));
    });

    if (socketService.isConnected()) {
      socketService.requestOnlineUsers();
    }

    return () => {
      cleanup1();
      cleanup2();
    };
  }, []);

  return { onlineUsers, loading };
};
