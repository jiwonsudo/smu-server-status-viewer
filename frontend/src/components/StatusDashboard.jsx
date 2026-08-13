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

const CLICK_REFRESH_INTERVAL_MS = 60 * 1000; // 조회수는 실시간성이 중요하지 않아 더 느리게
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
  const [sortMode, setSortMode] = useState('name'); // 'name' | 'views'
  const [pins, setPins] = useState([]);
  const [clickCounts, setClickCounts] = useState({}); // 백엔드(Postgres)에 집계된 전체 방문자 클릭 수
  // null로 시작한다 — Date.now()를 렌더 중에 바로 부르면 SSR 시점과 클라이언트
  // 하이드레이션 시점의 값이 달라져서(서버/클라이언트가 물리적으로 다른 순간에
  // 실행됨) 아래 cacheAgeSeconds 텍스트가 서버 HTML과 클라이언트 첫 렌더에서
  // 어긋나 하이드레이션 mismatch(React #418)가 났다. null이면 두 쪽 다 항상
  // "서버 확인 중..."으로 시작해 일치하고, 실제 값은 마운트 후 useEffect에서만 채운다.
  const [now, setNow] = useState(null);
  const [nextUpdateAtMs, setNextUpdateAtMs] = useState(null);
  const [footerVisible, setFooterVisible] = useState(false);

  const siteInfos = useMemo(() => SITE_INFOS, []);
  const delayTimerRef = useRef(null);
  const [toastMessage, showToast] = useToast();

  // localStorage는 브라우저 전용이라 마운트 후(useEffect)에만 읽는다 —
  // SSR 시점엔 window가 없고, 서버/클라이언트 첫 렌더 결과가 달라지면
  // hydration mismatch가 나기 때문.
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

  useEffect(() => {
    const fetchClickCounts = () => {
      axios
        .get(`${URL_ROOT}/clicks`)
        .then((response) => setClickCounts(response.data || {}))
        .catch(() => {
          // 조회수는 부가 기능이라 실패해도 조용히 무시(상태 확인 자체는 계속 동작)
        });
    };

    fetchClickCounts();
    const intervalId = setInterval(fetchClickCounts, CLICK_REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  // 상태는 폴링하지 않고 백엔드가 갱신될 때마다 밀어주는 SSE를 구독한다.
  // 예전엔 프론트가 자기 타이머로 주기적으로 다시 물어봤는데, 그러면
  // 백엔드의 갱신 주기와 어긋나는(두 개의 독립된 시계) 타이밍이 생겨서
  // "N초 전" 표시가 튀는 문제가 있었다. 이제 시계가 백엔드 하나뿐이라
  // 그런 어긋남 자체가 없다. nextUpdateAt도 서버가 계산해서 같이 보내준다.
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
    // setPins(prev => ...) 안에서 바깥 변수(willBePinned)를 대입해서 바로
    // 밑에서 읽으려 했었는데, 그 업데이터 콜백이 이 줄보다 먼저 실행된다는
    // 보장이 없어서(React가 언제 돌릴지 정해주지 않음) 토스트가 항상 "제거"
    // 문구로 떴다 — pins는 이미 컴포넌트에 있는 값이니 그냥 직접 읽는다.
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

  const recordVisit = (siteKey) => {
    // 낙관적으로 먼저 화면에 반영하고, 실제 집계는 백엔드(Postgres)에 맡긴다.
    setClickCounts((prev) => ({ ...prev, [siteKey]: (prev[siteKey] || 0) + 1 }));
    axios.post(`${URL_ROOT}/clicks/${siteKey}`).catch(() => {
      // 실패해도 링크 이동 자체는 이미 별도로 진행되므로 조용히 무시
    });
  };

  const sortedSiteInfos = useMemo(() => {
    const arr = [...siteInfos];
    arr.sort((a, b) => {
      const aPinned = pins.includes(a.endpoint);
      const bPinned = pins.includes(b.endpoint);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      if (sortMode === 'views') {
        return (clickCounts[b.siteKey] || 0) - (clickCounts[a.siteKey] || 0);
      }
      return a.title.localeCompare(b.title, 'ko');
    });
    return arr;
  }, [siteInfos, pins, clickCounts, sortMode]);

  // 배지에 보여줄 "서버 캐시가 몇 초 전 것인지" — 사이트별 checkedAt 중
  // 가장 최근 값을 기준으로 한다(6개가 거의 같은 주기에 갱신되므로).
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

      <div className="sticky top-16 z-20 mb-4 flex flex-col items-end gap-1 bg-slate-50 py-2">
        <div className="flex items-center gap-3 text-sm">
          <button
            type="button"
            onClick={() => setSortMode('name')}
            className={sortMode === 'name' ? 'font-semibold text-slate-900 underline underline-offset-4' : 'text-slate-500 hover:text-slate-700'}
          >
            {text.dashboard.sortName}
          </button>
          <button
            type="button"
            onClick={() => setSortMode('views')}
            className={sortMode === 'views' ? 'font-semibold text-slate-900 underline underline-offset-4' : 'text-slate-500 hover:text-slate-700'}
          >
            {text.dashboard.sortViews}
          </button>
        </div>
        {sortMode === 'views' && <p className="text-xs text-slate-500">{text.dashboard.sortViewsHint}</p>}
      </div>

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
            pinned={pins.includes(siteInfo.endpoint)}
            onTogglePin={() => togglePin(siteInfo.endpoint, siteInfo.title)}
            onVisit={() => recordVisit(siteInfo.siteKey)}
          />
        ))}
      </div>

      <div
        className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 shadow-sm transition-opacity duration-200 ${
          footerVisible ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
        aria-live="off"
      >
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cacheAgeSeconds == null ? 'bg-slate-300' : 'bg-emerald-500'}`} />
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
