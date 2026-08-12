import { Suspense } from 'react';
import StatusDashboardServer from '../components/StatusDashboardServer';
import StatusLoading from '../components/StatusLoading';
import text from '../lib/text';

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: text.faq.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header className="sr-only">
        <h1>{text.site.name}</h1>
        <p>{text.site.tagline}</p>
      </header>

      <div className="mx-auto max-w-2xl">
        <Suspense fallback={<StatusLoading />}>
          <StatusDashboardServer />
        </Suspense>
      </div>

      <section className="mx-auto mt-14 max-w-2xl">
        <h2 className="text-lg font-semibold text-slate-800">{text.faqHeading}</h2>
        <div className="mt-3 flex flex-col gap-4">
          {text.faq.map((faq) => (
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
