'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import text from '../lib/text';

function DetailModal({ open, onClose, title, statusMsg, statusColor, detail }) {
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

  if (!open || !detail) return null;

  const color = statusColor || (detail.ok ? '#5cb85c' : '#d9534f');

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm motion-safe:animate-[modal-backdrop-in_150ms_ease-out] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="status-detail-heading"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl motion-safe:animate-[modal-panel-in_200ms_ease-out] sm:max-w-md sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm text-slate-400">{title}</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 0 4px ${color}26` }}
              />
              <h2 id="status-detail-heading" className="text-lg font-semibold text-slate-900">
                {statusMsg}
              </h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={text.infoModal.close}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            &times;
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600">{detail.explanation}</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-400">{text.detailModal.resultLabel}</p>
          <p className="mt-1 text-sm text-slate-700">
            {detail.httpCode ? `HTTP ${detail.httpCode}` : text.detailModal.notConnected} · {detail.reason}
          </p>
          {detail.responseTimeMs != null && (
            <p className="mt-1 text-xs text-slate-400">{text.detailModal.responseTime(detail.responseTimeMs)}</p>
          )}
        </div>

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

export default DetailModal;
