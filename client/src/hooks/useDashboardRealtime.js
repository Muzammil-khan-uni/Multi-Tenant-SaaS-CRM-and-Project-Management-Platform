import { useEffect, useState, useCallback } from 'react';
import socketService from '../services/socketManager';

export const useDashboardRealtime = () => {
  const [latestUpdates, setLatestUpdates] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const addUpdate = (update) => {
    setLatestUpdates((prev) => [
      {
        id: Date.now().toString(),
        ...update,
        timestamp: new Date(),
      },
      ...prev.slice(0, 9),
    ]);
  };

  useEffect(() => {
    const cleanup1 = socketService.onTaskAssigned((data) => {
      addUpdate({
        type: 'task',
        message: `New task assigned: "${data.taskTitle}"`,
        details: data,
      });
    });

    const cleanup2 = socketService.onProjectUpdated((data) => {
      addUpdate({
        type: 'project',
        message: `Project updated: ${data.action}`,
        details: data,
      });
    });

    const cleanup3 = socketService.onProjectStatusChanged((data) => {
      addUpdate({
        type: 'status',
        message: `Project status changed to ${data.newStatus}`,
        details: data,
      });
    });

    const cleanup4 = socketService.onOnlineUsersUpdate((users) => {
      setOnlineCount(users?.length || 0);
    });

    const cleanup5 = socketService.onNewComment((data) => {
      addUpdate({
        type: 'comment',
        message: `${data.author.firstName} commented on a task`,
        details: data,
      });
    });

    socketService.requestOnlineUsers();

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
    };
  }, []);

  const clearUpdates = useCallback(() => {
    setLatestUpdates([]);
  }, []);

  return {
    latestUpdates,
    onlineCount,
    clearUpdates,
  };
};
