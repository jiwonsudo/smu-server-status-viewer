'use client';

import { Modal } from './ui/modal';
import AiAnalysisSection from './AiAnalysisSection';
import text from '../lib/text';

function DetailModal({ open, onClose, title, statusMsg, statusColor, detail, siteKey }) {
  if (!open || !detail) return null;

  const level = !detail.ok ? 'down' : detail.slow ? 'slow' : 'ok';
  const tone =
    level === 'down'
      ? { dot: 'bg-destructive', text: 'text-destructive' }
      : level === 'slow'
        ? { dot: 'bg-warning', text: 'text-warning' }
        : { dot: 'bg-success', text: 'text-success' };

  const header = (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
        <h2 className={`text-base font-semibold ${tone.text}`}>{statusMsg}</h2>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} header={header}>
      <p className="text-sm leading-relaxed text-muted-foreground">{detail.explanation}</p>

      <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">{text.detailModal.resultLabel}</p>
        <p className="mt-1 text-sm text-foreground">
          {detail.httpCode ? `HTTP ${detail.httpCode}` : text.detailModal.notConnected} · {detail.reason}
        </p>
        {detail.responseTimeMs != null && (
          <p className="mt-1 text-xs text-muted-foreground">{text.detailModal.responseTime(detail.responseTimeMs)}</p>
        )}
      </div>

      {siteKey && <AiAnalysisSection siteKey={siteKey} isDown={!detail.ok} />}
    </Modal>
  );
}

export default DetailModal;
