'use client';

import { useMemo } from 'react';
import StatusBar from './statusbar';
import Toast from './Toast';
import CacheBadge from './CacheBadge';
import { apiPost } from '../lib/api';
import { SITE_INFOS } from '../lib/siteInfos';
import { statusLevel } from '../lib/statusDetail';
import { useStatusStream } from '../lib/useStatusStream';
import { useNow, useFooterVisible, usePersistentSet } from '../lib/hooks';
import { useToast } from '../lib/useToast';
import text from '../lib/text';

const PIN_STORAGE_KEY = 'smu-status-pins';

// Worst-status-first ordering. Lower = more urgent.
const SEVERITY = { down: 0, slow: 1, ok: 2, loading: 2 };

function StatusDashboard({ initialStatusData = {} }) {
  const { statusData, isDelayed, nextUpdateAtMs } = useStatusStream(initialStatusData);
  const [pins, togglePinKey] = usePersistentSet(PIN_STORAGE_KEY);
  const now = useNow();
  const footerVisible = useFooterVisible();
  const [toastMessage, showToast] = useToast();

  const togglePin = (endpoint, siteTitle) => {
    const wasPinned = pins.includes(endpoint);
    togglePinKey(endpoint);
    showToast(wasPinned ? text.toast.pinRemoved(siteTitle) : text.toast.pinAdded(siteTitle));
  };

  // Link click counts are aggregated on the backend (disclosed in the
  // privacy policy); not shown in the UI.
  const recordVisit = (siteKey) => {
    apiPost(`/clicks/${siteKey}`).catch(() => {});
  };

  // Sort: pinned → worst status → 가나다순.
  const sortedSiteInfos = useMemo(() => {
    return [...SITE_INFOS].sort((a, b) => {
      const ap = pins.includes(a.endpoint);
      const bp = pins.includes(b.endpoint);
      if (ap !== bp) return ap ? -1 : 1;

      const sa = SEVERITY[statusLevel(statusData[a.endpoint]?.detail)];
      const sb = SEVERITY[statusLevel(statusData[b.endpoint]?.detail)];
      if (sa !== sb) return sa - sb;

      return a.title.localeCompare(b.title, 'ko');
    });
  }, [pins, statusData]);

  const latestCheckedAtMs = useMemo(() => {
    const times = Object.values(statusData)
      .map((entry) => (entry?.checkedAt ? new Date(entry.checkedAt).getTime() : null))
      .filter((ms) => typeof ms === 'number' && !Number.isNaN(ms));
    return times.length ? Math.max(...times) : null;
  }, [statusData]);

  const cacheAgeSeconds =
    now != null && latestCheckedAtMs != null ? Math.max(0, Math.round((now - latestCheckedAtMs) / 1000)) : null;
  const secondsUntilNextUpdate =
    now != null && nextUpdateAtMs != null ? Math.max(0, Math.round((nextUpdateAtMs - now) / 1000)) : null;

  return (
    <div>
      <Toast message={toastMessage} />

      <div className="flex flex-col gap-4">
        {sortedSiteInfos.map((siteInfo) => {
          const entry = statusData[siteInfo.endpoint];
          return (
            <StatusBar
              key={siteInfo.endpoint}
              title={siteInfo.title}
              url={siteInfo.url}
              href={siteInfo.url}
              statusMsg={entry?.statusMsg || (isDelayed ? text.dashboard.delayedStatus : text.dashboard.checkingStatus)}
              responseTime={
                entry?.responseTime || (isDelayed ? text.dashboard.delayedResponseTime : text.dashboard.checkingResponseTime)
              }
              detail={entry?.detail}
              siteKey={siteInfo.siteKey}
              pinned={pins.includes(siteInfo.endpoint)}
              onTogglePin={() => togglePin(siteInfo.endpoint, siteInfo.title)}
              onVisit={() => recordVisit(siteInfo.siteKey)}
            />
          );
        })}
      </div>

      <CacheBadge
        ageSeconds={cacheAgeSeconds}
        secondsUntilNextUpdate={secondsUntilNextUpdate}
        hidden={footerVisible}
      />
    </div>
  );
}

export default StatusDashboard;
