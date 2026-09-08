import text from './text';

// Shared site list for both the server and client components. Titles come
// from text.js (sites section).
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
