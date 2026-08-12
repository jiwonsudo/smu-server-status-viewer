'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';
import KakaoNotify from '../KakaoNotify';
import { ChatBubbleIcon } from '../icons';
import text from '../../lib/text';

function KakaoButton() {
  const [open, setOpen] = useState(false);

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
