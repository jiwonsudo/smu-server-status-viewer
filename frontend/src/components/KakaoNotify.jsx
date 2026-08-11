'use client';

import { useAuth } from '../lib/AuthContext';

const KakaoNotify = () => {
  const { loggedIn, nickname, kakaoConfigured, loading, logout, loginUrl } = useAuth();

  return (
    <div>
      {!kakaoConfigured && (
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
          카카오 로그인 준비 중
        </span>
      )}

      <h3 className={kakaoConfigured ? 'font-semibold text-slate-800' : 'mt-3 font-semibold text-slate-800'}>
        이런 기능이에요
      </h3>
      <p className="mt-1">
        카카오 로그인을 하고 사이트 카드의 🔔를 켜두면, 그 사이트가 다운되거나 다시
        복구될 때 새로고침하지 않아도 카카오톡으로 바로 알림을 받습니다.
      </p>

      {!kakaoConfigured && (
        <>
          <h3 className="mt-4 font-semibold text-slate-800">왜 아직 로그인이 안 되나요</h3>
          <p className="mt-1">
            카카오 쪽 앱 등록과 메시지 전송 권한 승인이 끝나야 로그인 버튼이 실제로
            동작합니다. 준비되는 대로 이 배지가 사라지고 바로 로그인할 수 있게 될게요.
          </p>
        </>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-slate-400">로그인 상태 확인 중...</p>
        ) : loggedIn ? (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
            <span className="text-sm text-slate-700">
              <strong>{nickname}</strong>님으로 로그인됨
            </span>
            <button
              type="button"
              onClick={logout}
              className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 transition hover:bg-slate-100"
            >
              로그아웃
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
            카카오 로그인
          </a>
        )}
      </div>
    </div>
  );
};

export default KakaoNotify;
