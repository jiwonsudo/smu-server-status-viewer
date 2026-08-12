'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { URL_ROOT } from './config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [nickname, setNickname] = useState(null);
  const [kakaoConfigured, setKakaoConfigured] = useState(false);
  const [notifyConsent, setNotifyConsent] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return axios
      .get(`${URL_ROOT}/auth/me`, { withCredentials: true })
      .then((response) => {
        setLoggedIn(!!response.data.loggedIn);
        setNickname(response.data.nickname || null);
        setKakaoConfigured(!!response.data.kakaoConfigured);
        setNotifyConsent(!!response.data.notifyConsent);
      })
      .catch(() => {
        setLoggedIn(false);
        setNickname(null);
        setKakaoConfigured(false);
        setNotifyConsent(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    return axios.post(`${URL_ROOT}/auth/logout`, null, { withCredentials: true }).finally(refresh);
  }, [refresh]);

  // 로그아웃과 다르게 되돌릴 수 없다 — 카카오 연결까지 끊고 DB의 계정/구독을 전부 지운다.
  const withdraw = useCallback(() => {
    return axios.post(`${URL_ROOT}/auth/withdraw`, null, { withCredentials: true }).finally(refresh);
  }, [refresh]);

  const loginUrl = `${URL_ROOT}/auth/kakao/login`;

  return (
    <AuthContext.Provider
      value={{ loggedIn, nickname, kakaoConfigured, notifyConsent, loading, refresh, logout, withdraw, loginUrl }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
