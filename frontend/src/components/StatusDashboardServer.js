import StatusDashboard from './StatusDashboard';
import { SITE_INFOS } from '../lib/siteInfos';
import { computeDisplayStatus } from '../lib/statusDetail';
import { URL_ROOT } from '../lib/config';

// 크롤러가 JS 실행 없이도 실제 상태 텍스트를 읽을 수 있도록, 서버에서
// 먼저 전체 사이트를 점검하고 그 결과를 초기 HTML에 그대로 굽는다.
// 이 컴포넌트는 app/page.js에서 <Suspense>로 감싸서 쓴다 — 그래야 이
// fetch가 오래 걸려도 페이지 뼈대(Nav, FAQ 등)는 즉시 뜨고, 로딩 중엔
// page.js가 지정한 fallback(스피너)만 이 자리에 보인다.
async function fetchInitialStatusData() {
  const entries = await Promise.all(
    SITE_INFOS.map(async (siteInfo) => {
      try {
        const res = await fetch(`${URL_ROOT}${siteInfo.endpoint}`, {
          // 상태는 사용자별이 아니라 전역이고 백엔드가 15초마다 갱신한다.
          // Data Cache에 15초 TTL로 캐시하면 대부분의 방문자는 Vercel이
          // 즉시 서빙하는 캐시 값을 받고(백엔드 대기 0), 갱신은 백그라운드
          // (stale-while-revalidate)에서 일어난다 — Render 콜드스타트가
          // 더 이상 첫 페인트를 막지 않는다. 클라이언트는 하이드레이션
          // 직후 SSE로 라이브 값을 받아 곧바로 최신화한다.
          // (요청 시점 API인 headers()를 여기서 쓰면 이 fetch가 캐시
          // 대상에서 빠지므로, 예전의 방문자 IP 전달 로직은 제거했다.
          // 캐시 히트는 백엔드에 아예 안 가고, 갱신 요청은 엔드포인트당
          // 15초에 1회뿐이라 레이트리밋과 무관하다.)
          next: { revalidate: 15 },
          // 캐시가 완전히 비어있을 때(첫 배포/콜드)만 이 fetch가 실제로
          // 백엔드를 기다린다 — 그 경우에도 짧게 끊고 스켈레톤을 먼저
          // 보여준 뒤 SSE가 채우게 한다.
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) return [siteInfo.endpoint, null]; // 429 등 — 클라이언트 쪽 SSE가 곧 다시 채운다
        const data = await res.json();
        return [siteInfo.endpoint, computeDisplayStatus(siteInfo.title, data)];
      } catch {
        return [siteInfo.endpoint, null];
      }
    })
  );
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

export default async function StatusDashboardServer() {
  const initialStatusData = await fetchInitialStatusData();
  return <StatusDashboard initialStatusData={initialStatusData} />;
}
