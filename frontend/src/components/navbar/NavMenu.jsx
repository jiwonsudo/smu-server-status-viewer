'use client';

import { useEffect, useRef, useState } from 'react';
import { DiscordIcon, MenuIcon } from '../icons';
import DiscordModal from './DiscordModal';
import AboutModal from './AboutModal';
import FaqModal from './FaqModal';
import ContactModal from './ContactModal';
import text from '../../lib/text';

// About/FAQ/Contact collapsed into one dropdown. There is no account or
// login — status alerts come from joining the Discord server.
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
          <div className="absolute right-0 top-full z-50 mt-1.5 w-52 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
            {[
              [text.nav.about, () => setAboutOpen(true)],
              [text.nav.faq, () => setFaqOpen(true)],
              [text.nav.contact, () => setContactOpen(true)],
            ].map(([label, open]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  open();
                  setMenuOpen(false);
                }}
                className="block w-full rounded-sm px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
              >
                {label}
              </button>
            ))}
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
