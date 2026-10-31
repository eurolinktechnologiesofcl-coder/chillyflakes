import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminNoAccessPage } from '../pages/AdminNoAccessPage';
import type { VendorStatus } from '../types/auth';

export function getRedirectForStatus(status: VendorStatus, from?: string): string {
  switch (status) {
    case 'pending_verification':
      return '/vendor/verify-otp';
    case 'onboarding_incomplete':
    case 'resubmission_requested':
      return '/vendor/onboarding';
    case 'under_review':
    case 'rejected':
    case 'suspended':
      return '/vendor/status';
    case 'approved':
      return from || '/vendor/dashboard';
    default:
      return '/vendor/dashboard';
  }
}

export interface RequireApprovedVendorProps {
  children?: React.ReactNode;
}

/**
 * Guard for vendor dashboard & seller management routes.
 * Strictly requires authenticated user with vendor_status === 'approved'.
 */
export const RequireApprovedVendor: React.FC<RequireApprovedVendorProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const { admin, isLoading: adminLoading } = useAdminAuth();
  const location = useLocation();

  if (isLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-[#2E4D34] border-t-transparent rounded-full" />
        </div>
        <p className="mt-4 text-xs font-semibold text-[#5F6D61] tracking-wide uppercase">
          Loading Seller Portal...
        </p>
      </div>
    );
  }

  // If admin is signed in, forbid access to /vendor
  if (admin && admin.role === 'admin') {
    return <AdminNoAccessPage role="admin" />;
  }

  if (!user) {
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  if (user.vendor_status !== 'approved') {
    return <Navigate to={getRedirectForStatus(user.vendor_status)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

/**
 * Guard for /vendor/onboarding.
 * Non-approved sellers in onboarding_incomplete or resubmission_requested can access.
 * Approved sellers are redirected to /vendor/dashboard.
 * Under review / suspended sellers are redirected to /vendor/status.
 */
export const RequireVendorOnboarding: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-[#2E4D34] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  if (user.vendor_status === 'approved') {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  if (user.vendor_status === 'pending_verification' && !user.email_verified) {
    return <Navigate to="/vendor/verify-otp" replace />;
  }

  if (
    user.vendor_status === 'under_review' ||
    user.vendor_status === 'rejected' ||
    user.vendor_status === 'suspended'
  ) {
    return <Navigate to="/vendor/status" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

/**
 * Guard for /vendor/status.
 * Sellers in under_review, rejected, or suspended access this page.
 * Approved sellers are redirected to /vendor/dashboard.
 * Incomplete onboarding sellers are redirected to /vendor/onboarding.
 */
export const RequireVendorStatusGate: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-[#2E4D34] border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/vendor/login" state={{ from: location }} replace />;
  }

  if (user.vendor_status === 'approved') {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  if (user.vendor_status === 'pending_verification' && !user.email_verified) {
    return <Navigate to="/vendor/verify-otp" replace />;
  }

  if (user.vendor_status === 'onboarding_incomplete') {
    return <Navigate to="/vendor/onboarding" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RequireApprovedVendor;
