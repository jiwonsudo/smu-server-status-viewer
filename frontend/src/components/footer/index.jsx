'use client';

import { useState } from 'react';
import Link from 'next/link';
import InfoModal from '../InfoModal';
import ContactForm from '../ContactForm';
import text from '../../lib/text';

const Footer = () => {
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <footer className="flex w-full shrink-0 flex-col items-center gap-2 bg-[#1a1f2c] px-4 py-4">
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <button type="button" onClick={() => setContactOpen(true)} className="underline decoration-transparent underline-offset-4 hover:text-slate-200 hover:decoration-slate-500">
          {text.footer.contactLabel}
        </button>
        <Link href="/privacy" className="underline decoration-transparent underline-offset-4 hover:text-slate-200 hover:decoration-slate-500">
          {text.footer.privacyLabel}
        </Link>
      </div>
      <p className="text-xs text-slate-500">{text.footer.copyright}</p>

      <InfoModal open={contactOpen} onClose={() => setContactOpen(false)} title={text.contact.modalTitle}>
        <p>{text.contact.intro}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {text.contact.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-slate-400">{text.contact.emailNote}</p>
        <div className="mt-4">
          <ContactForm />
        </div>
      </InfoModal>
    </footer>
  );
}

export default Footer;
