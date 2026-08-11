'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import StatusBar from './statusbar';
import InfoModal from './InfoModal';
import { computeDisplayStatus, buildFetchErrorDetail } from '../lib/statusDetail';
import { useAuth } from '../lib/AuthContext';
import { URL_ROOT } from '../lib/config';
import { SITE_INFOS } from '../lib/siteInfos';

const REFRESH_INTERVAL_MS = 60 * 1000;
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
  const [subscriptions, setSubscriptions] = useState([]); // 카카오 로그인한 유저가 알림 켜둔 사이트
  const [nextRefreshAt, setNextRefreshAt] = useState(() => Date.now() + REFRESH_INTERVAL_MS);
  const [now, setNow] = useState(() => Date.now());
  const [refreshNonce, setRefreshNonce] = useState(0);
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

  // 우측 하단 "N초 후 새로고침" 배지용 1초 틱.
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

  // setInterval 대신 재귀 setTimeout을 써서, 수동 새로고침(refreshNonce 증가)이
  // 눌리면 기존 예약을 깔끔히 취소하고 바로 새 주기를 시작할 수 있게 한다.
  useEffect(() => {
    let timeoutId;
    let cancelled = false;

    const runCycle = async () => {
      setIsDelayed(false);
      delayTimerRef.current = setTimeout(() => setIsDelayed(true), DELAY_NOTICE_MS);

      const promises = siteInfos.map((siteInfo) => {
        return axios
          .get(`${URL_ROOT}${siteInfo.endpoint}`)
          .then((response) => {
            const { status, message, responseTime, error: backendError } = response.data;
            const entry = computeDisplayStatus(siteInfo.title, { status, message, responseTime, backendError });
            setStatusData((prevData) => ({ ...prevData, [siteInfo.endpoint]: entry }));
          })
          .catch((error) => {
            let statusMsg = '상태 점검 실패';
            let statusColor = '#d9534f'; // red
            let responseTime = '점검 실패';

            if (error.response && error.response.status === 429) {
              statusMsg = '잠시 후 시도';
              responseTime = 'N/A';
              setRateLimited(true);
            } else if (error.code === 'ECONNABORTED') {
              statusMsg = '매우 느림(비정상)';
              responseTime = 'N/A';
            }

            const detail = buildFetchErrorDetail(error);

            setStatusData((prevData) => ({
              ...prevData,
              [siteInfo.endpoint]: { statusMsg, statusColor, responseTime, detail },
            }));
          });
      });

      await Promise.all(promises);
      clearTimeout(delayTimerRef.current);
      setIsDelayed(false);

      if (cancelled) return;
      setNextRefreshAt(Date.now() + REFRESH_INTERVAL_MS);
      timeoutId = setTimeout(runCycle, REFRESH_INTERVAL_MS);
    };

    runCycle();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(delayTimerRef.current);
    };
  }, [siteInfos, refreshNonce]);

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

  const secondsUntilRefresh = Math.max(0, Math.round((nextRefreshAt - now) / 1000));

  return (
    <div>
      <div className="sticky top-16 z-20 mb-4 flex flex-col items-end gap-1 bg-slate-50 py-2">
        <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setSortMode('name')}
            className={`rounded-full px-3 py-1 transition ${sortMode === 'name' ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            이름순
          </button>
          <button
            type="button"
            onClick={() => setSortMode('views')}
            className={`rounded-full px-3 py-1 transition ${sortMode === 'views' ? 'bg-white font-medium text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            조회수순
          </button>
        </div>
        {sortMode === 'views' && (
          <p className="text-xs text-slate-400">모든 방문자가 링크를 클릭한 횟수 기준이에요</p>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {sortedSiteInfos.map((siteInfo) => (
          <StatusBar
            key={siteInfo.endpoint}
            title={siteInfo.title}
            url={siteInfo.url}
            href={siteInfo.url}
            statusMsg={statusData[siteInfo.endpoint]?.statusMsg || (isDelayed ? '확인 지연(서버 기동 중...)' : '서버 확인 중...')}
            statusColor={statusData[siteInfo.endpoint]?.statusColor || '#f0ad4e'}
            responseTime={statusData[siteInfo.endpoint]?.responseTime || (isDelayed ? '잠시만 기다려주세요' : '응답 확인 중...')}
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

      <button
        type="button"
        onClick={() => setRefreshNonce((n) => n + 1)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-slate-600 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50"
      >
        <span
          className="inline-block h-2 w-2 rounded-full bg-[#0E207F]"
          style={{ opacity: 0.4 + 0.6 * (1 - secondsUntilRefresh / (REFRESH_INTERVAL_MS / 1000)) }}
        />
        {secondsUntilRefresh}초 후 새로고침
      </button>

      <InfoModal open={rateLimited} onClose={() => setRateLimited(false)} title="잠시 후 다시 시도해주세요">
        <p>
          이 IP에서 너무 많이 확인해서 요청이 잠깐 제한됐습니다 (분당 20회 제한). SMU
          서버 문제가 아니라 이 사이트 자체의 보호 장치이고, 1분 뒤 자동으로 풀립니다.
        </p>
      </InfoModal>
    </div>
  );
}

export default StatusDashboard;
