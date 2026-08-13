'use client';

import { useCallback, useRef, useState } from 'react';

const TOAST_DURATION_MS = 2200;

// 즐겨찾기/알림 토글처럼 "방금 눌렀다"는 걸 잠깐 알려주기만 하면 되는
// 가벼운 상단 토스트 메시지용 훅. 연달아 누르면 이전 타이머를 취소하고
// 새 메시지로 갈아끼운다.
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
