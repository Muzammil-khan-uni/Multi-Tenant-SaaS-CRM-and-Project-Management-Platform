import { useState, useEffect, useRef } from 'react';

export const useEmailVerification = (verifyFn) => {
  const [state, setState] = useState({
    status: 'loading',
    message: '',
  });
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const verify = async () => {
      try {
        const result = await verifyFn();
        setState({
          status: 'success',
          message: result.message || 'Verified successfully!',
        });
      } catch (error) {
        setState({
          status: 'error',
          message:
            error.response?.data?.message ||
            error.message ||
            'Verification failed.',
        });
      }
    };

    verify();
  }, [verifyFn]);

  return state;
};
