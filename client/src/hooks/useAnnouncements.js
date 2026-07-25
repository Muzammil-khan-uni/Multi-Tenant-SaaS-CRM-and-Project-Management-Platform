import { useState, useEffect, useCallback, useRef } from 'react';
import { announcementsAPI } from '../api/announcements.api';

const POLL_MS = 30_000;

export const useAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await announcementsAPI.getActive();

        if (!cancelled) setAnnouncements(res.data.data || []);
      } catch {
        // Fail silently — don't interrupt the user's workflow
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_MS);

    return () => {
      cancelled = true; // prevent setState after unmount
      clearInterval(timerRef.current);
    };
  }, []); // no external dependencies — poll is defined inside the effect

  const dismiss = useCallback(async (id) => {
    setAnnouncements((prev) => prev.filter((a) => a._id !== id));
    try {
      await announcementsAPI.markRead(id);
    } catch {
      // Non-critical — banner stays dismissed for this session
    }
  }, []);

  return { announcements, dismiss };
};
