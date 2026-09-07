'use client';

import { useState } from 'react';
import { URL_ROOT } from '../lib/config';
import text from '../lib/text';

const VERDICT_STYLES = {
  일시적: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  지속적: 'bg-red-50 text-red-700 ring-red-600/20',
  판단보류: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

// 상세 모달 안에서 비정상 서비스에만 노출되는 "AI가 분석한 과거 패턴" 섹션.
// 버튼을 누르면 백엔드에 저장된 판정(요청 시점에 LLM을 부르지 않는다)을
// 불러와 보여준다.
function AiAnalysisSection({ siteKey }) {
  const [state, setState] = useState('idle'); // idle | loading | error | done
  const [data, setData] = useState(null);

  const load = async () => {
    setState('loading');
    try {
      const res = await fetch(`${URL_ROOT}/api/incidents/${siteKey}/analysis`, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      setData(await res.json());
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
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
      >
        <span aria-hidden="true">✨</span>
        {text.aiAnalysis.openButton}
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 p-3">
      {state === 'loading' && <p className="text-sm text-slate-500">{text.aiAnalysis.loading}</p>}
      {state === 'error' && <p className="text-sm text-slate-500">{text.aiAnalysis.error}</p>}
      {state === 'done' && <AnalysisBody data={data} />}
    </div>
  );
}

function AnalysisBody({ data }) {
  if (!data?.hasData) {
    return <p className="text-sm text-slate-500">{text.aiAnalysis.noData}</p>;
  }
  if (data.analysisPending) {
    return <p className="text-sm text-slate-500">{text.aiAnalysis.pending}</p>;
  }

  const incident = data.incident || {};
  const verdict = incident.verdict;
  if (!verdict) {
    return <p className="text-sm text-slate-500">{text.aiAnalysis.unavailable}</p>;
  }

  const history = data.history || {};
  const confidencePct = incident.verdictConfidence != null ? Math.round(incident.verdictConfidence * 100) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
            VERDICT_STYLES[verdict] || VERDICT_STYLES['판단보류']
          }`}
        >
          {text.aiAnalysis.verdictLabel[verdict] || verdict}
        </span>
        {confidencePct != null && (
          <span className="text-xs text-slate-400">{text.aiAnalysis.confidence(confidencePct)}</span>
        )}
      </div>

      {incident.verdictEta && (
        <p className="text-sm text-slate-700">
          <span className="text-slate-400">{text.aiAnalysis.etaPrefix}</span>
          {incident.verdictEta}
        </p>
      )}

      {incident.verdictReasoning && (
        <p className="text-sm leading-relaxed text-slate-600">{incident.verdictReasoning}</p>
      )}

      {history.count > 0 && (
        <p className="text-xs text-slate-400">
          {text.aiAnalysis.historyNote({ count: history.count, median: history.medianMinutes })}
        </p>
      )}

      <p className="mt-1 text-[11px] text-slate-400">{text.aiAnalysis.disclaimer}</p>
    </div>
  );
}

export default AiAnalysisSection;
