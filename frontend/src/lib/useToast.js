'use client';

import { useCallback, useRef, useState } from 'react';

const TOAST_DURATION_MS = 2200;

// Lightweight transient toast. Rapid calls cancel the previous timer and
// swap in the new message.
export function useToast(duration = TOAST_DURATION_MS) {
  const [message, setMessage] = useState(null);
  const timerRef = useRef(null);

  const showToast = useCallback(
    (msg) => {
      clearTimeout(timerRef.current);
      setMessage(msg);
      timerRef.current = setTimeout(() => setMessage(null), duration);
    },
    [duration]
  );

  return [message, showToast];
}
