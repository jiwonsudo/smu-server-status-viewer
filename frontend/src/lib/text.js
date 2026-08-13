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
    privacyLabel: '개인정보처리방침',
  },

  meta: {
    title: '스뮤온 | 상명대 서버 상태 실시간 확인',
    description:
      '이캠퍼스, 샘물, 홈페이지 등 상명대 주요 서버의 실시간 장애 여부를 확인하세요. 서버 다운/복구 시 디스코드 알림도 받을 수 있습니다.',
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
    footer: '상명대 서버 접속 안될 때, 여기서 바로 확인하세요!',
  },

  nav: {
    about: '소개',
    faq: 'FAQ',
    contact: '개선요청 및 문의',
    discordCta: '디스코드로 알림받기',
    menuLabel: '메뉴',
  },

  toast: {
    pinAdded: (title) => `☆ ${title} 즐겨찾기에 추가했어요`,
    pinRemoved: (title) => `${title} 즐겨찾기에서 제거했어요`,
  },

  about: {
    modalTitle: '스뮤온 / 상명대 서버 실시간 상태 확인',
    intro:
      '상명대학교 관련 웹사이트의 서버 오류가 의심될 때, 서버의 상태를 확인할 수 있는 서비스입니다. 서울캠퍼스 학우들이 자주 쓰는 주요 서비스들의 접속 가능 여부와 응답 속도를 실시간으로 보여줍니다.',
    servicesHeading: '현 서비스 사이트 목록',
    services: [
      '상명대학교 메인 홈페이지',
      '상명대학교 e-campus',
      '상명대학교 샘물(통합정보시스템)',
      'Office 365(클라우드메일)',
      '상명대 학생생활관 홈페이지',
      '상명대학교 수강신청',
    ],
    colorHeading: '각 상태 카드 왼쪽 테두리 색은 다음을 의미해요:',
    colorOk: "정상 — 구글 웹 성능 기준 '좋음'인 800ms 이내로 응답한 경우",
    colorSlow: '느림 — 접속은 가능하나 응답 시간이 800ms를 넘는 경우',
    colorDown: '비정상 — 5초 넘게 응답이 없거나 실제 서버 장애가 있는 경우',
    detailHint: "각 카드의 '상세 상태 보기'를 누르면 응답 시간을 비롯한 정보들을 자세히 볼 수 있어요.",
    intervalHeading: '서버 상태 점검 주기',
    intervalBody:
      '서비스 사이트들의 서버 상태 정보는 15초마다 자동으로 갱신돼요.',
    sortHeading: '즐겨찾기 / 정렬',
    sortBody:
      '☆을 누르면 자주 확인하는 사이트를 목록 맨 위에 고정할 수 있어요. 즐겨찾기 정보는 현재 브라우저에 저장됩니다. 정렬 기능은 이름순 또는 스뮤온 방문자의 사이트 조회수 순으로 바꿀 수 있습니다.',
  },

  contact: {
    modalTitle: '개선요청 및 문의',
    intro: '이런 내용을 남겨주시면 도움이 됩니다.',
    reasons: [
      '사이트가 이상하게 동작하거나 오류가 보일 때 (버그 제보)',
      '모니터링에 추가하거나 빼줬으면 하는 SMU 서비스',
      '있었으면 하는 기능 제안',
      '기타 궁금한 점',
    ],
    emailNote: '이메일은 선택 사항이에요 — 안 남기면 익명으로 전달되고, 남기면 그 주소로 답장드립니다.',
    abuseNotice: '문의 취지에서 벗어난 욕설, 비방, 허위사실 등이 포함된 내용은 관련 법령에 따라 법적 책임을 질 수 있습니다.',
    namePlaceholder: '이름 (선택)',
    emailPlaceholder: '답장 받을 이메일 (선택)',
    messagePlaceholder: '문의 또는 건의사항을 입력해주세요',
    sendingLabel: '전송 중...',
    sendLabel: '보내기',
    successMessage: '전송됐습니다. 감사합니다!',
    errorMessage: '전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  },

  discord: {
    modalTitle: '디스코드로 실시간 서버 상태 알림받기',
    intro:
      '로그인이나 개인정보 입력 없이, 디스코드 서버에 참여하는 것만으로 서버가 다운되거나 복구될 때 바로 알림을 받아볼 수 있어요.',
    stepsHeading: '알림 받는 방법',
    steps: [
      '아래 버튼으로 디스코드 서버에 참여하기',
      '사이트별로 나뉜 알림 채널이 보여요 — 기본으로 다 켜져 있어요',
      '관심 없는 사이트가 있으면 그 채널만 뮤트하면 끝',
    ],
    cta: '디스코드 서버 참여하기',
  },

  faqHeading: '자주 묻는 질문',
  faq: [
    {
      question: '이 사이트, 상명대학교에서 만든 공식 사이트인가요?',
      answer:
        '아니요, 학생이 개인적으로 만든 비공식 사이트예요. 학교와 직접적인 관련은 없고, 공개적으로 접속 가능한 상명대 서버들의 상태를 대신 확인해서 보여드리는 것뿐이에요.',
    },
    {
      question: '디스코드로 알림받으려면 뭐가 필요한가요?',
      answer:
        '나브바의 \'디스코드로 알림받기\'를 눌러서 서버에 참여하면 끝이에요. 로그인이나 개인정보 입력이 전혀 필요 없어요. 관심 없는 사이트의 알림 채널은 뮤트해두면 됩니다.',
    },
    {
      question: "이캠퍼스는 잘 되는데 여기서는 '비정상'이라고 떠요. 오류인가요?",
      answer:
        "이 사이트는 서버 상태를 15초마다 한 번씩 자동으로 확인해서 보여드리는 방식이라, 실제 상태와 최대 몇 초 정도 차이가 날 수 있어요. 계속 다르게 보인다면 각 카드의 '상세 상태 보기'에서 실제로 어떤 응답이 왔는지 확인해보시고, 그래도 이상하면 맨 아래 '개선요청 및 문의'로 알려주세요.",
    },
    {
      question: '디스코드 알림 채널에서 글도 쓸 수 있나요?',
      answer:
        '아니요, 알림 채널은 공지 전용이라 저(운영자)만 글을 올릴 수 있어요. 채팅은 못 하고, 알림만 받아보는 구조예요.',
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
    cacheChecking: '서버 확인 중...',
    cacheAgeSuffix: (seconds) => `${seconds}초 전 갱신됨`,
    nextUpdateSuffix: (seconds) => `${seconds}초 후 업데이트`,
  },

  statusBar: {
    pinAdd: '즐겨찾기 추가',
    pinRemove: '즐겨찾기 해제',
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

  // buildStatusDetail(statusDetail.js)에서 쓰는 문구. reason은 카드에도
  // ("비정상 (이유)" 형태로 조립) 그대로 쓰이니 너무 길게 쓰지 않는다.
  statusDetail: {
    ok: {
      reason: '정상 서비스',
      explanationFast: '이 서버가 정상적으로 응답하고 있어요. 지금 바로 접속하셔도 문제없습니다.',
      explanationSlow: (responseTime) =>
        `이 서버는 요청에 응답하고 있지만, 응답 시간이 빠른 응답 시간의 기준인 800ms보다 느립니다 (${responseTime}ms). 접속 자체는 되지만, 페이지 로딩이 느릴 수 있어요.`,
    },
    timeout: {
      reason: '타임 아웃',
      explanation:
        '해당 서비스의 서버가 5초 안에 응답하지 않았습니다. 서버 자체가 매우 느려졌거나 일시적으로 다운되었을 가능성이 높아요. 잠시 후 다시 확인해보세요.',
    },
    httpError: {
      reason: '오류 응답',
      explanation: (code) =>
        `해당 서비스의 서버가 정상 페이지 대신 오류 화면(HTTP ${code})을 돌려주고 있습니다. 서버 점검 중이거나, 페이지 주소가 바뀌었거나, 일시적인 오류일 수 있습니다.`,
    },
    connectionFailure: {
      reason: '연결 실패',
      explanation: '해당 서비스의 서버에 아예 연결할 수 없는 상태입니다. 서버가 완전히 다운됐거나, 네트워크 설정이 바뀌었을 가능성이 있습니다.',
    },
    slowSuffix: ' (느림)',
    cardOkPrefix: (reason) => reason,
    cardBadPrefix: (reason) => `비정상 (${reason})`,
  },

  privacy: {
    title: '개인정보처리방침',
    updated: '2026년 8월 13일 시행',
    intro:
      "스뮤온(이하 '서비스')은 이용자의 개인정보를 소중히 다루며, 아래와 같이 개인정보를 수집·이용합니다.",
    sections: [
      {
        heading: '1. 수집하는 개인정보 항목',
        items: [
          '로그인이나 회원가입 자체가 없어 계정 정보를 수집하지 않습니다',
          '문의하기 이용 시: 이름(선택), 이메일(선택), 문의 내용',
          '자동 수집: 사이트별 클릭 수(개인을 식별할 수 없는 집계 데이터)',
        ],
      },
      {
        heading: '2. 개인정보의 수집 및 이용 목적',
        items: [
          '문의 내용 확인 및 답변',
          'Google Analytics, Vercel Speed Insights를 통한 서비스 이용 통계 분석',
        ],
      },
      {
        heading: '3. 개인정보의 보유 및 이용 기간',
        items: ['문의 내용: 답변 후 별도로 보관하지 않으며 이메일로만 전달됩니다'],
      },
      {
        heading: '4. 개인정보의 제3자 제공',
        items: [
          '서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다',
          '서비스 운영을 위해 Google(이용 통계), Vercel(호스팅·성능 측정)에 최소한의 정보가 전달될 수 있습니다',
        ],
      },
      {
        heading: '5. 디스코드 알림 채널',
        items: [
          '서버 상태 알림은 별도의 디스코드 서버를 통해 발송되며, 참여 여부와 알림 수신 여부는 디스코드 앱에서 이용자가 직접 관리합니다',
          '디스코드 참여를 위해 입력하는 정보(닉네임 등)는 디스코드 자체 정책을 따르며, 이 서비스가 별도로 수집·저장하지 않습니다',
        ],
      },
      {
        heading: '6. 쿠키의 사용',
        items: ['Google Analytics의 이용 통계 수집 쿠키가 사용될 수 있습니다'],
      },
      {
        heading: '7. 문의처',
        items: ["개인정보 관련 문의는 하단의 '개선요청 및 문의'를 통해 접수해주세요."],
      },
    ],
  },

  // siteInfos.js가 URL/endpoint 같은 데이터와 함께 이 title/alias를 조합해서 쓴다.
  sites: {
    home: { title: '상명대학교 홈페이지' },
    ecampus: { title: '상명대학교 이캠퍼스' },
    sammul: { title: '상명대학교 샘물(통합정보시스템)' },
    cloud: { title: 'Office 365 (클라우드메일)' },
    'dorm-seoul': { title: '학생생활관' },
    sugang: { title: '상명대학교 수강신청' },
  },
};

export default text;
