import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Navbar from '../components/navbar';
import Footer from '../components/footer';
import { AuthProvider } from '../lib/AuthContext';
import text from '../lib/text';
import './globals.css';

const { title, description, keywords } = text.meta;

export const metadata = {
  metadataBase: new URL('https://issmuok.site'),
  title,
  description,
  keywords,
  openGraph: {
    title,
    description,
    url: 'https://issmuok.site',
    siteName: text.site.name,
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
