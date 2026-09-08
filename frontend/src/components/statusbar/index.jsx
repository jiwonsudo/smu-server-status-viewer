'use client';

import { useState } from 'react';
import DetailModal from '../DetailModal';
import { StarIcon } from '../icons';
import { cn } from '../../lib/cn';
import { statusLevel } from '../../lib/statusDetail';
import text from '../../lib/text';

// Per-level card / dot / label styling. Errors get a red pill so the
// problem card stands out at a glance.
const STATUS_STYLE = {
  ok: { card: 'border-border', dot: 'bg-success', label: 'text-success' },
  slow: { card: 'border-warning/40', dot: 'bg-warning', label: 'text-warning', pill: 'bg-warning/10' },
  down: { card: 'border-destructive/50', dot: 'bg-destructive', label: 'text-destructive', pill: 'bg-destructive/10' },
  loading: { card: 'border-border', dot: 'bg-muted-foreground/40', label: 'text-muted-foreground' },
};

function StatusBar({ title, url, href, statusMsg, responseTime, detail, siteKey, pinned, onTogglePin, onVisit }) {
  const [modalOpen, setModalOpen] = useState(false);
  // Brief pop/shake feedback on tap; cleared by onAnimationEnd.
  const [pinPulsing, setPinPulsing] = useState(false);

  const s = STATUS_STYLE[statusLevel(detail)];

  return (
    <div className={cn('rounded-xl border bg-card p-4 shadow-sm', s.card)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => {
              setPinPulsing(true);
              onTogglePin();
            }}
            onAnimationEnd={() => setPinPulsing(false)}
            aria-pressed={pinned}
            aria-label={pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            title={pinned ? text.statusBar.pinRemove : text.statusBar.pinAdd}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-accent',
              pinPulsing && 'motion-safe:animate-[icon-pop_420ms_ease-in-out]'
            )}
          >
            <StarIcon filled={pinned} className={cn('h-4 w-4', pinned ? 'text-amber-400' : 'text-muted-foreground/50')} />
          </button>
          <div className="min-w-0 pl-1.5">
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={onVisit}
              className="block truncate text-base font-semibold text-foreground hover:underline"
            >
              {title}
            </a>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{url}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={cn('flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-sm font-semibold', s.label, s.pill)}>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', s.dot)} />
            {statusMsg}
          </span>
          <span className="text-xs text-muted-foreground">{responseTime}</span>
        </div>
      </div>

      {detail && (
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
            title={title}
            statusMsg={statusMsg}
            detail={detail}
            siteKey={siteKey}
          />
        </>
      )}
    </div>
  );
}

export default StatusBar;
