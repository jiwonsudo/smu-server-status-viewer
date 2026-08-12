// 백엔드가 보낸 사이트 하나의 점검 결과(statuschecker.Result)를 두 군데에
// 다른 수위로 보여준다:
//  - 카드(statusMsg): "정상 서비스" / "비정상 (이유)"처럼 사람이 바로 읽는 말만.
//  - "상세 상태 보기" 모달(detail): HTTP 코드까지 포함한 기술적인 요약
//    ("HTTP 코드 · 이유", 연결됐으면 "응답시간 Nms")을 ok/timeout/error 어느
//    경우든 같은 형태로 통일해서 보여준다.
// Go가 던지는 원본 영문 에러 메시지(err.Error())는 어느 쪽에도 절대
// 그대로 노출하지 않는다 — 사용자에게는 의미 없는 영어일 뿐이라.
//
// 여기 나오는 문구 자체는 전부 lib/text.js의 statusDetail 섹션에서 가져온다 —
// 문구만 고치려면 그 파일만 건드리면 된다.

import text from './text';

export const SLOW_RESPONSE_THRESHOLD_MS = 800;

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

// 상태 API 응답 하나를 카드에 필요한 형태(색/문구/상세)로 한 번에 계산한다.
// 서버 컴포넌트(app/page.js)의 최초 fetch와 클라이언트의 SSE 구독
// (StatusDashboard.jsx) 둘 다 이 함수를 써서 로직이 갈라지지 않게 한다.
export function computeDisplayStatus(siteTitle, { status, message, responseTime, checkedAt }) {
  const detail = buildStatusDetail({ status, message, responseTime });

  // status 문자열을 다시 매칭하지 않고 detail.ok/slow를 기준으로 색을 정한다 —
  // 백엔드가 예상 밖의 값을 보내도(레이트리밋 에러 페이지 등) 항상 detail의
  // 실제 성공/실패 판정을 따르게 해서, 실패인데 초록불이 뜨는 일이 없게 한다.
  let statusColor = '#5cb85c'; // green
  if (!detail.ok) {
    statusColor = '#d9534f'; // red
  } else if (detail.slow) {
    statusColor = '#f0ad4e'; // yellow — 응답은 오지만 느림 (800ms 초과)
  }

  // 카드에는 "정상 서비스 / 비정상(이유)"처럼 사람이 바로 읽는 문구만 보여준다.
  // HTTP 코드 같은 기술적인 내용은 "상세 상태 보기"를 눌렀을 때만(detail.httpCode) 노출한다.
  let statusMsg = detail.ok ? text.statusDetail.cardOkPrefix(detail.reason) : text.statusDetail.cardBadPrefix(detail.reason);
  if (detail.slow) statusMsg += text.statusDetail.slowSuffix;

  return {
    statusMsg,
    statusColor,
    responseTime: responseTime === 'N/A' ? `${responseTime}` : `${responseTime}ms`,
    checkedAt: checkedAt || null, // 백엔드가 이 결과를 캐시에 넣은 시각 — "N초 전 확인됨" 표시용
    detail,
  };
}

