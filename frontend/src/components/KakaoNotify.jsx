'use client';

import { useAuth } from '../lib/AuthContext';
import text from '../lib/text';

const KakaoNotify = () => {
  const { loggedIn, nickname, kakaoConfigured, loading, logout, loginUrl } = useAuth();

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
        ) : loggedIn ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <span className="text-sm text-slate-700">
              <strong>{nickname}</strong>
              {text.kakao.loggedInSuffix}
            </span>
            <button
              type="button"
              onClick={logout}
              className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              {text.kakao.logoutLabel}
            </button>
          </div>
        ) : (
          <a
            href={kakaoConfigured ? loginUrl : undefined}
            aria-disabled={!kakaoConfigured}
            className={`flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              kakaoConfigured
                ? 'bg-[#FEE500] text-[#391B1B] hover:brightness-95'
                : 'cursor-not-allowed bg-slate-100 text-slate-400'
            }`}
          >
            {text.kakao.loginLabel}
          </a>
        )}
      </div>
    </div>
  );
};

export default KakaoNotify;
