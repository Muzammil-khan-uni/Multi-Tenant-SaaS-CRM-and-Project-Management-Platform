import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import socketService from '../services/socketManager';

export const useSocketConnection = () => {
  const { isAuthenticated, accessToken } = useSelector((state) => state.auth);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && accessToken && !connectedRef.current) {
      connectedRef.current = true;
      socketService.connect();
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, [isAuthenticated, accessToken]);

  useEffect(() => {
    if (accessToken && connectedRef.current) {
      socketService.updateAuth();
    }
  }, [accessToken]);
};
