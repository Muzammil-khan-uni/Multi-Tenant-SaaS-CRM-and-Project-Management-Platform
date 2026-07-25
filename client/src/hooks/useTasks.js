import { useState, useCallback } from 'react';
import axios from '../api/axios';

export const useTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get('/tasks');
      const tasksData = Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setTasks(tasksData);
      if (!initialized) setInitialized(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const init = useCallback(() => {
    if (!initialized && !loading) {
      fetchTasks();
    }
  }, [initialized, loading, fetchTasks]);

  return { tasks, loading, error, fetchTasks, init, initialized };
};
