import { useEffect, useCallback } from 'react';
import socketService from '../services/socketManager';
import toast from 'react-hot-toast';

export const useTaskRealtime = (taskId) => {
  useEffect(() => {
    if (!taskId) return;

    const cleanup = socketService.onTaskAssigned((data) => {
      if (data.taskId === taskId) {
        toast.success(`Task assigned to new members`, { icon: '👥' });
      }
    });

    return cleanup;
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return;

    const cleanup = socketService.onNewComment((data) => {
      if (data.taskId === taskId) {
        toast(`${data.author.firstName} commented on this task`, {
          icon: '💬',
          duration: 3000,
        });
      }
    });

    return cleanup;
  }, [taskId]);

  const addComment = useCallback(
    (comment, notifyUsers = []) => {
      socketService.emitComment(taskId, comment, notifyUsers);
    },
    [taskId]
  );

  const startTyping = useCallback(() => {
    socketService.emitTypingStart('task', taskId);
  }, [taskId]);

  const stopTyping = useCallback(() => {
    socketService.emitTypingStop('task', taskId);
  }, [taskId]);

  return { addComment, startTyping, stopTyping };
};
