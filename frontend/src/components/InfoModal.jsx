'use client';

import { Modal } from './ui/modal';

function InfoModal({ open, onClose, title, children }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </Modal>
  );
}

export default InfoModal;
