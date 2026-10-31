import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { VendorUser } from '../types/auth';
import { getVendorMe, logoutVendor } from '../api/vendorAuth';
import { setOnUnauthorizedCallback, setCsrfToken, setAuthToken, fetchCsrfToken } from '../api/client';
import { VendorAuthContext } from './VendorAuthContextDef';

export const VendorAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // In-memory user state ONLY - no localStorage or sessionStorage
  const [user, setUser] = useState<VendorUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchUser = useCallback(async () => {
    try {
      const userData = await getVendorMe();
      setUser(userData);
    } catch {
      // Not logged in or session expired
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUser();

    // Register 401 callback to clear memory user state
    setOnUnauthorizedCallback(() => {
      setUser(null);
    });

    // Admin decided on the application (realtime) → refresh session so route guards update
    const onStatusUpdated = () => void fetchUser();
    window.addEventListener('cf_vendor_status_updated', onStatusUpdated);

    return () => {
      setOnUnauthorizedCallback(null);
      window.removeEventListener('cf_vendor_status_updated', onStatusUpdated);
    };
  }, [fetchUser]);

  const logout = async () => {
    try {
      // Cancel in-flight queries so no stale responses can fulfill after logout
      await queryClient.cancelQueries();
      queryClient.clear();

      await logoutVendor();
    } catch (err) {
      console.warn('[VendorAuth] Logout request error:', err);
    } finally {
      setCsrfToken(null);
      setAuthToken(null);
      setUser(null);
      queryClient.clear();

      // Fetch a fresh token and wait for it to complete before navigating
      try {
        await fetchCsrfToken('after logout');
      } catch (csrfErr) {
        console.warn('[CSRF] Post-logout token fetch warning:', csrfErr);
      }

      if (typeof window !== 'undefined' && window.location.pathname !== '/vendor/login') {
        window.location.assign('/vendor/login');
      }
    }
  };

  return (
    <VendorAuthContext.Provider
      value={{
        user,
        isLoading,
        setUser,
        logout,
        refetchUser: fetchUser,
      }}
    >
      {children}
    </VendorAuthContext.Provider>
  );
};

export default VendorAuthProvider;
