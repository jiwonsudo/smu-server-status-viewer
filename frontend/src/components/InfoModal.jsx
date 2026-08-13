'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import text from '../lib/text';

function InfoModal({ open, onClose, title, children }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm motion-safe:animate-[modal-backdrop-in_150ms_ease-out] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-modal-heading"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl motion-safe:animate-[modal-panel-in_200ms_ease-out] sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="info-modal-heading" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={text.infoModal.close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <div className="mt-3 text-sm leading-relaxed text-slate-600">{children}</div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-slate-100 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-200 sm:hidden"
        >
          {text.infoModal.close}
        </button>
      </div>
    </div>,
    document.body
  );
}

export default InfoModal;
