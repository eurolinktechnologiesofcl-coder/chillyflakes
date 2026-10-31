import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBuyerAuth } from '../context/BuyerAuthContextDef';
import { FullPageSpinner } from '../features/buyerAuth/AuthUI';

/** Protects shopper-only routes (checkout, account, order confirmation). */
export const RequireBuyerAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { status, isAuthenticated } = useBuyerAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  return children;
};
