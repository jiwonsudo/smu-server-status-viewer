'use client';

import { useState } from 'react';
import { URL_ROOT } from '../lib/config';
import text from '../lib/text';
import { Badge } from './ui/badge';

const VERDICT_VARIANT = {
  일시적: 'success',
  지속적: 'destructive',
  판단보류: 'secondary',
};

// 같은 세션에서 모달을 여러 번 여닫아도 매번 요청하지 않도록 아주 짧게 캐시.
const cache = new Map(); // siteKey -> { at, data }
const CACHE_TTL_MS = 60 * 1000;

async function fetchAnalysis(siteKey) {
  const hit = cache.get(siteKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;
  const res = await fetch(`${URL_ROOT}/api/incidents/${siteKey}/analysis`, { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  cache.set(siteKey, { at: Date.now(), data });
  return data;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  } catch {
    return iso;
  }
}

// 상세 모달의 "장애 이력 / 분석" 섹션. 모든 서비스에 노출된다 — 버튼을
// 누르면 저장된 값(요청 시점에 모델을 부르지 않는다)을 불러온다.
function AiAnalysisSection({ siteKey, isDown }) {
  const [state, setState] = useState('idle'); // idle | loading | error | done
  const [data, setData] = useState(null);

  const load = async () => {
    setState('loading');
    try {
      setData(await fetchAnalysis(siteKey));
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={load}
        className="mt-4 flex min-h-11 w-full items-center justify-center rounded-md border border-border bg-card text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        {isDown ? text.aiAnalysis.openButtonDown : text.aiAnalysis.openButtonNormal}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-border p-3">
      {state === 'loading' && <p className="text-sm text-muted-foreground">{text.aiAnalysis.loading}</p>}
      {state === 'error' && <p className="text-sm text-muted-foreground">{text.aiAnalysis.error}</p>}
      {state === 'done' && <AnalysisBody data={data} isDown={isDown} />}
    </div>
  );
}

function AnalysisBody({ data, isDown }) {
  if (!data?.hasData) {
    return <p className="text-sm text-muted-foreground">{text.aiAnalysis.noData}</p>;
  }

  const incident = data.incident || {};
  const history = data.history || {};
  const recent = data.recent || [];
  const showVerdict = isDown && (data.analysisPending || incident.verdict);

  return (
    <div className="flex flex-col gap-3">
      {showVerdict && <VerdictBlock incident={incident} pending={data.analysisPending} />}

      <div>
        <p className="text-xs font-medium text-muted-foreground">{text.aiAnalysis.stabilityHeading}</p>
        <p className="mt-1 text-sm text-foreground">
          {text.aiAnalysis.stabilitySummary({ count: history.count || 0, median: history.medianMinutes || 0 })}
        </p>
      </div>

      {recent.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground">{text.aiAnalysis.recentHeading}</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-border">·</span>
                {text.aiAnalysis.recentItem({
                  date: fmtDate(r.startedAt),
                  minutes: r.durationMinutes,
                  ongoing: !r.resolvedAt,
                })}
                {r.verdict && <span className="text-xs text-muted-foreground/70">({r.verdict})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showVerdict && incident.verdict && (
        <p className="text-[11px] text-muted-foreground/80">{text.aiAnalysis.disclaimer}</p>
      )}
    </div>
  );
}

function VerdictBlock({ incident, pending }) {
  if (pending && !incident.verdict) {
    return <p className="text-sm text-muted-foreground">{text.aiAnalysis.pending}</p>;
  }
  const verdict = incident.verdict;
  if (!verdict) {
    return <p className="text-sm text-muted-foreground">{text.aiAnalysis.unavailable}</p>;
  }
  const confidencePct = incident.verdictConfidence != null ? Math.round(incident.verdictConfidence * 100) : null;

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={VERDICT_VARIANT[verdict] || 'secondary'}>
          {text.aiAnalysis.verdictLabel[verdict] || verdict}
        </Badge>
        {confidencePct != null && (
          <span className="text-xs text-muted-foreground">{text.aiAnalysis.confidence(confidencePct)}</span>
        )}
      </div>
      {incident.verdictEta && (
        <p className="text-sm text-foreground">
          <span className="text-muted-foreground">{text.aiAnalysis.etaPrefix}</span>
          {incident.verdictEta}
        </p>
      )}
      {incident.verdictReasoning && (
        <p className="text-sm leading-relaxed text-muted-foreground">{incident.verdictReasoning}</p>
      )}
    </div>
  );
}

export default AiAnalysisSection;
