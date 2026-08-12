'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/AuthContext';
import { MenuIcon } from '../icons';
import KakaoButton from './KakaoButton';
import AboutModal from './AboutModal';
import FaqModal from './FaqModal';
import text from '../../lib/text';

// 소개/FAQ/마이페이지/로그아웃을 전부 여기 드롭다운 하나로 모았다 —
// 예전엔 nav에 버튼이 3~4개씩 나란히 붙어있어서 지저분했고, 로그인 상태를
// 나타내던 닉네임 칩도 "마이페이지"라는 글자가 어디에도 없어서 찾기
// 어려웠다. 이제 메뉴 안에 "마이페이지"라고 명시된 링크로 들어간다.
function NavMenu() {
  const { loggedIn, nickname, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="flex items-center gap-1">
      {!loading && !loggedIn && <KakaoButton />}

      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={text.nav.menuLabel}
          aria-expanded={menuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-white/80 transition hover:text-white"
        >
          <MenuIcon className="h-5 w-5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-52 border border-slate-200 bg-white py-1 shadow-lg">
            {loggedIn && (
              <div className="border-b border-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
                {nickname}
                {text.nav.myPageSuffix}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setAboutOpen(true);
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {text.nav.about}
            </button>
            <button
              type="button"
              onClick={() => {
                setFaqOpen(true);
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {text.nav.faq}
            </button>

            {loggedIn && (
              <>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/mypage"
                  onClick={() => setMenuOpen(false)}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  {text.nav.myPage}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
                >
                  {text.kakao.logoutLabel}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  );
}

export default NavMenu;
