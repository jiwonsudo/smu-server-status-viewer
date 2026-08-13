'use client';

import { useEffect, useRef, useState } from 'react';
import { DiscordIcon, MenuIcon } from '../icons';
import DiscordModal from './DiscordModal';
import AboutModal from './AboutModal';
import FaqModal from './FaqModal';
import ContactModal from './ContactModal';
import text from '../../lib/text';

// 소개/FAQ를 여기 드롭다운 하나로 모았다 — 예전엔 nav에 버튼이 3~4개씩
// 나란히 붙어있어서 지저분했다. 상태 알림은 더 이상 카카오 로그인이 아니라
// 디스코드 서버 참여로 받으므로, 계정/로그인 개념 자체가 없다.
function NavMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);
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
      <button
        type="button"
        onClick={() => setDiscordOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-md bg-[#5865F2] px-3 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <DiscordIcon className="h-4 w-4" />
        {text.nav.discordCta}
      </button>

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
            <button
              type="button"
              onClick={() => {
                setContactOpen(true);
                setMenuOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              {text.nav.contact}
            </button>
          </div>
        )}
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
      <DiscordModal open={discordOpen} onClose={() => setDiscordOpen(false)} />
    </div>
  );
}

export default NavMenu;
