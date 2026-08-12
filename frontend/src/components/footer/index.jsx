import text from '../../lib/text';

const Footer = () => {
  return (
    <footer className="flex h-14 w-full shrink-0 items-center justify-center bg-[#1a1f2c]">
      <p className="text-xs text-slate-400">{text.footer.copyright}</p>
    </footer>
  );
}

export default Footer;
