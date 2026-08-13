import { headers } from 'next/headers';
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
  // 이 fetch는 Vercel 서버가 백엔드로 보내는 서버-서버 요청이라 원래는
  // 방문자 IP가 안 실린다 — 그러면 백엔드 레이트리밋(분당 20회/IP)이
  // 모든 방문자의 SSR 요청을 같은 IP 하나로 착각해서 묶어버린다. 그래서
  // 지금 요청을 받은 원본 방문자 IP를 그대로 다시 실어보낸다.
  const incomingHeaders = await headers();
  const visitorIP = incomingHeaders.get('x-forwarded-for') || incomingHeaders.get('x-real-ip');

  const entries = await Promise.all(
    SITE_INFOS.map(async (siteInfo) => {
      try {
        const res = await fetch(`${URL_ROOT}${siteInfo.endpoint}`, {
          cache: 'no-store',
          headers: visitorIP ? { 'X-Forwarded-For': visitorIP } : undefined,
          // 백엔드(Render)가 느리거나 콜드스타트 중이면 이 fetch가 그대로
          // LCP를 끌고 내려간다(실측 14초까지 봄) — 클라이언트가 하이드레이션
          // 직후 SSE로 어차피 실시간 데이터를 다시 받아오니, SSR은 짧게
          // 끊고 실패로 처리해서 로딩 스켈레톤을 먼저 보여주는 게 낫다.
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
