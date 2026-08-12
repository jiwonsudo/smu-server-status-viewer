'use client';

import { useState } from 'react';
import DetailModal from '../DetailModal';
import text from '../../lib/text';

const StatusBar = (props) => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div
      className="border border-slate-200 border-l-4 bg-white p-4"
      style={{ borderLeftColor: props.statusColor }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-2">
          <button
            type="button"
            onClick={props.onTogglePin}
            aria-pressed={props.pinned}
            aria-label={props.pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            title={props.pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            className={`flex h-11 w-11 shrink-0 items-center justify-center text-xl leading-none ${props.pinned ? 'text-amber-400 hover:text-amber-500' : 'text-slate-300 hover:text-slate-400'}`}
          >
            {props.pinned ? '★' : '☆'}
          </button>
          {props.loggedIn && (
            <button
              type="button"
              onClick={props.onToggleSubscribe}
              aria-pressed={props.subscribed}
              aria-label={props.subscribed ? text.statusBar.subscribeOff : text.statusBar.subscribeOn}
              title={props.subscribed ? text.statusBar.subscribeOff : text.statusBar.subscribeOn}
              className={`flex h-11 w-11 shrink-0 items-center justify-center text-lg leading-none ${props.subscribed ? 'text-[#391B1B]' : 'text-slate-300 hover:text-slate-400'}`}
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
              className="block truncate text-base font-semibold text-slate-900 hover:underline"
            >
              {props.title}
            </a>
            <div className="mt-0.5 truncate text-xs text-slate-400">{props.url}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-medium" style={{ color: props.statusColor }}>
            {props.statusMsg}
          </span>
          <span className="text-xs text-slate-400">{props.responseTime}</span>
        </div>
      </div>

      {props.detail && (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 border border-slate-100 text-sm text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700"
          >
            <span aria-hidden="true">ⓘ</span>
            {text.statusBar.detailButton}
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
