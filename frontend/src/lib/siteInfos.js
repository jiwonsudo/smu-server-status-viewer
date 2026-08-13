import text from './text';

// 서버 컴포넌트(app/page.js)와 클라이언트 컴포넌트(StatusDashboard.jsx) 둘 다
// 같은 목록을 참조하도록 공유. title 문구 자체는 text.js의 sites 섹션에서
// 가져온다 — 사이트 이름만 고치려면 그 파일만 건드리면 된다.
export const SITE_INFOS = [
  { title: text.sites.home.title, url: 'https://www.smu.ac.kr/kor/index.do', endpoint: '/status/home', siteKey: 'home' },
  {
    title: text.sites.ecampus.title,
    url: 'https://ecampus.smu.ac.kr/',
    endpoint: '/status/ecampus',
    siteKey: 'ecampus',
  },
  { title: text.sites.sammul.title, url: 'https://smul.smu.ac.kr/', endpoint: '/status/sammul', siteKey: 'sammul' },
  { title: text.sites.cloud.title, url: 'https://cloud.smu.ac.kr/', endpoint: '/status/cloud', siteKey: 'cloud' },
  {
    title: text.sites['dorm-seoul'].title,
    url: 'https://dormitory.smu.ac.kr/dormi/index.do',
    endpoint: '/status/dorm-seoul',
    siteKey: 'dorm-seoul',
  },
  { title: text.sites.sugang.title, url: 'https://sugang.smu.ac.kr', endpoint: '/status/sugang', siteKey: 'sugang' },
];
