import { useState, useCallback, useRef, useEffect } from 'react';

export const useApiData = (fetchFn, options = {}) => {
  const {
    immediate = true,
    refreshInterval = null,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState(() => ({
    data: null,
    loading: immediate,
    error: null,
  }));

  const fetchFnRef = useRef(fetchFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const executingRef = useRef(false);

  fetchFnRef.current = fetchFn;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const execute = useCallback(async () => {
    if (executingRef.current) return;
    executingRef.current = true;

    setState((prev) => ({
      ...prev,
      loading: !prev.data,
      error: null,
    }));

    try {
      const result = await fetchFnRef.current();
      setState({
        data: result,
        loading: false,
        error: null,
      });
      onSuccessRef.current?.(result);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || 'An error occurred',
      }));
      onErrorRef.current?.(err);
    } finally {
      executingRef.current = false;
    }
  }, []);

  const setData = useCallback((newData) => {
    setState((prev) => ({ ...prev, data: newData }));
  }, []);

  useEffect(() => {
    if (immediate) execute();
  }, [execute, immediate]);

  useEffect(() => {
    if (!refreshInterval) return;
    const id = setInterval(execute, refreshInterval);
    return () => clearInterval(id);
  }, [execute, refreshInterval]);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    refetch: execute,
    setData,
  };
};
