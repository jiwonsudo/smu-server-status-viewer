'use client';

import { useState } from 'react';
import DetailModal from '../DetailModal';

const StatusBar = (props) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={props.onTogglePin}
            aria-pressed={props.pinned}
            aria-label={props.pinned ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            title={props.pinned ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl leading-none transition ${props.pinned ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-slate-400'}`}
          >
            {props.pinned ? '★' : '☆'}
          </button>
          {props.loggedIn && (
            <button
              type="button"
              onClick={props.onToggleSubscribe}
              aria-pressed={props.subscribed}
              aria-label={props.subscribed ? '카카오톡 알림 해제' : '카카오톡 알림 받기'}
              title={props.subscribed ? '카카오톡 알림 해제' : '카카오톡 알림 받기'}
              className={`flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none transition ${props.subscribed ? 'text-[#391B1B]' : 'text-slate-300 hover:text-slate-400'}`}
            >
              {props.subscribed ? '🔔' : '🔕'}
            </button>
          )}
          <div className="min-w-0 pt-2.5">
            <a
              href={props.href}
              target="_blank"
              rel="noreferrer"
              onClick={props.onVisit}
              className="block truncate text-base font-semibold text-slate-900 transition hover:text-[#0E207F]"
            >
              {props.title}
            </a>
            <div className="mt-0.5 truncate text-xs text-slate-400">{props.url}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-2.5 pr-3">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: props.statusColor, boxShadow: `0 0 0 4px ${props.statusColor}26` }}
            />
            <span className="text-sm font-medium text-slate-700">{props.statusMsg}</span>
          </div>
          <span className="text-xs text-slate-400">{props.responseTime}</span>
        </div>
      </div>

      {props.detail && (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-100 text-sm text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
          >
            <span aria-hidden="true">ⓘ</span>
            상세 상태 보기
          </button>
          <DetailModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={props.title}
            statusMsg={props.statusMsg}
            statusColor={props.statusColor}
            detail={props.detail}
          />
        </>
      )}
    </div>
  );
};

export default StatusBar;
