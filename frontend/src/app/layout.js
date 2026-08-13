import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import text from '../lib/text';
import './globals.css';

const { title, shareTitle, description, keywords } = text.meta;

export const metadata = {
  metadataBase: new URL('https://www.issmuok.site'),
  title,
  description,
  keywords,
  alternates: {
    canonical: 'https://www.issmuok.site',
  },
  openGraph: {
    title: shareTitle,
    description,
    url: 'https://www.issmuok.site',
    siteName: text.site.name,
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: shareTitle,
    description,
  },
  icons: {
    icon: '/smuon_black.webp',
  },
  manifest: '/manifest.json',
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: text.site.name,
  alternateName: '스뮤야 괜찮아',
  url: 'https://www.issmuok.site',
  description,
  inLanguage: 'ko-KR',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <div className="flex min-h-screen flex-col bg-slate-50">
          <Navbar />
          <main className="flex-1 px-4 py-10">{children}</main>
          <Footer />
        </div>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-SCW0YE7V1B"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-SCW0YE7V1B');
          `}
        </Script>
        <SpeedInsights />
      </body>
    </html>
  );
}
