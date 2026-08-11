import StatusDashboard from '../components/StatusDashboard';
import { SITE_INFOS } from '../lib/siteInfos';
import { computeDisplayStatus } from '../lib/statusDetail';
import { URL_ROOT } from '../lib/config';

// 크롤러가 JS 실행 없이도 실제 상태 텍스트를 읽을 수 있도록, 서버에서
// 먼저 전체 사이트를 점검하고 그 결과를 초기 HTML에 그대로 굽는다.
// (부가 효과로 접속 즉시 백엔드에 핑이 가서, 첫 화면에서 "확인 중..."만
// 보이다 실패하는 경우도 줄어든다.)
async function fetchInitialStatusData() {
  const entries = await Promise.all(
    SITE_INFOS.map(async (siteInfo) => {
      try {
        const res = await fetch(`${URL_ROOT}${siteInfo.endpoint}`, { cache: 'no-store' });
        const data = await res.json();
        return [siteInfo.endpoint, computeDisplayStatus(siteInfo.title, data)];
      } catch {
        return [siteInfo.endpoint, null];
      }
    })
  );
  return Object.fromEntries(entries.filter(([, value]) => value !== null));
}

const faqs = [
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
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default async function Home() {
  const initialStatusData = await fetchInitialStatusData();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="sr-only">
        <h1>스뮤야 괜찮아?</h1>
        <p>상명대 서버 실시간 상태 확인</p>
      </header>

      <div className="mx-auto max-w-2xl">
        <StatusDashboard initialStatusData={initialStatusData} />
      </div>

      <section className="mx-auto mt-14 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-800">자주 묻는 질문</h2>
        <div className="mt-3 flex flex-col gap-4">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <h3 className="font-semibold text-slate-800">{faq.question}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
