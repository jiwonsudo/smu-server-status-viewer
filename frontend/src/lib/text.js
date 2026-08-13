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
    contactLabel: '개선요청 및 문의',
    privacyLabel: '개인정보처리방침',
  },

  meta: {
    title: '스뮤온 | 상명대 서버 상태 실시간 확인',
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
    footer: '상명대 서버 접속 안될 때, 여기서 바로 확인하세요!',
  },

  nav: {
    about: '소개',
    faq: 'FAQ',
    kakaoShort: '상태 알림받기',
    kakaoLong: '카톡으로 서버상태 알림받기',
    myPageSuffix: '님',
    myPage: '마이페이지',
    menuLabel: '메뉴',
    returningLogin: '로그인',
  },

  toast: {
    pinAdded: (title) => `☆ ${title} 즐겨찾기에 추가했어요`,
    pinRemoved: (title) => `${title} 즐겨찾기에서 제거했어요`,
    subscribeOn: (title) => `🔔 ${title} 알림을 켰어요`,
    subscribeOff: (title) => `${title} 알림을 껐어요`,
  },

  mypage: {
    greeting: (nickname) => `${nickname}님, 안녕하세요!`,
    notLoggedInHeading: '로그인이 필요해요',
    notLoggedInBody: '카카오 로그인을 하면 서버 상태 알림을 구독하고 관리할 수 있어요.',
    noConsentNotice: "아직 '카카오톡 메시지 전송' 권한에 동의하지 않아서, 구독을 켜도 알림이 가지 않습니다.",
    subscriptionsHeading: '알림 구독 관리',
    subscriptionsHint: '켜둔 사이트가 다운되거나 복구되면 카카오톡으로 바로 알림이 와요.',
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
      'SM Challenge(진로·취업 포트폴리오)',
      'Office 365(클라우드메일)',
      '상명대 학생생활관 홈페이지',
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
    namePlaceholder: '이름 (선택)',
    emailPlaceholder: '답장 받을 이메일 (선택)',
    messagePlaceholder: '문의 또는 건의사항을 입력해주세요',
    sendingLabel: '전송 중...',
    sendLabel: '보내기',
    successMessage: '전송됐습니다. 감사합니다!',
    errorMessage: '전송에 실패했습니다. 잠시 후 다시 시도해주세요.',
  },

  kakao: {
    modalTitle: '카카오톡으로 실시간 서버 상태 알림받기',
    notConfiguredBadge: '카카오 로그인 준비 중',
    featureHeading: '이런 기능이에요',
    featureBody:
      '카카오 로그인을 하고 원하는 서비스만 알림을 켜 두면, 그 사이트가 다운되거나 다시 복구될 때 카카오톡으로 바로 알림을 받아볼 수 있어요.',
    notConfiguredHeading: '왜 아직 로그인이 안 되나요',
    notConfiguredBody:
      '카카오 쪽 앱 등록과 메시지 전송 권한 승인이 끝나야 로그인 버튼이 실제로 동작합니다. 준비되는 대로 이 배지가 사라지고 바로 로그인할 수 있게 될게요.',
    loadingLabel: '로그인 상태 확인 중...',
    logoutLabel: '로그아웃',
    loginLabel: '카카오로 1초만에 로그인하기',
    withdrawLabel: '탈퇴하기',
    withdrawConfirmTitle: '정말 탈퇴하시겠어요?',
    withdrawConfirmBody:
      '카카오 연결이 끊기고, 저장된 계정 정보와 알림 구독이 전부 즉시 삭제됩니다. 되돌릴 수 없습니다.',
    withdrawConfirmCta: '탈퇴합니다',
    withdrawCancelCta: '취소',
    consentPromptTitle: '꼭 알아두셔야 해요',
    // before/emphasis/after로 나눠서 컴포넌트가 emphasis 부분만 굵게+강조 스타일로 렌더링한다.
    consentPromptBody: {
      before: '카카오톡 알림을 받으려면, 다음 화면에서 ',
      emphasis: "'카카오톡 메시지 전송'",
      after: ' 항목에 꼭 동의해주세요. 동의하지 않으면 알림이 오지 않아요.',
    },
    consentPromptScreenshotToggleOpen: '동의 화면 미리보기 상세 보기',
    consentPromptScreenshotToggleClose: '미리보기 접기',
    consentPromptScreenshotAlt: '카카오 로그인 동의 화면에서 카카오톡 메시지 전송에 체크하는 위치 예시',
    consentPromptScreenshotCaption:
      "다음 화면에서 이렇게 '카카오톡 메시지 전송' 옆에 체크 표시가 있는지 확인하고 계속하기를 눌러주세요.",
    consentPromptCta: '확인 후 로그인하기',
  },

  faqHeading: '자주 묻는 질문',
  faq: [
    {
      question: '이 사이트, 상명대학교에서 만든 공식 사이트인가요?',
      answer:
        '아니요, 학생이 개인적으로 만든 비공식 사이트예요. 학교와 직접적인 관련은 없고, 공개적으로 접속 가능한 상명대 서버들의 상태를 대신 확인해서 보여드리는 것뿐이에요.',
    },
    {
      question: '카카오 로그인하면 제 개인정보는 어떻게 쓰이나요?',
      answer:
        "알림을 보내는 데 필요한 최소한의 정보(카카오 닉네임, 알림용 식별 정보)만 저장해요. 이름, 전화번호, 학번 같은 건 아예 수집하지 않습니다. 자세한 내용은 맨 아래 '개인정보처리방침'에서 볼 수 있어요.",
    },
    {
      question: "'카카오톡 메시지 전송' 권한은 왜 필요하고, 동의 안 하면 어떻게 되나요?",
      answer:
        "서버가 다운되거나 복구됐을 때 카카오톡 '나에게 보내기'로 알림을 보내드리기 위해 꼭 필요한 권한이에요. 로그인할 때 이 권한에 동의하지 않으면 로그인 자체는 되지만 알림 기능은 켤 수 없어요. 나중에라도 다시 로그인하면 동의할 수 있습니다.",
    },
    {
      question: "이캠퍼스는 잘 되는데 여기서는 '비정상'이라고 떠요. 오류인가요?",
      answer:
        "이 사이트는 서버 상태를 15초마다 한 번씩 자동으로 확인해서 보여드리는 방식이라, 실제 상태와 최대 몇 초 정도 차이가 날 수 있어요. 계속 다르게 보인다면 각 카드의 '상세 상태 보기'에서 실제로 어떤 응답이 왔는지 확인해보시고, 그래도 이상하면 맨 아래 '개선요청 및 문의'로 알려주세요.",
    },
    {
      question: '알림을 켜놨는데 카카오톡이 안 와요.',
      answer:
        "이 순서로 확인해보세요. ① 로그인할 때 '카카오톡 메시지 전송'에 동의했는지 (마이페이지에 안내 문구가 떠 있으면 동의가 안 된 상태예요) ② 카카오톡 앱 자체 알림이 꺼져있지 않은지 ③ 마이페이지에서 해당 사이트 알림이 켜져 있는지. 그래도 안 오면 '개선요청 및 문의'로 알려주세요.",
    },
    {
      question: '회원 탈퇴하면 제 정보가 진짜 다 지워지나요?',
      answer:
        '네. 마이페이지에서 탈퇴하기를 누르면 카카오 연결이 즉시 끊기고, 저장돼있던 계정 정보와 알림 구독이 전부 바로 삭제돼요. 따로 대기 시간이나 요청 절차 없이 그 자리에서 끝나요.',
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
          '카카오 로그인 시: 카카오 회원번호, 닉네임',
          '카카오톡 알림 신청(선택 동의) 시: 카카오톡 메시지 전송 권한',
          '문의하기 이용 시: 이름(선택), 이메일(선택), 문의 내용',
          '자동 수집: 사이트별 클릭 수(개인을 식별할 수 없는 집계 데이터)',
        ],
      },
      {
        heading: '2. 개인정보의 수집 및 이용 목적',
        items: [
          '로그인 유지 및 카카오톡 알림 구독 관리',
          '구독한 서비스의 상태가 바뀔 때 카카오톡 메시지 발송',
          '문의 내용 확인 및 답변',
          'Google Analytics, Vercel Speed Insights를 통한 서비스 이용 통계 분석',
        ],
      },
      {
        heading: '3. 개인정보의 보유 및 이용 기간',
        items: [
          '로그인 세션: 발급일로부터 30일 후 자동 만료',
          '카카오 계정 정보 및 구독 정보: 이용자가 마이페이지에서 탈퇴하기 전까지 보관',
          '문의 내용: 답변 후 별도로 보관하지 않으며 이메일로만 전달됩니다',
        ],
      },
      {
        heading: '4. 개인정보의 제3자 제공',
        items: [
          '서비스는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다',
          '서비스 운영을 위해 카카오(로그인·메시지 발송), Google(이용 통계), Vercel(호스팅·성능 측정)에 최소한의 정보가 전달될 수 있습니다',
        ],
      },
      {
        heading: '5. 이용자의 권리',
        items: [
          '로그아웃 또는 사이트별 알림 구독 해제로 언제든 카카오톡 알림 수신을 중단할 수 있습니다',
          "마이페이지의 '탈퇴하기'를 누르면 카카오 연결 해제와 함께 저장된 개인정보가 즉시, 자동으로 삭제됩니다(별도 요청 절차 없음)",
        ],
      },
      {
        heading: '6. 쿠키의 사용',
        items: [
          '로그인 상태 유지를 위한 세션 쿠키를 사용합니다',
          'Google Analytics의 이용 통계 수집 쿠키가 함께 사용될 수 있습니다',
        ],
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
    career: { title: 'SM Challenge (진로·취업 포트폴리오)' },
    cloud: { title: 'Office 365 (클라우드메일)' },
    'dorm-seoul': { title: '학생생활관' },
  },
};

export default text;
