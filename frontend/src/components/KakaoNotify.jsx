'use client';

import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import text from '../lib/text';

// KakaoButton이 이미 "재로그인해본 적 있는 사람"은 이 모달 자체를 안 띄우고
// 바로 로그인으로 보내버리기 때문에, 여기는 항상 처음 로그인하는 사람만 본다.
const KakaoNotify = () => {
  const { kakaoConfigured, loading, loginUrl } = useAuth();
  const [confirmingLogin, setConfirmingLogin] = useState(false);
  const [showScreenshot, setShowScreenshot] = useState(false);

  return (
    <div>
      {!kakaoConfigured && (
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          {text.kakao.notConfiguredBadge}
        </span>
      )}

      <h3 className={kakaoConfigured ? 'font-semibold text-slate-800' : 'mt-3 font-semibold text-slate-800'}>
        {text.kakao.featureHeading}
      </h3>
      <p className="mt-1">{text.kakao.featureBody}</p>

      {!kakaoConfigured && (
        <>
          <h3 className="mt-4 font-semibold text-slate-800">{text.kakao.notConfiguredHeading}</h3>
          <p className="mt-1">{text.kakao.notConfiguredBody}</p>
        </>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">{text.kakao.loadingLabel}</p>
        ) : confirmingLogin ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-semibold text-amber-800">{text.kakao.consentPromptTitle}</p>
            <p className="mt-1 text-sm text-amber-700">
              {text.kakao.consentPromptBody.before}
              <strong className="rounded bg-amber-200/70 px-0.5 font-semibold text-amber-900">
                {text.kakao.consentPromptBody.emphasis}
              </strong>
              {text.kakao.consentPromptBody.after}
            </p>

            <button
              type="button"
              onClick={() => setShowScreenshot((open) => !open)}
              className="mt-2 text-xs font-medium text-amber-800 underline decoration-amber-400 underline-offset-2"
            >
              {showScreenshot ? text.kakao.consentPromptScreenshotToggleClose : text.kakao.consentPromptScreenshotToggleOpen}
            </button>

            {showScreenshot && (
              <div className="mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/kakao-consent-guide.png"
                  alt={text.kakao.consentPromptScreenshotAlt}
                  className="w-full rounded-lg border border-amber-200"
                />
                <p className="mt-1.5 text-xs text-amber-700">{text.kakao.consentPromptScreenshotCaption}</p>
              </div>
            )}

            <div className="mt-3 flex gap-2">
              <a
                href={loginUrl}
                className="flex min-h-10 flex-1 items-center justify-center bg-[#FEE500] px-3 text-sm font-semibold text-[#391B1B] transition hover:brightness-95"
              >
                {text.kakao.consentPromptCta}
              </a>
              <button
                type="button"
                onClick={() => setConfirmingLogin(false)}
                className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                {text.infoModal.close}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={!kakaoConfigured}
            onClick={() => setConfirmingLogin(true)}
            className={`flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              kakaoConfigured
                ? 'bg-[#FEE500] text-[#391B1B] hover:brightness-95'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            {text.kakao.loginLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default KakaoNotify;
