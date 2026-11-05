import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';
import { setUnauthorizedHandler } from '../api/client';
import { clearToken, getToken, setToken } from './tokenStore';

/**
 * Oturum durumu. status: 'loading' (sayfa açılışında token doğrulanıyor), 'anonymous', 'authenticated'.
 * Yetkiler backend'den gelir (MeResponse.permissions); admin tüm ekranlara sahiptir.
 * Not: menüde gizleme yalnızca görünüm içindir; asıl yetki kontrolü backend'dedir.
 */
export const AuthContext = createContext(null);

export function buildAuthValue({ status, user, notice, login, logout, changePassword, clearNotice }) {
  const permissions = new Set(user?.permissions ?? []);
  return {
    status,
    user,
    notice, // örn. "Oturumunuzun süresi doldu" (login ekranında gösterilir)
    isAdmin: user?.role === 'ADMIN',
    hasScreen: (permission) => user?.role === 'ADMIN' || permissions.has(permission),
    login,
    logout,
    changePassword,
    clearNotice,
  };
}

export function AuthProvider({ children }) {
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'anonymous'));
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState(null);

  const logout = useCallback((message = null) => {
    clearToken();
    setUser(null);
    setStatus('anonymous');
    setNotice(message);
  }, []);

  // Herhangi bir istek 401 alırsa (süre doldu, şifre sıfırlandı, kullanıcı pasife alındı) oturum kapanır
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Oturumunuzun süresi doldu veya sonlandırıldı. Lütfen tekrar giriş yapın.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Sayfa yenilenince mevcut token ile kullanıcı bilgisi alınır
  useEffect(() => {
    if (!getToken()) return;
    authApi
      .getMe()
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch(() => logout());
  }, [logout]);

  const login = useCallback(async (username, password) => {
    const result = await authApi.login(username, password);
    setToken(result.token);
    setUser(result.user);
    setNotice(null);
    setStatus('authenticated');
    return result.user;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const result = await authApi.changePassword(currentPassword, newPassword);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const value = useMemo(
    () => buildAuthValue({ status, user, notice, login, logout, changePassword, clearNotice: () => setNotice(null) }),
    [status, user, notice, login, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return ctx;
}
