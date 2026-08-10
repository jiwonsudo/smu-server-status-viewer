import Script from 'next/script';
import StyledComponentsRegistry from '../lib/registry';
import './globals.css';

export const metadata = {
  metadataBase: new URL('https://smu-server-status-viewer.vercel.app'),
  title: '상명대학교 서버상태 실시간 확인 | 상명대 서버, 이캠 서버 모니터링',
  description:
    '상명대학교 홈페이지, 이캠퍼스(이캠), 샘물 서버 상태를 실시간으로 확인하세요. 상명대 서버 접속 장애, 이캠 안됨 여부를 5분마다 자동으로 점검하고 상태 변화를 기록합니다.',
  openGraph: {
    title: '상명대학교 서버상태 실시간 확인',
    description: '상명대 서버, 이캠 서버, 샘물 서버 상태를 실시간으로 확인하세요.',
    url: 'https://smu-server-status-viewer.vercel.app',
    siteName: '상명대학교 서버상태',
    locale: 'ko_KR',
    type: 'website',
  },
  icons: {
    icon: '/sumung_cut.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
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
      </body>
    </html>
  );
}
