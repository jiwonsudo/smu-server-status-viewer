'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { URL_ROOT } from './config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(false);
  const [nickname, setNickname] = useState(null);
  const [kakaoConfigured, setKakaoConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    return axios
      .get(`${URL_ROOT}/auth/me`, { withCredentials: true })
      .then((response) => {
        setLoggedIn(!!response.data.loggedIn);
        setNickname(response.data.nickname || null);
        setKakaoConfigured(!!response.data.kakaoConfigured);
      })
      .catch(() => {
        setLoggedIn(false);
        setNickname(null);
        setKakaoConfigured(false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    return axios.post(`${URL_ROOT}/auth/logout`, null, { withCredentials: true }).finally(refresh);
  }, [refresh]);

  const loginUrl = `${URL_ROOT}/auth/kakao/login`;

  return (
    <AuthContext.Provider value={{ loggedIn, nickname, kakaoConfigured, loading, refresh, logout, loginUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return ctx;
}
