'use client';

import InfoModal from '../InfoModal';
import text from '../../lib/text';

function FaqModal({ open, onClose }) {
  return (
    <InfoModal open={open} onClose={onClose} title={text.faqHeading}>
      <div className="flex flex-col gap-4">
        {text.faq.map((faq) => (
          <div key={faq.question}>
            <p className="font-semibold text-slate-800">{faq.question}</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
          </div>
        ))}
      </div>
    </InfoModal>
  );
}

export default FaqModal;
