'use client';

import { useState } from 'react';
import axios from 'axios';
import { URL_ROOT } from '../lib/config';
import text from '../lib/text';

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: 사람 눈엔 안 보이고 봇만 채움
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [agreed, setAgreed] = useState(false); // 법적 책임 안내 확인 체크 — 이거 없으면 전송 버튼이 비활성

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || !agreed || status === 'sending') return;

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
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={text.contact.namePlaceholder}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0E207F]"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={text.contact.emailPlaceholder}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0E207F]"
        />
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={text.contact.messagePlaceholder}
        required
        rows={4}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0E207F]"
      />
      <input
        type="text"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-medium text-amber-900">{text.contact.abuseNotice}</p>
        <label className="mt-2 flex items-center gap-2 text-xs font-medium text-amber-900">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="h-3.5 w-3.5 rounded border-amber-400 text-[#0E207F] focus:ring-[#0E207F]"
          />
          {text.contact.abuseAgreeLabel}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'sending' || !message.trim() || !agreed}
          className="rounded-lg bg-[#0E207F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a1860] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? text.contact.sendingLabel : text.contact.sendLabel}
        </button>
        {status === 'success' && <span className="text-sm text-emerald-600">{text.contact.successMessage}</span>}
        {status === 'error' && <span className="text-sm text-red-500">{text.contact.errorMessage}</span>}
      </div>
    </form>
  );
}

export default ContactForm;
