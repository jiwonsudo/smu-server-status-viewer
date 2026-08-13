'use client';

import InfoModal from '../InfoModal';
import ContactForm from '../ContactForm';
import text from '../../lib/text';

function ContactModal({ open, onClose }) {
  return (
    <InfoModal open={open} onClose={onClose} title={text.contact.modalTitle}>
      <p>{text.contact.intro}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {text.contact.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-slate-400">{text.contact.emailNote}</p>
      <p className="mt-2 text-xs text-slate-400">{text.contact.abuseNotice}</p>
      <div className="mt-4">
        <ContactForm />
      </div>
    </InfoModal>
  );
}

export default ContactModal;
