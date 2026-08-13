'use client';

import { useEffect, useState } from 'react';
import InfoModal from '../InfoModal';
import KakaoNotify from '../KakaoNotify';
import { ChatBubbleIcon } from '../icons';
import { useAuth } from '../../lib/AuthContext';
import { hasLoggedInBefore } from '../../lib/knownUser';
import text from '../../lib/text';

// 이 브라우저에서 로그인해본 적 있는 사람한테는 "이런 기능이에요" 소개
// 모달이나 동의 경고를 다시 보여줄 필요가 없다 — 바로 로그인으로 보낸다.
// 처음 오는 사람만 모달을 거친다(기능 소개 + 동의 안내).
function KakaoButton() {
  const [open, setOpen] = useState(false);
  const { loginUrl } = useAuth();
  // localStorage는 브라우저 전용이라 마운트 후에만 읽는다 — SSR 결과와
  // 클라이언트 첫 렌더 결과가 달라지면 hydration mismatch가 나기 때문.
  const [returning, setReturning] = useState(false);
  useEffect(() => {
    setReturning(hasLoggedInBefore());
  }, []);

  if (returning) {
    return (
      <a
        href={loginUrl}
        className="flex min-h-9 items-center gap-1.5 rounded-md bg-[#FEE500] px-3 text-sm font-semibold text-[#391B1B] transition hover:brightness-95"
      >
        <ChatBubbleIcon className="h-4 w-4 shrink-0" />
        {text.nav.returningLogin}
      </a>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 items-center gap-1.5 rounded-md bg-[#FEE500] px-3 text-sm font-semibold text-[#391B1B] transition hover:brightness-95"
      >
        <ChatBubbleIcon className="h-4 w-4 shrink-0" />
        <span className="sm:hidden">{text.nav.kakaoShort}</span>
        <span className="hidden sm:inline">{text.nav.kakaoLong}</span>
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title={text.kakao.modalTitle}>
        <KakaoNotify />
      </InfoModal>
    </>
  );
}

export default KakaoButton;
