'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import StatusBar from './statusbar';
import InfoModal from './InfoModal';
import { computeDisplayStatus, buildFetchErrorDetail } from '../lib/statusDetail';
import { useAuth } from '../lib/AuthContext';
import { URL_ROOT } from '../lib/config';
import { SITE_INFOS } from '../lib/siteInfos';
import text from '../lib/text';

const REFRESH_INTERVAL_MS = 60 * 1000;
const DELAY_NOTICE_MS = 8 * 1000; // Render 콜드스타트 대응: 이 시간 이상 응답이 없으면 지연 문구 표시
const REQUEST_TIMEOUT_MS = 15 * 1000; // 이거 없으면 백엔드가 느릴 때 요청이 끝없이 매달림

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
  const [subscriptions, setSubscriptions] = useState([]); // 카카오 로그인한 유저가 알림 켜둔 사이트
  const [now, setNow] = useState(() => Date.now());
  const [rateLimited, setRateLimited] = useState(false);

  const { loggedIn } = useAuth();
  const siteInfos = useMemo(() => SITE_INFOS, []);
  const delayTimerRef = useRef(null);

  // localStorage는 브라우저 전용이라 마운트 후(useEffect)에만 읽는다 —
  // SSR 시점엔 window가 없고, 서버/클라이언트 첫 렌더 결과가 달라지면
  // hydration mismatch가 나기 때문.
  useEffect(() => {
    setPins(loadJSON(PIN_STORAGE_KEY, []));
  }, []);

  // 우측 하단 "N초 전 확인됨" 배지가 1초마다 갱신되도록 하는 틱 — 새 요청은 안 보낸다.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
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
    const intervalId = setInterval(fetchClickCounts, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  // 재귀 setTimeout으로 REFRESH_INTERVAL_MS마다 우리 백엔드에 다시 물어본다.
  // 백엔드는 이제 매번 SMU에 라이브로 접속하지 않고 10초 주기 캐시를 즉시
  // 돌려주므로, 이 요청은 가볍다 — 그래서 예전엔 있던 "지금 새로고침" 수동
  // 트리거 버튼은 없앴다(더 이상 누른다고 더 최신 정보가 나오지 않는다).
  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const runCycle = async () => {
      setIsDelayed(false);
      delayTimerRef.current = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);

      const promises = siteInfos.map((siteInfo) => {
        return axios
          .get(`${URL_ROOT}${siteInfo.endpoint}`, { timeout: REQUEST_TIMEOUT_MS })
          .then((response) => {
            const { status, message, responseTime, checkedAt } = response.data;
            const entry = computeDisplayStatus(siteInfo.title, { status, message, responseTime, checkedAt });
            setStatusData((prevData) => ({ ...prevData, [siteInfo.endpoint]: entry }));
          })
          .catch((error) => {
            let statusMsg = text.dashboard.fetchFailStatus;
            let statusColor = '#d9534f'; // red
            let responseTime = text.dashboard.fetchFailResponseTime;

            if (error.response && error.response.status === 429) {
              statusMsg = text.dashboard.rateLimitedStatus;
              responseTime = 'N/A';
              setRateLimited(true);
            } else if (error.code === 'ECONNABORTED') {
              statusMsg = text.dashboard.timeoutStatus;
              responseTime = 'N/A';
            }

            const detail = buildFetchErrorDetail(error);

            setStatusData((prevData) => ({
              ...prevData,
              [siteInfo.endpoint]: { statusMsg, statusColor, responseTime, checkedAt: null, detail },
            }));
          });
      });

      await Promise.all(promises);
      clearTimeout(delayTimerRef.current);
      setIsDelayed(false);

      if (cancelled) return;
      timeoutId = setTimeout(runCycle, REFRESH_INTERVAL_MS);
    };

    runCycle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(delayTimerRef.current);
    };
  }, [siteInfos]);

  useEffect(() => {
    if (!loggedIn) {
      setSubscriptions([]);
      return;
    }
    axios
      .get(`${URL_ROOT}/subscriptions`, { withCredentials: true })
      .then((response) => setSubscriptions(response.data || []))
      .catch(() => setSubscriptions([]));
  }, [loggedIn]);

  const toggleSubscription = (siteKey) => {
    const isSubscribed = subscriptions.includes(siteKey);
    setSubscriptions((prev) => (isSubscribed ? prev.filter((key) => key !== siteKey) : [...prev, siteKey]));

    axios({
      method: isSubscribed ? 'delete' : 'put',
      url: `${URL_ROOT}/subscriptions/${siteKey}`,
      withCredentials: true,
    }).catch(() => {
      // 실패하면 낙관적 업데이트를 되돌린다
      setSubscriptions((prev) => (isSubscribed ? [...prev, siteKey] : prev.filter((key) => key !== siteKey)));
    });
  };

  const togglePin = (endpoint) => {
    setPins((prev) => {
      const next = prev.includes(endpoint) ? prev.filter((key) => key !== endpoint) : [...prev, endpoint];
      try {
        window.localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage 접근 불가(프라이빗 모드 등)해도 기능은 세션 내에서 그대로 동작
      }
      return next;
    });
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
    latestCheckedAtMs != null ? Math.max(0, Math.round((now - latestCheckedAtMs) / 1000)) : null;

  return (
    <div>
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
        {sortMode === 'views' && <p className="text-xs text-slate-400">{text.dashboard.sortViewsHint}</p>}
      </div>

      <div className="flex flex-col gap-4">
        {sortedSiteInfos.map((siteInfo) => (
          <StatusBar
            key={siteInfo.endpoint}
            title={siteInfo.title}
            url={siteInfo.url}
            href={siteInfo.url}
            statusMsg={statusData[siteInfo.endpoint]?.statusMsg || (isDelayed ? text.dashboard.delayedStatus : text.dashboard.checkingStatus)}
            statusColor={statusData[siteInfo.endpoint]?.statusColor || '#f0ad4e'}
            responseTime={statusData[siteInfo.endpoint]?.responseTime || (isDelayed ? text.dashboard.delayedResponseTime : text.dashboard.checkingResponseTime)}
            detail={statusData[siteInfo.endpoint]?.detail}
            pinned={pins.includes(siteInfo.endpoint)}
            onTogglePin={() => togglePin(siteInfo.endpoint)}
            onVisit={() => recordVisit(siteInfo.siteKey)}
            loggedIn={loggedIn}
            subscribed={subscriptions.includes(siteInfo.siteKey)}
            onToggleSubscribe={() => toggleSubscription(siteInfo.siteKey)}
          />
        ))}
      </div>

      <div
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500"
        aria-live="off"
      >
        {cacheAgeSeconds == null ? text.dashboard.cacheChecking : text.dashboard.cacheAgeSuffix(cacheAgeSeconds)}
      </div>

      <InfoModal open={rateLimited} onClose={() => setRateLimited(false)} title={text.dashboard.rateLimitModalTitle}>
        <p>{text.dashboard.rateLimitModalBody}</p>
      </InfoModal>
    </div>
  );
}

export default StatusDashboard;
