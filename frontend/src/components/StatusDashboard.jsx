'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import StatusBar from './statusbar';
import Toast from './Toast';
import { computeDisplayStatus } from '../lib/statusDetail';
import { URL_ROOT } from '../lib/config';
import { SITE_INFOS } from '../lib/siteInfos';
import { useToast } from '../lib/useToast';
import text from '../lib/text';

const DELAY_NOTICE_MS = 8 * 1000; // Render 콜드스타트 대응: 이 시간 이상 응답이 없으면 지연 문구 표시

const PIN_STORAGE_KEY = 'smu-status-pins';

function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function StatusDashboard({ initialStatusData = {} }) {
  const [statusData, setStatusData] = useState(initialStatusData);
  const [isDelayed, setIsDelayed] = useState(false);
  const [pins, setPins] = useState([]);
  // null로 시작한다 — Date.now()를 렌더 중에 바로 부르면 SSR/하이드레이션
  // 시점 값이 달라 cacheAgeSeconds 텍스트가 어긋나 hydration mismatch(#418)가
  // 났다. null이면 두 쪽 다 "서버 확인 중..."으로 시작해 일치한다.
  const [now, setNow] = useState(null);
  const [nextUpdateAtMs, setNextUpdateAtMs] = useState(null);
  const [footerVisible, setFooterVisible] = useState(false);

  const siteInfos = useMemo(() => SITE_INFOS, []);
  const delayTimerRef = useRef(null);
  const [toastMessage, showToast] = useToast();

  // localStorage는 브라우저 전용이라 마운트 후에만 읽는다(hydration mismatch 방지).
  useEffect(() => {
    setPins(loadJSON(PIN_STORAGE_KEY, []));
  }, []);

  // 우측 하단 "N초 전 확인됨" 배지가 1초마다 갱신되도록 하는 틱 — 새 요청은 안 보낸다.
  useEffect(() => {
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // 배지가 position:fixed라 스크롤을 맨 밑까지 내리면 푸터를 가리는 문제가
  // 있었다 — 푸터가 화면에 보이기 시작하면 배지를 슬쩍 숨긴다.
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // 상태는 폴링하지 않고 백엔드가 갱신될 때마다 밀어주는 SSE를 구독한다.
  // 시계가 백엔드 하나뿐이라 "N초 전" 표시가 어긋날 일이 없다.
  useEffect(() => {
    setIsDelayed(false);
    delayTimerRef.current = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);

    const source = new EventSource(`${URL_ROOT}/status/stream`);

    source.onmessage = (event) => {
      clearTimeout(delayTimerRef.current);
      setIsDelayed(false);

      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      const nextEntries = {};
      for (const [endpoint, result] of Object.entries(payload.sites || {})) {
        nextEntries[endpoint] = computeDisplayStatus(endpoint, result);
      }
      setStatusData((prevData) => ({ ...prevData, ...nextEntries }));

      if (payload.nextUpdateAt) {
        setNextUpdateAtMs(new Date(payload.nextUpdateAt).getTime());
      }
    };

    return () => {
      clearTimeout(delayTimerRef.current);
      source.close();
    };
  }, []);

  const togglePin = (endpoint, siteTitle) => {
    const isPinned = pins.includes(endpoint);
    const next = isPinned ? pins.filter((key) => key !== endpoint) : [...pins, endpoint];
    setPins(next);
    try {
      window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등)해도 기능은 세션 내에서 그대로 동작
    }
    showToast(isPinned ? text.toast.pinRemoved(siteTitle) : text.toast.pinAdded(siteTitle));
  };

  // 링크 클릭 수는 백엔드(Postgres)에 계속 집계해 둔다 — 화면엔 안 쓰지만
  // 개인정보처리방침에 고지된 집계 데이터.
  const recordVisit = (siteKey) => {
    axios.post(`${URL_ROOT}/clicks/${siteKey}`).catch(() => {});
  };

  // 정렬은 고정 우선순위: 즐겨찾기 → 접속 오류 → 가나다순.
  const sortedSiteInfos = useMemo(() => {
    const isErrored = (endpoint) => {
      const detail = statusData[endpoint]?.detail;
      return Boolean(detail && !detail.ok);
    };
    return [...siteInfos].sort((a, b) => {
      const ap = pins.includes(a.endpoint);
      const bp = pins.includes(b.endpoint);
      if (ap !== bp) return ap ? -1 : 1;

      const ae = isErrored(a.endpoint);
      const be = isErrored(b.endpoint);
      if (ae !== be) return ae ? -1 : 1;

      return a.title.localeCompare(b.title, 'ko');
    });
  }, [siteInfos, pins, statusData]);

  // 배지에 보여줄 "서버 캐시가 몇 초 전 것인지" — 사이트별 checkedAt 중 최신값 기준.
  const latestCheckedAtMs = useMemo(() => {
    const timestamps = Object.values(statusData)
      .map((entry) => (entry?.checkedAt ? new Date(entry.checkedAt).getTime() : null))
      .filter((ms) => typeof ms === 'number' && !Number.isNaN(ms));
    return timestamps.length ? Math.max(...timestamps) : null;
  }, [statusData]);

  const cacheAgeSeconds =
    now != null && latestCheckedAtMs != null ? Math.max(0, Math.round((now - latestCheckedAtMs) / 1000)) : null;
  const secondsUntilNextUpdate =
    now != null && nextUpdateAtMs != null ? Math.max(0, Math.round((nextUpdateAtMs - now) / 1000)) : null;

  return (
    <div>
      <Toast message={toastMessage} />

      <div className="flex flex-col gap-4">
        {sortedSiteInfos.map((siteInfo) => (
          <StatusBar
            key={siteInfo.endpoint}
            title={siteInfo.title}
            url={siteInfo.url}
            href={siteInfo.url}
            statusMsg={statusData[siteInfo.endpoint]?.statusMsg || (isDelayed ? text.dashboard.delayedStatus : text.dashboard.checkingStatus)}
            statusColor={statusData[siteInfo.endpoint]?.statusColor || '#b45309'}
            responseTime={statusData[siteInfo.endpoint]?.responseTime || (isDelayed ? text.dashboard.delayedResponseTime : text.dashboard.checkingResponseTime)}
            detail={statusData[siteInfo.endpoint]?.detail}
            siteKey={siteInfo.siteKey}
            pinned={pins.includes(siteInfo.endpoint)}
            onTogglePin={() => togglePin(siteInfo.endpoint, siteInfo.title)}
            onVisit={() => recordVisit(siteInfo.siteKey)}
          />
        ))}
      </div>

      <div
        className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition-opacity duration-200 ${
          footerVisible ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-live="off"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cacheAgeSeconds == null ? 'bg-muted-foreground/40' : 'bg-success'}`} />
        {cacheAgeSeconds == null ? (
          text.dashboard.cacheChecking
        ) : (
          <span>
            {text.dashboard.cacheAgeSuffix(cacheAgeSeconds)}
            {secondsUntilNextUpdate != null && ` · ${text.dashboard.nextUpdateSuffix(secondsUntilNextUpdate)}`}
          </span>
        )}
      </div>
    </div>
  );
}

export default StatusDashboard;
