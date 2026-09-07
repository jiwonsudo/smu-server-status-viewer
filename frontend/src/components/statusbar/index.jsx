'use client';

import { useState } from 'react';
import DetailModal from '../DetailModal';
import { StarIcon } from '../icons';
import { cn } from '../../lib/cn';
import text from '../../lib/text';

// 상태는 한눈에 잡혀야 한다. 정상은 조용하게, 느림/오류는 색이 분명하게 —
// 오류는 아예 붉은 알약으로 감싸 어느 카드가 문제인지 바로 보이게 한다.
const STATUS_STYLE = {
  ok: { card: 'border-border', dot: 'bg-success', label: 'text-success' },
  slow: { card: 'border-warning/40', dot: 'bg-warning', label: 'text-warning', pill: 'bg-warning/10' },
  down: { card: 'border-destructive/50', dot: 'bg-destructive', label: 'text-destructive', pill: 'bg-destructive/10' },
  loading: { card: 'border-border', dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' },
};

const StatusBar = (props) => {
  const [modalOpen, setModalOpen] = useState(false);
  // 눌렀을 때 잠깐 커졌다 흔들리는 피드백. onAnimationEnd로 정확히
  // 애니메이션 길이만큼만 켠다.
  const [pinPulsing, setPinPulsing] = useState(false);

  const level = props.detail ? (!props.detail.ok ? 'down' : props.detail.slow ? 'slow' : 'ok') : 'loading';
  const s = STATUS_STYLE[level];

  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', s.card)}>
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
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold',
              s.label,
              s.pill
            )}
          >
            <span className={cn('h-2 w-2 shrink-0 rounded-full', s.dot)} />
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
