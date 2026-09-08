'use client';

import { createPortal } from 'react-dom';

// Top toast for lightweight action confirmations. Portaled to document.body
// so ancestor overflow/positioning can't clip it.
function Toast({ message }) {
  if (typeof document === 'undefined' || !message) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-60 max-w-[90vw] -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-4 py-2 text-sm text-background shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]"
    >
      {message}
    </div>,
    document.body
  );
}

export default Toast;
