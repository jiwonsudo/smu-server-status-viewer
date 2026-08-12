import Link from 'next/link';
import LOGO from '../../assets/logo.webp';
import AboutButton from './AboutButton';
import ContactButton from './ContactButton';
import KakaoButton from './KakaoButton';
import text from '../../lib/text';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-2 border-b border-white/10 bg-[#0E207F] px-3 py-2.5 sm:px-6">
      <Link href="/" className="flex min-w-0 shrink items-center gap-2.5 sm:gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white p-2 sm:h-12 sm:w-12">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO.src} alt={text.site.logoAlt} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
            {text.site.name}
          </div>
          <div className="truncate text-[10px] text-white/60 sm:text-xs">{text.site.tagline}</div>
        </div>
      </Link>
      <nav className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
        <AboutButton />
        <ContactButton />
        <KakaoButton />
      </nav>
    </header>
  );
}

export default Navbar;
