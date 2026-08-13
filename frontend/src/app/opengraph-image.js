import { readFileSync } from 'fs';
import { join } from 'path';
import { ImageResponse } from 'next/og';
import text from '../lib/text';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = text.ogImage.alt;

// next/og(Satori)는 상대 경로 이미지를 못 읽는다 — 렌더가 이 라우트 자체를
// 요청하는 서버리스 함수 안에서 일어나서 우리 사이트의 다른 페이지처럼 절대
// URL로 자기 자신을 다시 호출할 수 없기 때문. 파일을 직접 읽어 data URI로
// 박아넣는 게 next/og 공식 문서가 권장하는 방식이다. webp는 Satori가 못
// 읽어서(빌드 자체가 깨짐) 이 라우트 전용으로 PNG 사본을 따로 둔다.
const logoData = readFileSync(join(process.cwd(), 'src/assets/smuon_white.png'));
const logoSrc = `data:image/png;base64,${logoData.toString('base64')}`;

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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={120} height={120} alt="" style={{ marginBottom: 32 }} />
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, color: 'white' }}>
          {text.ogImage.heading}
        </div>
        <div style={{ display: 'flex', marginTop: 20, fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>
          {text.ogImage.subheading}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 40, fontSize: 24, color: 'rgba(255,255,255,0.6)' }}>
          <div style={{ display: 'flex', width: 10, height: 10, borderRadius: 9999, backgroundColor: '#5cb85c', marginRight: 12 }} />
          {text.ogImage.footer}
        </div>
      </div>
    ),
    { ...size }
  );
}
