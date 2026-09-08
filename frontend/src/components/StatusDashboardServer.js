import StatusDashboard from './StatusDashboard';
import { SITE_INFOS } from '../lib/siteInfos';
import { computeDisplayStatus } from '../lib/statusDetail';
import { URL_ROOT } from '../lib/config';

// Server-side prefetch so crawlers get the real status text in the initial
// HTML. Wrapped in <Suspense> by app/page.js so the page shell renders
// immediately while this runs. Responses are cached for 15s (the backend's
// own refresh period), so most visitors get Vercel's cached value with no
// wait and the client upgrades to live data over SSE after hydration.
async function fetchInitialStatusData() {
  const entries = await Promise.all(
    SITE_INFOS.map(async (siteInfo) => {
      try {
        const res = await fetch(`${URL_ROOT}${siteInfo.endpoint}`, {
          next: { revalidate: 15 },
          // Only the cold-cache case actually waits on the backend; cut it
          // short and let the skeleton show, then SSE fills in.
          signal: AbortSignal.timeout(2500),
        });
        if (!res.ok) return [siteInfo.endpoint, null];
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
