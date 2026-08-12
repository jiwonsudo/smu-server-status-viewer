// 즐겨찾기(★)/알림(🔔) 표시에 쓰던 이모지를 대체하는 최소한의 SVG 아이콘.
// 이모지는 OS/브라우저마다 렌더링이 달라서 나머지 UI(전부 직접 그린 flat
// 스타일)랑 안 어울렸다 — 색으로 on/off를 표현하는 단색 아이콘으로 통일한다.

export function StarIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} strokeLinejoin="round">
      <path d="M12 2l2.9 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 7.1-1.01L12 2z" />
    </svg>
  );
}

export function BellIcon({ filled, className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} strokeLinejoin="round">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
    </svg>
  );
}

export function ChatBubbleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.42 1.32 4.58 3.4 6.04L4 21l4.35-1.74A11.6 11.6 0 0 0 12 19c5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
    </svg>
  );
}

export function MenuIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}
