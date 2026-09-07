'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import text from '../../lib/text';

// shadcn Dialog의 시각 언어를 따르되 Radix 없이 구현 — 오버레이 + 중앙
// 패널(모바일은 하단 시트), ESC/바깥 클릭 닫기, body 스크롤 잠금, 닫기
// 버튼 자동 포커스. header를 넘기면 기본 제목 영역을 대체한다.
export function Modal({ open, onClose, title, header, children, className }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm motion-safe:animate-[modal-backdrop-in_150ms_ease-out] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[85vh] w-full overflow-y-auto rounded-t-xl border border-border bg-card p-5 text-card-foreground shadow-lg',
          'motion-safe:animate-[modal-panel-in_200ms_ease-out] sm:max-w-md sm:rounded-xl',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {header ?? (title && <h2 className="text-base font-semibold text-foreground">{title}</h2>)}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={text.infoModal.close}
            className="-mr-1.5 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-3">{children}</div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-secondary py-2.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 sm:hidden"
        >
          {text.infoModal.close}
        </button>
      </div>
    </div>,
    document.body
  );
}
