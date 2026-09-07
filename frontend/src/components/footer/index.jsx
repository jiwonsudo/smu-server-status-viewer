import Link from 'next/link';
import text from '../../lib/text';
import { APP_VERSION } from '../../lib/version';
import { CHANGELOG_URL } from '../../lib/config';

const linkClass = 'underline decoration-transparent underline-offset-4 transition-colors hover:text-slate-200 hover:decoration-slate-500';

const Footer = () => {
  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 bg-[#1a1f2c] px-4 py-5 text-xs text-slate-400">
      <div className="flex items-center gap-4">
        <Link href="/privacy" className={linkClass}>
          {text.footer.privacyLabel}
        </Link>
        <a href={CHANGELOG_URL} target="_blank" rel="noreferrer" title={text.footer.versionLinkLabel} className={linkClass}>
          {text.footer.version(APP_VERSION)}
        </a>
      </div>
      <p>{text.footer.copyright}</p>
    </footer>
  );
};

export default Footer;
