// 백엔드 응답(또는 요청 자체의 실패)을 "상세 상태 보기" 모달에 보여줄
// 형태로 정리한다. 전공자가 아니어도 이해할 수 있는 설명을 우선한다.
// heading(모달 제목)은 따로 안 만들고 카드에 이미 보이는 statusMsg를
// 그대로 재사용한다 — 접었다 펼쳤다 해도 같은 문구를 봐야 하니까.

// Google의 TTFB(Time to First Byte) 기준: 800ms 이하가 "Good", 800~1800ms가
// "Needs improvement", 1800ms 초과가 "Poor" (web.dev/articles/ttfb). 여기선
// "Good" 문턱값을 넘으면 완전히 다운된 건 아니지만 눈에 띄게 느리다고 보고
// 노란불로 경고한다.
export const SLOW_RESPONSE_THRESHOLD_MS = 800;

export function buildStatusDetail({ status, message, responseTime, backendError }) {
  if (status === 'ok') {
    const isSlow = typeof responseTime === 'number' && responseTime > SLOW_RESPONSE_THRESHOLD_MS;
    return {
      ok: true,
      slow: isSlow,
      explanation: isSlow
        ? `이 서버는 응답하고 있지만 평소보다 느립니다 (${responseTime}ms). 일반적으로 800ms 이내를 빠른 응답으로 보는데 지금은 그보다 오래 걸리고 있어요. 접속 자체는 되지만 페이지 로딩이 느릴 수 있습니다.`
        : '이 서버가 정상적으로 응답하고 있어요. 지금 바로 접속하셔도 문제없습니다.',
      rawMessage: message,
      meta: `HTTP 200 · 응답속도 ${responseTime}ms`,
    };
  }

  if (status === 'timeout') {
    return {
      ok: false,
      explanation:
        'SMU 서버가 5초 안에 응답하지 않았습니다. SMU 서버 자체가 느려졌거나 일시적으로 다운됐을 가능성이 높습니다. 잠시 후 다시 확인해보세요.',
      rawMessage: backendError || message,
      meta: '응답 대기 5초 초과',
    };
  }

  // status === 'error'
  const httpCodeMatch = /서비스 비정상: (\d+)/.exec(message);
  if (httpCodeMatch) {
    const code = httpCodeMatch[1];
    return {
      ok: false,
      explanation: `SMU 서버가 정상 페이지 대신 오류 화면(HTTP ${code})을 돌려주고 있습니다. 서버 점검 중이거나, 페이지 주소가 바뀌었거나, 일시적인 오류일 수 있습니다.`,
      rawMessage: message,
      meta: `HTTP ${code}`,
    };
  }

  return {
    ok: false,
    explanation:
      'SMU 서버에 아예 연결할 수 없는 상태입니다. 서버가 완전히 다운됐거나, 네트워크 설정이 바뀌었을 가능성이 있습니다.',
    rawMessage: backendError || message,
    meta: '연결 불가',
  };
}

// 상태 API 응답 하나를 카드에 필요한 형태(색/문구/상세)로 한 번에 계산한다.
// 서버 컴포넌트(app/page.js)의 최초 fetch와 클라이언트 폴링
// (StatusDashboard.jsx) 둘 다 이 함수를 써서 로직이 갈라지지 않게 한다.
export function computeDisplayStatus(siteTitle, { status, message, responseTime, backendError }) {
  const detail = buildStatusDetail({ status, message, responseTime, backendError });

  let statusColor = '#f0ad4e'; // default yellow
  let statusMsg = message;
  if (status === 'ok' && !detail.slow) {
    statusColor = '#5cb85c'; // green
  } else if (status === 'ok' && detail.slow) {
    statusColor = '#f0ad4e'; // yellow — 응답은 오지만 느림 (800ms 초과)
    statusMsg = `느림 (${message})`;
  } else if (status === 'timeout' || status === 'error') {
    statusColor = '#d9534f'; // red
  }

  return {
    statusMsg,
    statusColor,
    responseTime: responseTime === 'N/A' ? `${responseTime}` : `${responseTime}ms`,
    detail,
  };
}

export function buildFetchErrorDetail(error) {
  if (error.response && error.response.status === 429) {
    return {
      ok: false,
      explanation:
        '이 IP에서 너무 많이 확인해서 잠깐 제한됐습니다 (분당 20회 제한). 이건 SMU 서버가 아니라 이 상태 확인 사이트 자체의 보호 장치이고, 1분 뒤 자동으로 풀립니다.',
      rawMessage: 'HTTP 429 Too Many Requests',
      meta: '분당 20회 제한',
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      ok: false,
      explanation: '이 상태 확인 사이트의 백엔드가 5초 안에 응답하지 않았습니다.',
      rawMessage: error.message,
      meta: '응답 대기 5초 초과',
    };
  }

  if (error.response) {
    return {
      ok: false,
      explanation: `이 상태 확인 사이트의 백엔드가 오류(HTTP ${error.response.status})를 돌려줬습니다.`,
      rawMessage: error.message,
      meta: `HTTP ${error.response.status}`,
    };
  }

  return {
    ok: false,
    explanation:
      '이 상태 확인 사이트의 백엔드 서버 자체에 연결할 수 없습니다. 사이트 관리자가 아직 배포하지 않았거나, 일시적인 네트워크 문제일 수 있습니다. (SMU 서버 문제가 아닙니다.)',
    rawMessage: error.message,
    meta: '연결 불가',
  };
}
