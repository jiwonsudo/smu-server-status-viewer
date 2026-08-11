// 서버 컴포넌트(app/page.js)와 클라이언트 컴포넌트(StatusDashboard.jsx) 둘 다
// 같은 목록을 참조하도록 공유. "코스모스"는 이캠퍼스의 옛/속칭이라 검색어로도
// 쓰여서 별칭에 남겨둔다.
export const SITE_INFOS = [
  { title: '상명대학교 홈페이지', url: 'https://www.smu.ac.kr/kor/index.do', endpoint: '/status/home', siteKey: 'home' },
  { title: '상명대학교 이캠퍼스', alias: '코스모스', url: 'https://ecampus.smu.ac.kr/', endpoint: '/status/ecampus', siteKey: 'ecampus' },
  { title: '상명대학교 샘물(통합정보시스템)', url: 'https://smul.smu.ac.kr/', endpoint: '/status/sammul', siteKey: 'sammul' },
  { title: 'SM Challenge (진로·취업 포트폴리오)', url: 'https://smcareer.smu.ac.kr/', endpoint: '/status/career', siteKey: 'career' },
  { title: 'Office 365 (클라우드메일)', url: 'https://cloud.smu.ac.kr/', endpoint: '/status/cloud', siteKey: 'cloud' },
  { title: '학생생활관', url: 'https://dormitory.smu.ac.kr/dormi/index.do', endpoint: '/status/dorm-seoul', siteKey: 'dorm-seoul' },
  { title: '학술정보관 (도서관)', url: 'https://lib.smu.ac.kr/', endpoint: '/status/lib-seoul', siteKey: 'lib-seoul' },
];
