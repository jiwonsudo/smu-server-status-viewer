'use client';

import { useState } from 'react';
import axios from 'axios';
import { URL_ROOT } from '../lib/config';

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: 사람 눈엔 안 보이고 봇만 채움
  const [status, setStatus] = useState('idle'); // idle | sending | success | error

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim() || status === 'sending') return;

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
          placeholder="이름 (선택)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0E207F]"
        />
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="답장 받을 이메일 (선택)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0E207F]"
        />
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="문의 또는 건의사항을 입력해주세요"
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
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === 'sending' || !message.trim()}
          className="rounded-lg bg-[#0E207F] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0a1860] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'sending' ? '전송 중...' : '보내기'}
        </button>
        {status === 'success' && <span className="text-sm text-emerald-600">전송됐습니다. 감사합니다!</span>}
        {status === 'error' && <span className="text-sm text-red-500">전송에 실패했습니다. 잠시 후 다시 시도해주세요.</span>}
      </div>
    </form>
  );
}

export default ContactForm;
