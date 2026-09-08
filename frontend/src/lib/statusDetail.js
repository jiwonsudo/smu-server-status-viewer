// Turns one site's check result (statuschecker.Result) into what the UI
// needs, at two levels of detail:
//  - card (statusMsg): plain human wording only.
//  - detail modal (detail): a technical summary including the HTTP code.
// Go's raw English error strings are never shown either way.
//
// All wording comes from lib/text.js (statusDetail section).

import text from './text';

export const SLOW_RESPONSE_THRESHOLD_MS = 800;

// statusLevel collapses a detail object into the one token the UI styles on:
// 'down' | 'slow' | 'ok', or 'loading' when there's no detail yet.
export function statusLevel(detail) {
  if (!detail) return 'loading';
  if (!detail.ok) return 'down';
  if (detail.slow) return 'slow';
  return 'ok';
}

export function buildStatusDetail({ status, message, responseTime }) {
  if (status === 'ok') {
    const isSlow = typeof responseTime === 'number' && responseTime > SLOW_RESPONSE_THRESHOLD_MS;
    return {
      ok: true,
      slow: isSlow,
      explanation: isSlow
        ? text.statusDetail.ok.explanationSlow(responseTime)
        : text.statusDetail.ok.explanationFast,
      httpCode: 200,
      reason: text.statusDetail.ok.reason,
      responseTimeMs: responseTime,
    };
  }

  if (status === 'timeout') {
    return {
      ok: false,
      explanation: text.statusDetail.timeout.explanation,
      httpCode: null,
      reason: text.statusDetail.timeout.reason,
      responseTimeMs: null,
    };
  }

  // status === 'error'
  const httpCodeMatch = /서비스 비정상: (\d+)/.exec(message);
  if (httpCodeMatch) {
    const code = Number(httpCodeMatch[1]);
    return {
      ok: false,
      explanation: text.statusDetail.httpError.explanation(code),
      httpCode: code,
      reason: text.statusDetail.httpError.reason,
      responseTimeMs: typeof responseTime === 'number' ? responseTime : null,
    };
  }

  return {
    ok: false,
    explanation: text.statusDetail.connectionFailure.explanation,
    httpCode: null,
    reason: text.statusDetail.connectionFailure.reason,
    responseTimeMs: null,
  };
}

// Computes the card shape (message / detail) for one status response. Used
// by both the server prefetch and the client SSE handler so the logic
// doesn't diverge.
export function computeDisplayStatus(siteTitle, { status, message, responseTime, checkedAt }) {
  const detail = buildStatusDetail({ status, message, responseTime });

  let statusMsg = detail.ok ? text.statusDetail.cardOkPrefix(detail.reason) : text.statusDetail.cardBadPrefix(detail.reason);
  if (detail.slow) statusMsg += text.statusDetail.slowSuffix;

  return {
    statusMsg,
    responseTime: responseTime === 'N/A' ? `${responseTime}` : `${responseTime}ms`,
    checkedAt: checkedAt || null, // when the backend cached this result — for the "N초 전" badge
    detail,
  };
}
