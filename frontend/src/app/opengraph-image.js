import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = '스뮤야 괜찮아? — 상명대 서버 실시간 상태 확인';

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
          스뮤야 괜찮아?
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 34, color: '#FEE500' }}>
          상명대 서버 실시간 상태 확인
        </div>
        <div style={{ display: 'flex', marginTop: 40, fontSize: 24, color: 'rgba(255,255,255,0.7)' }}>
          이캠 안됨? 이캠퍼스(코스모스) 접속장애? 여기서 바로 확인하세요
        </div>
      </div>
    ),
    { ...size }
  );
}
