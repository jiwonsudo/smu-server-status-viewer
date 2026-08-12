import { ImageResponse } from 'next/og';
import text from '../lib/text';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = text.ogImage.alt;

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0E207F',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: 9999,
            backgroundColor: '#FEE500',
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 48 }}>✅</span>
        </div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: 'white' }}>
          {text.ogImage.heading}
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 34, color: '#FEE500' }}>
          {text.ogImage.subheading}
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>
          {text.ogImage.footer}
        </div>
      </div>
    ),
    { ...size }
  );
}
