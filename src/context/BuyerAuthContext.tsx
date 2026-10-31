import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buyerAuthApi,
  getBuyerToken,
  setBuyerToken,
  BUYER_TOKEN_KEY,
  type BuyerAuthUser,
  type BuyerRegisterPayload,
} from '../api/buyerAuthApi';
import { BuyerAuthContext, type BuyerAuthStatus } from './BuyerAuthContextDef';
import { registerBuyerCustomer } from '../utils/platformSync';

/** Keeps the Super Admin customer list in sync until customers move to the API. */
const mirrorCustomer = (u: BuyerAuthUser) => registerBuyerCustomer({ name: u.name, email: u.email, phone: u.phone });

export const BuyerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<BuyerAuthUser | null>(null);
  const [status, setStatus] = useState<BuyerAuthStatus>(() => (getBuyerToken() ? 'loading' : 'guest'));

  // Restore session on boot
  useEffect(() => {
    if (!getBuyerToken()) return;
    let cancelled = false;
    buyerAuthApi
      .me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        setBuyerToken(null);
        setUser(null);
        setStatus('guest');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Cross-tab sign-out / sign-in
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== BUYER_TOKEN_KEY) return;
      if (!e.newValue) {
        setUser(null);
        setStatus('guest');
      } else {
        buyerAuthApi
          .me()
          .then((u) => {
            setUser(u);
            setStatus('authenticated');
          })
          .catch(() => undefined);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await buyerAuthApi.login(identifier, password);
    setBuyerToken(res.token);
    setUser(res.user);
    setStatus('authenticated');
    mirrorCustomer(res.user);
    return res.user;
  }, []);

  const register = useCallback((payload: BuyerRegisterPayload) => buyerAuthApi.register(payload), []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    const res = await buyerAuthApi.verifyEmail(email, code);
    setBuyerToken(res.token);
    setUser(res.user);
    setStatus('authenticated');
    mirrorCustomer(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await buyerAuthApi.logout();
    } catch {
      // server session may already be gone — still clear locally
    }
    setBuyerToken(null);
    setUser(null);
    setStatus('guest');
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Pick<BuyerAuthUser, 'name' | 'phone'>>) => {
    const u = await buyerAuthApi.updateProfile(patch);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated' && !!user,
      login,
      register,
      verifyEmail,
      resendVerification: buyerAuthApi.resendVerification,
      logout,
      updateProfile,
      requestPasswordReset: buyerAuthApi.requestPasswordReset,
      verifyPasswordReset: buyerAuthApi.verifyPasswordReset,
      resetPassword: buyerAuthApi.resetPassword,
    }),
    [user, status, login, register, verifyEmail, logout, updateProfile]
  );

  return <BuyerAuthContext.Provider value={value}>{children}</BuyerAuthContext.Provider>;
};
