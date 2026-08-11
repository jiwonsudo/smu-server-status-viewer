'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';
import KakaoNotify from '../KakaoNotify';

function KakaoButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-0.5 flex min-h-11 items-center rounded-full bg-[#FEE500] px-2.5 font-semibold text-[#391B1B] shadow-sm transition hover:brightness-95 sm:ml-1 sm:px-4"
      >
        <span className="sm:hidden">카톡알림받기</span>
        <span className="hidden sm:inline">카톡으로 알림받기</span>
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title="카카오톡으로 실시간 알림받기">
        <KakaoNotify />
      </InfoModal>
    </>
  );
}

export default KakaoButton;
