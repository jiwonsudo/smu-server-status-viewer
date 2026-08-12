import { Suspense } from 'react';
import StatusDashboardServer from '../components/StatusDashboardServer';
import StatusLoading from '../components/StatusLoading';
import text from '../lib/text';

export default function Home() {
  return (
    <>
      <header className="sr-only">
        <h1>{text.site.name}</h1>
        <p>{text.site.tagline}</p>
      </header>

      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<StatusLoading />}>
          <StatusDashboardServer />
        </Suspense>
      </div>
    </>
  );
}
