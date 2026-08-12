// 이 프로젝트(프론트엔드)에서 화면에 보이는 한글/영문 문구를 전부 모아둔 곳.
// 문구만 고치고 싶으면 이 파일만 수정하면 된다 — 컴포넌트 쪽 코드는 안 건드려도 됨.
// className, 콘솔 로그, 백엔드(Go) 쪽 문구는 여기 대상이 아니다.

const text = {
  site: {
    name: '스뮤온',
    tagline: '상명대 서버 실시간 상태 확인',
    logoAlt: '스뮤온 로고',
  },

  footer: {
    copyright: '© 2026. Jiwon Jeong All rights reserved.',
  },

  meta: {
    title: '상명대 서버 상태 실시간 확인 | 스뮤온',
    description:
      '이캠퍼스, 샘물, 홈페이지 등 상명대 주요 서버의 실시간 장애 여부를 확인하세요. 서버 다운/복구 시 카카오톡 알림도 받을 수 있습니다.',
    keywords: [
      '이캠 안됨',
      '이캠퍼스 안됨',
      '이캠 접속장애',
      '이캠퍼스 접속안됨',
      '이캠 서버 다운',
      '코스모스 안됨',
      '상명대 서버 상태',
      '상명대 이캠퍼스 상태 확인',
      '상명대 홈페이지 접속 안됨',
      '스뮤온',
      '스뮤야 괜찮아',
      'issmuok',
    ],
  },

  ogImage: {
    alt: '스뮤온 — 상명대 서버 실시간 상태 확인',
    heading: '스뮤온',
    subheading: '상명대 서버 실시간 상태 확인',
    footer: '이캠 안됨? 이캠퍼스(코스모스) 접속장애? 여기서 바로 확인하세요',
  },

  nav: {
    about: '소개',
    contact: '문의',
    kakaoShort: '카톡알림받기',
    kakaoLong: '카톡으로 알림받기',
  },

  about: {
    modalTitle: '스뮤온 — 상명대 서버 실시간 상태 확인',
    intro:
      '이캠 안됨, 이캠퍼스(코스모스) 접속장애처럼 상명대 서버가 이상할 때 제일 먼저 확인하는 곳입니다. 상명대학교 서울캠퍼스에서 자주 쓰는 주요 서비스 10곳의 접속 가능 여부와 응답 속도를 실시간으로 보여줍니다.',
    servicesHeading: '확인하는 서비스',
    services: [
      '홈페이지 / 이캠퍼스 / 샘물(통합정보시스템)',
      'SM Challenge(진로·취업 포트폴리오) / Office 365(클라우드메일)',
      '학생생활관',
    ],
    colorHeading: '카드 왼쪽 테두리 색이 뜻하는 것',
    colorOk: '정상 — 800ms 이내로 응답 (구글 웹 성능 기준 "Good")',
    colorSlow: '느림 — 접속은 되지만 800ms 넘게 걸림',
    colorDown: '응답 없음 — 5초 넘게 무응답이거나 오류 응답',
    detailHint: '각 카드의 "상세 상태 보기"를 누르면 HTTP 상태 코드와 이유, 응답 시간을 자세히 볼 수 있습니다.',
    intervalHeading: '점검 주기',
    intervalBody:
      '화면은 60초마다 자동으로 다시 확인합니다. 이와 별도로 5분마다 백그라운드에서도 점검해서 상태가 바뀐 기록을 남기고 있어요(추후 이메일·카카오톡 알림과 연동 예정).',
    sortHeading: '정렬 / 즐겨찾기',
    sortBody:
      '☆를 누르면 자주 보는 사이트를 목록 맨 위에 고정할 수 있어요(이 브라우저에만 저장됨). 정렬 기준은 이름순 또는 전체 방문자의 조회수 순으로 바꿀 수 있습니다.',
  },

  contact: {
    modalTitle: '문의 / 건의사항',
    intro: '이런 내용을 남겨주시면 도움이 됩니다.',
    reasons: [
      '사이트가 이상하게 동작하거나 오류가 보일 때 (버그 제보)',
      '모니터링에 추가하거나 빼줬으면 하는 SMU 서비스',
      '있었으면 하는 기능 제안',
      '기타 궁금한 점',
    ],
    emailNote: '이메일은 선택 사항이에요 — 안 남기면 익명으로 전달되고, 남기면 그 주소로 답장드립니다.',
    namePlaceholder: '이름 (선택)',
    emailPlaceholder: '답장 받을 이메일 (선택)',
    messagePlaceholder: '문의 또는 건의사항을 입력해주세요',
    sendingLabel: '전송 중...',
    sendLabel: '보내기',
    successMessage: '전송됐습니다. 감사합니다!',
    errorMessage: '전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  },

  kakao: {
    modalTitle: '카카오톡으로 실시간 알림받기',
    notConfiguredBadge: '카카오 로그인 준비 중',
    featureHeading: '이런 기능이에요',
    featureBody:
      '카카오 로그인을 하고 사이트 카드의 🔔를 켜두면, 그 사이트가 다운되거나 다시 복구될 때 새로고침하지 않아도 카카오톡으로 바로 알림을 받습니다.',
    notConfiguredHeading: '왜 아직 로그인이 안 되나요',
    notConfiguredBody:
      '카카오 쪽 앱 등록과 메시지 전송 권한 승인이 끝나야 로그인 버튼이 실제로 동작합니다. 준비되는 대로 이 배지가 사라지고 바로 로그인할 수 있게 될게요.',
    loadingLabel: '로그인 상태 확인 중...',
    loggedInSuffix: '님으로 로그인됨',
    logoutLabel: '로그아웃',
    loginLabel: '카카오 로그인',
  },

  faqHeading: '자주 묻는 질문',
  faq: [
    {
      question: '이캠퍼스(코스모스)가 안 될 때 어떻게 확인하나요?',
      answer:
        '이 페이지 상단의 "상명대학교 이캠퍼스" 카드에서 실시간 상태를 바로 확인할 수 있습니다. 60초마다 자동으로 다시 확인하며, "상세 상태 보기"를 누르면 서버가 실제로 보낸 응답 메시지도 볼 수 있습니다.',
    },
    {
      question: '상명대 서버 장애 알림을 어떻게 받나요?',
      answer:
        '상단의 "카톡으로 알림받기"에서 카카오 로그인을 하면, 각 사이트 카드의 🔔를 켜서 원하는 서비스만 골라 구독할 수 있습니다. 구독한 사이트가 다운되거나 복구되면 카카오톡으로 바로 알림이 옵니다.',
    },
  ],

  loading: {
    checkingStatus: '서버 상태 확인 중...',
  },

  dashboard: {
    sortName: '이름순',
    sortViews: '조회수순',
    sortViewsHint: '모든 방문자가 링크를 클릭한 횟수 기준이에요',
    delayedStatus: '확인 지연(서버 기동 중...)',
    checkingStatus: '서버 확인 중...',
    delayedResponseTime: '잠시만 기다려주세요',
    checkingResponseTime: '응답 확인 중...',
    fetchFailStatus: '상태 점검 실패',
    fetchFailResponseTime: '점검 실패',
    rateLimitedStatus: '잠시 후 시도',
    timeoutStatus: '매우 느림(비정상)',
    cacheChecking: '서버 확인 중...',
    cacheAgeSuffix: (seconds) => `${seconds}초 전 서버 확인됨`,
    rateLimitModalTitle: '잠시 후 다시 시도해주세요',
    rateLimitModalBody:
      '이 IP에서 너무 많이 확인해서 요청이 잠깐 제한됐습니다 (분당 20회 제한). SMU 서버 문제가 아니라 이 사이트 자체의 보호 장치이고, 1분 뒤 자동으로 풀립니다.',
  },

  statusBar: {
    pinAdd: '즐겨찾기 추가',
    pinRemove: '즐겨찾기 해제',
    subscribeOn: '카카오톡 알림 받기',
    subscribeOff: '카카오톡 알림 해제',
    detailButton: '상세 상태 보기',
  },

  detailModal: {
    resultLabel: '점검 결과',
    notConnected: '연결 안 됨',
    responseTime: (ms) => `응답시간 ${ms}ms`,
    close: '닫기',
  },

  infoModal: {
    close: '닫기',
  },

  // buildStatusDetail(백엔드가 실제로 응답한 경우)와 buildFetchErrorDetail(요청
  // 자체가 실패한 경우)에서 쓰는 문구. reason은 카드에도(statusDetail.js가
  // "비정상 (이유)" 형태로 조립) 그대로 쓰이니 너무 길게 쓰지 않는다.
  statusDetail: {
    ok: {
      reason: '정상 서비스',
      explanationFast: '이 서버가 정상적으로 응답하고 있어요. 지금 바로 접속하셔도 문제없습니다.',
      explanationSlow: (responseTime) =>
        `이 서버는 응답하고 있지만 평소보다 느립니다 (${responseTime}ms). 일반적으로 800ms 이내를 빠른 응답으로 보는데 지금은 그보다 오래 걸리고 있어요. 접속 자체는 되지만 페이지 로딩이 느릴 수 있습니다.`,
    },
    timeout: {
      reason: '타임아웃',
      explanation:
        'SMU 서버가 5초 안에 응답하지 않았습니다. SMU 서버 자체가 느려졌거나 일시적으로 다운됐을 가능성이 높습니다. 잠시 후 다시 확인해보세요.',
    },
    httpError: {
      reason: '오류 응답',
      explanation: (code) =>
        `SMU 서버가 정상 페이지 대신 오류 화면(HTTP ${code})을 돌려주고 있습니다. 서버 점검 중이거나, 페이지 주소가 바뀌었거나, 일시적인 오류일 수 있습니다.`,
    },
    connectionFailure: {
      reason: '연결 실패',
      explanation: 'SMU 서버에 아예 연결할 수 없는 상태입니다. 서버가 완전히 다운됐거나, 네트워크 설정이 바뀌었을 가능성이 있습니다.',
    },
    slowSuffix: ' (느림)',
    cardOkPrefix: (reason) => reason,
    cardBadPrefix: (reason) => `비정상 (${reason})`,

    fetchRateLimited: {
      reason: '요청 제한',
      explanation:
        '이 IP에서 너무 많이 확인해서 잠깐 제한됐습니다 (분당 20회 제한). 이건 SMU 서버가 아니라 이 상태 확인 사이트 자체의 보호 장치이고, 1분 뒤 자동으로 풀립니다.',
    },
    fetchTimeout: {
      reason: '타임아웃',
      explanation: '이 상태 확인 사이트의 백엔드가 15초 안에 응답하지 않았습니다.',
    },
    fetchHttpError: {
      reason: '오류 응답',
      explanation: (statusCode) => `이 상태 확인 사이트의 백엔드가 오류(HTTP ${statusCode})를 돌려줬습니다.`,
    },
    fetchConnectionFailure: {
      reason: '연결 실패',
      explanation:
        '이 상태 확인 사이트의 백엔드 서버 자체에 연결할 수 없습니다. 사이트 관리자가 아직 배포하지 않았거나, 일시적인 네트워크 문제일 수 있습니다. (SMU 서버 문제가 아닙니다.)',
    },
  },

  // siteInfos.js가 URL/endpoint 같은 데이터와 함께 이 title/alias를 조합해서 쓴다.
  sites: {
    home: { title: '상명대학교 홈페이지' },
    ecampus: { title: '상명대학교 이캠퍼스', alias: '코스모스' },
    sammul: { title: '상명대학교 샘물(통합정보시스템)' },
    career: { title: 'SM Challenge (진로·취업 포트폴리오)' },
    cloud: { title: 'Office 365 (클라우드메일)' },
    'dorm-seoul': { title: '학생생활관' },
  },
};

export default text;
