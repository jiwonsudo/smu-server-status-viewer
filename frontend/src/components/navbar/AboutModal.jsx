'use client';

import InfoModal from '../InfoModal';
import text from '../../lib/text';

function AboutModal({ open, onClose }) {
  return (
    <InfoModal open={open} onClose={onClose} title={text.about.modalTitle}>
      <p>{text.about.intro}</p>

      <h3 className="mt-4 font-semibold text-foreground">{text.about.servicesHeading}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {text.about.services.map((service) => (
          <li key={service}>{service}</li>
        ))}
      </ul>

      <h3 className="mt-4 font-semibold text-foreground">{text.about.colorHeading}</h3>
      <ul className="mt-1 space-y-1">
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-success" />
          {text.about.colorOk}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-warning" />
          {text.about.colorSlow}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full bg-destructive" />
          {text.about.colorDown}
        </li>
      </ul>
      <p className="mt-1 text-xs text-muted-foreground">{text.about.detailHint}</p>

      <h3 className="mt-4 font-semibold text-foreground">{text.about.aiHeading}</h3>
      <p className="mt-1">{text.about.aiBody}</p>

      <h3 className="mt-4 font-semibold text-foreground">{text.about.intervalHeading}</h3>
      <p className="mt-1">{text.about.intervalBody}</p>

      <h3 className="mt-4 font-semibold text-foreground">{text.about.sortHeading}</h3>
      <p className="mt-1">{text.about.sortBody}</p>
    </InfoModal>
  );
}

export default AboutModal;
