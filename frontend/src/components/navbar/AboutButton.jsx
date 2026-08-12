'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';

function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center rounded-lg px-2.5 text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3"
      >
        소개
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title="스뮤야 괜찮아? — 상명대 서버 실시간 상태 확인">
        <p>
          이캠 안됨, 이캠퍼스(코스모스) 접속장애처럼 상명대 서버가 이상할 때 제일 먼저
          확인하는 곳입니다. 상명대학교 서울캠퍼스에서 자주 쓰는 주요 서비스 10곳의
          접속 가능 여부와 응답 속도를 실시간으로 보여줍니다.
        </p>

        <h3 className="mt-4 font-semibold text-slate-800">확인하는 서비스</h3>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>홈페이지 / 이캠퍼스 / 샘물(통합정보시스템)</li>
          <li>SM Challenge(진로·취업 포트폴리오) / Office 365(클라우드메일)</li>
          <li>학생생활관</li>
        </ul>

        <h3 className="mt-4 font-semibold text-slate-800">신호등 색이 뜻하는 것</h3>
        <ul className="mt-1 space-y-1">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5cb85c]" />
            정상 — 800ms 이내로 응답 (구글 웹 성능 기준 &quot;Good&quot;)
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f0ad4e]" />
            느림 — 접속은 되지만 800ms 넘게 걸림
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d9534f]" />
            응답 없음 — 5초 넘게 무응답이거나 오류 응답
          </li>
        </ul>
        <p className="mt-1 text-xs text-slate-400">
          각 카드의 &quot;상세 상태 보기&quot;를 누르면 서버가 실제로 보낸 원본 메시지를 볼 수 있습니다.
        </p>

        <h3 className="mt-4 font-semibold text-slate-800">점검 주기</h3>
        <p className="mt-1">
          화면은 60초마다 자동으로 다시 확인합니다. 이와 별도로 5분마다 백그라운드에서도
          점검해서 상태가 바뀐 기록을 남기고 있어요(추후 이메일·카카오톡 알림과 연동 예정).
        </p>

        <h3 className="mt-4 font-semibold text-slate-800">정렬 / 즐겨찾기</h3>
        <p className="mt-1">
          ☆를 누르면 자주 보는 사이트를 목록 맨 위에 고정할 수 있어요(이 브라우저에만 저장됨).
          정렬 기준은 이름순 또는 전체 방문자의 조회수 순으로 바꿀 수 있습니다.
        </p>
      </InfoModal>
    </>
  );
}

export default AboutButton;
