'use client';

import { useState } from 'react';
import axios from 'axios';
import { URL_ROOT } from '../lib/config';
import text from '../lib/text';
import { Button } from './ui/button';
import { Input, Textarea } from './ui/input';

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: 사람 눈엔 안 보이고 봇만 채움
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim() || !message.trim() || !agreed || status === 'sending') return;

    setStatus('sending');
    try {
      await axios.post(`${URL_ROOT}/contact`, { name, email, message, website });
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={text.contact.namePlaceholder}
          required
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={text.contact.emailPlaceholder}
        />
      </div>
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={text.contact.messagePlaceholder}
        required
        rows={4}
      />
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="rounded-md border border-warning/30 bg-warning/10 p-3">
        <p className="text-xs font-medium text-warning">{text.contact.abuseNotice}</p>
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-warning">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-warning/50 accent-primary"
          />
          {text.contact.abuseAgreeLabel}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === 'sending' || !name.trim() || !message.trim() || !agreed}>
          {status === 'sending' ? text.contact.sendingLabel : text.contact.sendLabel}
        </Button>
        {status === 'success' && <span className="text-sm text-success">{text.contact.successMessage}</span>}
        {status === 'error' && <span className="text-sm text-destructive">{text.contact.errorMessage}</span>}
      </div>
    </form>
  );
}

export default ContactForm;
