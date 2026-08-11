import Link from 'next/link';
import LOGO from '../../assets/logo.webp';
import AboutButton from './AboutButton';
import ContactButton from './ContactButton';
import KakaoButton from './KakaoButton';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-2 bg-[#0E207F] px-3 py-2 shadow-sm sm:px-6">
      <Link href="/" className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO.src}
          alt="스뮤야 괜찮아? 로고"
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white/20 sm:h-9 sm:w-9"
        />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold tracking-tight text-white sm:text-lg">
            스뮤야 괜찮아?
          </div>
          <div className="truncate text-[10px] text-white/70 sm:text-xs">
            상명대 서버 실시간 상태 확인
          </div>
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
