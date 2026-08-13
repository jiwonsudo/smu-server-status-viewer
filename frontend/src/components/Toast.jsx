'use client';

import { createPortal } from 'react-dom';

// 즐겨찾기/알림 토글 같은 가벼운 액션 확인용 상단 토스트. 모달들과 같은
// 이유로 document.body에 포털링한다 — 카드 안에 그냥 두면 조상 요소의
// 스타일(overflow 등)에 걸려 잘리거나 엉뚱한 위치에 뜰 수 있다.
function Toast({ message }) {
  if (typeof document === 'undefined' || !message) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-4 z-[60] max-w-[90vw] -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg motion-safe:animate-[toast-in_200ms_ease-out]"
    >
      {message}
    </div>,
    document.body
  );
}

export default Toast;
