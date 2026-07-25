import { useEffect, useCallback } from 'react';
import socketService from '../services/socketManager';
import toast from 'react-hot-toast';

export const useProjectRealtime = (projectId) => {
  useEffect(() => {
    if (!projectId) return;

    const cleanup1 = socketService.onProjectUpdated((data) => {
      if (data.projectId === projectId) {
        toast(`${data.updatedBy.firstName} ${data.action} the project`, {
          icon: '📁',
          duration: 3000,
        });
      }
    });

    const cleanup2 = socketService.onProjectStatusChanged((data) => {
      if (data.projectId === projectId) {
        toast(`Project status changed to ${data.newStatus}`, {
          icon: '🔄',
          duration: 3000,
        });
      }
    });

    return () => {
      cleanup1();
      cleanup2();
    };
  }, [projectId]);

  const notifyUpdate = useCallback(
    (action, details = {}) => {
      socketService.emitProjectUpdate(projectId, '', action, details);
    },
    [projectId]
  );

  return { notifyUpdate };
};
