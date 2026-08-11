import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { AuthProvider } from '../lib/AuthContext';
import './globals.css';

const title = '상명대 서버 상태 실시간 확인 | 스뮤야 괜찮아?';
const description =
  '이캠퍼스, 샘물, 홈페이지 등 상명대 주요 서버의 실시간 장애 여부를 확인하세요. 서버 다운/복구 시 카카오톡 알림도 받을 수 있습니다.';

export const metadata = {
  metadataBase: new URL('https://issmuok.site'),
  title,
  description,
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
    '스뮤야 괜찮아',
    'issmuok',
  ],
  openGraph: {
    title,
    description,
    url: 'https://issmuok.site',
    siteName: '스뮤야 괜찮아?',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  icons: {
    icon: '/logo.webp',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <div className="flex min-h-screen flex-col bg-slate-50">
            <Navbar />
            <main className="flex-1 px-4 py-10">{children}</main>
            <Footer />
          </div>
        </AuthProvider>
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
