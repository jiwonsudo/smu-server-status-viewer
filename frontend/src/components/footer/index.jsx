import Link from 'next/link';
import text from '../../lib/text';

const Footer = () => {
  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 bg-[#1a1f2c] px-4 py-4">
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <Link href="/privacy" className="underline decoration-transparent underline-offset-4 hover:text-slate-200 hover:decoration-slate-500">
          {text.footer.privacyLabel}
        </Link>
      </div>
      <p className="text-xs text-slate-400">{text.footer.copyright}</p>
    </footer>
  );
}

export default Footer;
