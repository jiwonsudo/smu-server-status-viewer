'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';
import ContactForm from '../ContactForm';

function ContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center rounded-lg px-2.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3"
      >
        문의
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title="문의 / 건의사항">
        <p>이런 내용을 남겨주시면 도움이 됩니다.</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>사이트가 이상하게 동작하거나 오류가 보일 때 (버그 제보)</li>
          <li>모니터링에 추가하거나 빼줬으면 하는 SMU 서비스</li>
          <li>있었으면 하는 기능 제안</li>
          <li>기타 궁금한 점</li>
        </ul>
        <p className="mt-2 text-xs text-slate-400">
          이메일은 선택 사항이에요 — 안 남기면 익명으로 전달되고, 남기면 그 주소로 답장드립니다.
        </p>
        <div className="mt-4">
          <ContactForm />
        </div>
      </InfoModal>
    </>
  );
}

export default ContactButton;
