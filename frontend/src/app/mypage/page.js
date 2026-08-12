'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../lib/AuthContext';
import { URL_ROOT } from '../../lib/config';
import { SITE_INFOS } from '../../lib/siteInfos';
import { BellIcon } from '../../components/icons';
import text from '../../lib/text';

export default function MyPage() {
  const { loggedIn, nickname, loading, notifyConsent, logout, withdraw, loginUrl } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [confirmingWithdraw, setConfirmingWithdraw] = useState(false);

  useEffect(() => {
    if (!loggedIn) return;
    axios
      .get(`${URL_ROOT}/subscriptions`, { withCredentials: true })
      .then((response) => setSubscriptions(response.data || []))
      .catch(() => setSubscriptions([]));
  }, [loggedIn]);

  const toggleSubscription = (siteKey) => {
    if (!notifyConsent) return;
    const isSubscribed = subscriptions.includes(siteKey);
    setSubscriptions((prev) => (isSubscribed ? prev.filter((key) => key !== siteKey) : [...prev, siteKey]));

    axios({
      method: isSubscribed ? 'delete' : 'put',
      url: `${URL_ROOT}/subscriptions/${siteKey}`,
      withCredentials: true,
    }).catch(() => {
      setSubscriptions((prev) => (isSubscribed ? [...prev, siteKey] : prev.filter((key) => key !== siteKey)));
    });
  };

  if (loading) return null;

  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-lg font-semibold text-slate-900">{text.mypage.notLoggedInHeading}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.mypage.notLoggedInBody}</p>
        <a
          href={loginUrl}
          className="mt-4 inline-flex min-h-11 items-center justify-center bg-[#FEE500] px-6 text-sm font-semibold text-[#391B1B] transition hover:brightness-95"
        >
          {text.kakao.loginLabel}
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold text-slate-900">{text.mypage.greeting(nickname)}</h1>

      {!notifyConsent && (
        <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {text.mypage.noConsentNotice}
          <a href={loginUrl} className="mt-2 block font-semibold underline">
            {text.kakao.consentPromptCta}
          </a>
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-500">{text.mypage.subscriptionsHeading}</h2>
      <p className="mt-1 text-xs text-slate-400">{text.mypage.subscriptionsHint}</p>
      <div className="mt-2 flex flex-col divide-y divide-slate-100 border border-slate-200">
        {SITE_INFOS.map((site) => {
          const subscribed = subscriptions.includes(site.siteKey);
          return (
            <button
              key={site.siteKey}
              type="button"
              onClick={() => toggleSubscription(site.siteKey)}
              disabled={!notifyConsent}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-sm text-slate-700">{site.title}</span>
              <BellIcon
                filled={subscribed}
                className={`h-4 w-4 shrink-0 ${subscribed ? 'text-[#0E207F]' : 'text-slate-300'}`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-8 border-t border-slate-200 pt-4">
        {confirmingWithdraw ? (
          <div className="border border-rose-200 bg-rose-50 p-3">
            <p className="text-sm font-semibold text-rose-800">{text.kakao.withdrawConfirmTitle}</p>
            <p className="mt-1 text-sm text-rose-700">{text.kakao.withdrawConfirmBody}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={withdraw}
                className="flex min-h-10 flex-1 items-center justify-center bg-rose-600 px-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                {text.kakao.withdrawConfirmCta}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingWithdraw(false)}
                className="min-h-10 border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-100"
              >
                {text.kakao.withdrawCancelCta}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={logout}
              className="text-sm text-slate-500 underline decoration-transparent underline-offset-2 hover:text-slate-700 hover:decoration-slate-400"
            >
              {text.kakao.logoutLabel}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingWithdraw(true)}
              className="text-xs text-slate-400 underline decoration-transparent underline-offset-2 hover:text-rose-600 hover:decoration-rose-300"
            >
              {text.kakao.withdrawLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
