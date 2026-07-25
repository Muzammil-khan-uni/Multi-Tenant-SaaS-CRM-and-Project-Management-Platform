import { useEffect, useRef, useCallback } from 'react';

export const useInfiniteScroll = (callback, options = {}) => {
  const { threshold = 100, enabled = true } = options;
  const observerRef = useRef(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const lastElementRef = useCallback(
    (node) => {
      if (!enabled) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            callbackRef.current();
          }
        },
        {
          rootMargin: `${threshold}px`,
        }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [threshold, enabled]
  );

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return lastElementRef;
};
