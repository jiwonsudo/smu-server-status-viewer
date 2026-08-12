'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';
import ContactForm from '../ContactForm';
import text from '../../lib/text';

function ContactButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center px-2.5 text-white/80 underline decoration-transparent underline-offset-4 transition hover:text-white hover:decoration-white/60 sm:px-3"
      >
        {text.nav.contact}
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title={text.contact.modalTitle}>
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
    </>
  );
}

export default ContactButton;
