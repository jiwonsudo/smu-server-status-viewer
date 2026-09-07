'use client';

import { useState } from 'react';
import DetailModal from '../DetailModal';
import { StarIcon } from '../icons';
import { cn } from '../../lib/cn';
import text from '../../lib/text';

const DOT_BY_LEVEL = {
  ok: 'bg-success',
  slow: 'bg-warning',
  down: 'bg-destructive',
};

const StatusBar = (props) => {
  const [modalOpen, setModalOpen] = useState(false);
  // 눌렀을 때 잠깐 커졌다 흔들리는 피드백. onAnimationEnd로 정확히
  // 애니메이션 길이만큼만 켠다.
  const [pinPulsing, setPinPulsing] = useState(false);

  const level = props.detail ? (!props.detail.ok ? 'down' : props.detail.slow ? 'slow' : 'ok') : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setPinPulsing(true);
              props.onTogglePin();
            }}
            onAnimationEnd={() => setPinPulsing(false)}
            aria-pressed={props.pinned}
            aria-label={props.pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            title={props.pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent',
              pinPulsing && 'motion-safe:animate-[icon-pop_420ms_ease-in-out]'
            )}
          >
            <StarIcon
              filled={props.pinned}
              className={cn('h-4 w-4', props.pinned ? 'text-amber-400' : 'text-muted-foreground/50')}
            />
          </button>
          <div className="min-w-0 pl-1.5">
            <a
              href={props.href}
              target="_blank"
              rel="noreferrer"
              onClick={props.onVisit}
              className="block truncate text-base font-semibold text-foreground hover:underline"
            >
              {props.title}
            </a>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{props.url}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', DOT_BY_LEVEL[level] || 'bg-muted-foreground/40')} />
            {props.statusMsg}
          </span>
          <span className="text-xs text-muted-foreground">{props.responseTime}</span>
        </div>
      </div>

      {props.detail && (
        <>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {text.statusBar.detailButton}
          </button>
          <DetailModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title={props.title}
            statusMsg={props.statusMsg}
            statusColor={props.statusColor}
            detail={props.detail}
            siteKey={props.siteKey}
          />
        </>
      )}
    </div>
  );
};

export default StatusBar;
