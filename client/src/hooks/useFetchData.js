import { useState, useCallback, useEffect, useRef } from 'react';

export const useFetchData = (fetchFn) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchFnRef = useRef(fetchFn);
  const mountedRef = useRef(true);

  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(async () => {
    if (!mountedRef.current) return;

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFnRef.current();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'An error occurred');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return { data, loading, error, execute, setData };
};
