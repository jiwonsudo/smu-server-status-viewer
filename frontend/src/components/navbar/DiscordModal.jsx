'use client';

import InfoModal from '../InfoModal';
import { DiscordIcon } from '../icons';
import { DISCORD_INVITE_URL } from '../../lib/config';
import text from '../../lib/text';

function DiscordModal({ open, onClose }) {
  return (
    <InfoModal open={open} onClose={onClose} title={text.discord.modalTitle}>
      <p>{text.discord.intro}</p>

      <h3 className="mt-4 font-semibold text-slate-800">{text.discord.stepsHeading}</h3>
      <ol className="mt-1 list-decimal space-y-0.5 pl-5">
        {text.discord.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 flex min-h-11 items-center justify-center gap-2 bg-[#5865F2] px-4 text-sm font-semibold text-white transition hover:brightness-110"
      >
        <DiscordIcon className="h-4 w-4" />
        {text.discord.cta}
      </a>
    </InfoModal>
  );
}

export default DiscordModal;
