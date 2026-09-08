'use client';

import text from '../lib/text';

// Fixed bottom-right badge showing how old the cached status is and when the
// next backend refresh lands. Fades out while the footer is visible so it
// doesn't cover it.
function CacheBadge({ ageSeconds, secondsUntilNextUpdate, hidden }) {
  return (
    <div
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-opacity duration-200 ${
        hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      aria-live="off"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ageSeconds == null ? 'bg-muted-foreground/40' : 'bg-success'}`} />
      {ageSeconds == null ? (
        text.dashboard.checkingStatus
      ) : (
        <span>
          {text.dashboard.cacheAgeSuffix(ageSeconds)}
          {secondsUntilNextUpdate != null && ` · ${text.dashboard.nextUpdateSuffix(secondsUntilNextUpdate)}`}
        </span>
      )}
    </div>
  );
}

export default CacheBadge;
