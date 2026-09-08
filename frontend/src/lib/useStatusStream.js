'use client';

import { useEffect, useRef, useState } from 'react';
import { URL_ROOT } from './config';
import { computeDisplayStatus } from './statusDetail';

// Show a "taking longer than usual" notice if no event arrives in this time.
const DELAY_NOTICE_MS = 8 * 1000;

// useStatusStream subscribes to the backend's SSE stream and keeps the site
// status map live. Starting from initialStatusData (the server prefetch), it
// merges each pushed snapshot in. isDelayed turns on if the first event is
// slow (Render cold start).
export function useStatusStream(initialStatusData = {}) {
  const [statusData, setStatusData] = useState(initialStatusData);
  const [isDelayed, setIsDelayed] = useState(false);
  const [nextUpdateAtMs, setNextUpdateAtMs] = useState(null);
  const delayTimer = useRef(null);

  useEffect(() => {
    delayTimer.current = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);
    const source = new EventSource(`${URL_ROOT}/status/stream`);

    source.onmessage = (event) => {
      clearTimeout(delayTimer.current);
      setIsDelayed(false);

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const next = {};
      for (const [endpoint, result] of Object.entries(payload.sites || {})) {
        next[endpoint] = computeDisplayStatus(endpoint, result);
      }
      setStatusData((prev) => ({ ...prev, ...next }));

      if (payload.nextUpdateAt) {
        setNextUpdateAtMs(new Date(payload.nextUpdateAt).getTime());
      }
    };

    return () => {
      clearTimeout(delayTimer.current);
      source.close();
    };
  }, []);

  return { statusData, isDelayed, nextUpdateAtMs };
}
