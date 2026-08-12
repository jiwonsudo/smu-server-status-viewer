'use client';

import { useState } from 'react';
import InfoModal from '../InfoModal';
import text from '../../lib/text';

function AboutButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center px-2.5 text-white/80 underline decoration-transparent underline-offset-4 transition hover:text-white hover:decoration-white/60 sm:px-3"
      >
        {text.nav.about}
      </button>
      <InfoModal open={open} onClose={() => setOpen(false)} title={text.about.modalTitle}>
        <p>{text.about.intro}</p>

        <h3 className="mt-4 font-semibold text-slate-800">{text.about.servicesHeading}</h3>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {text.about.services.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>

        <h3 className="mt-4 font-semibold text-slate-800">{text.about.colorHeading}</h3>
        <ul className="mt-1 space-y-1">
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5cb85c]" />
            {text.about.colorOk}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f0ad4e]" />
            {text.about.colorSlow}
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d9534f]" />
            {text.about.colorDown}
          </li>
        </ul>
        <p className="mt-1 text-xs text-slate-400">{text.about.detailHint}</p>

        <h3 className="mt-4 font-semibold text-slate-800">{text.about.intervalHeading}</h3>
        <p className="mt-1">{text.about.intervalBody}</p>

        <h3 className="mt-4 font-semibold text-slate-800">{text.about.sortHeading}</h3>
        <p className="mt-1">{text.about.sortBody}</p>
      </InfoModal>
    </>
  );
}

export default AboutButton;
