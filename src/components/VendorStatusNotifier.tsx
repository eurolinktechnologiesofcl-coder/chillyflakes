import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, PartyPopper, ShieldAlert, X, XCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getVendorStatus } from '../api/vendorOnboarding';
import type { VendorStatusResponse } from '../types/onboarding';

type DecisionStatus = 'approved' | 'resubmission_requested' | 'rejected' | 'suspended' | 'under_review';

const STEP_LABELS: Record<number, string> = {
  1: 'Store Identity',
  2: 'Pickup Address',
  3: 'KYC Documents',
  4: 'Bank Details',
};

const COPY: Record<
  DecisionStatus,
  { title: string; message: string; cta: string; path: string; tone: string; ring: string; icon: React.ElementType }
> = {
  approved: {
    title: 'Your seller account is approved! 🎉',
    message: 'Your KYC and store details are verified. You can now list products and start selling on ChillyFlakes.',
    cta: 'Go to Seller Dashboard',
    path: '/vendor/dashboard',
    tone: 'text-emerald-700 bg-emerald-50',
    ring: 'border-emerald-200',
    icon: PartyPopper,
  },
  resubmission_requested: {
    title: 'Changes requested on your application',
    message: 'Our compliance team reviewed your application and needs a few corrections before approval.',
    cta: 'Fix my application',
    path: '/vendor/onboarding',
    tone: 'text-amber-700 bg-amber-50',
    ring: 'border-amber-200',
    icon: AlertTriangle,
  },
  rejected: {
    title: 'Your application was not approved',
    message: 'Unfortunately your seller application could not be approved at this time.',
    cta: 'View application status',
    path: '/vendor/status',
    tone: 'text-red-700 bg-red-50',
    ring: 'border-red-200',
    icon: XCircle,
  },
  suspended: {
    title: 'Your seller account is suspended',
    message: 'Your account has been suspended by our compliance team. Your listings are hidden until this is resolved.',
    cta: 'View account status',
    path: '/vendor/status',
    tone: 'text-red-700 bg-red-50',
    ring: 'border-red-200',
    icon: ShieldAlert,
  },
  under_review: {
    title: 'Application under review',
    message: 'Your application has been submitted and is being reviewed by our compliance team.',
    cta: 'View application status',
    path: '/vendor/status',
    tone: 'text-sky-700 bg-sky-50',
    ring: 'border-sky-200',
    icon: Clock,
  },
};

/** Statuses that warrant a pop-up when first seen in this browser session. */
const POPUP_STATUSES: DecisionStatus[] = ['approved', 'resubmission_requested', 'rejected', 'suspended'];
const SEEN_KEY = 'cf_vendor_status_seen';
const POLL_MS = 20000;

/**
 * Global vendor notifier: pops a modal whenever the admin decides on the seller's application
 * (realtime socket event, or detected on load / by polling) and keeps a small banner on
 * marketplace pages so the seller can always jump back into the Seller Hub.
 */
export const VendorStatusNotifier: React.FC = () => {
  const { user, refetchUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [popup, setPopup] = useState<{ status: DecisionStatus; info: VendorStatusResponse | null } | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const vendorStatus = user?.vendor_status as string | undefined;

  const showFor = useCallback(async (status: DecisionStatus) => {
    let info: VendorStatusResponse | null = null;
    try {
      info = await getVendorStatus();
    } catch {
      /* show generic copy */
    }
    sessionStorage.setItem(SEEN_KEY, `${status}:${info?.rejection_reason || ''}`);
    setPopup({ status, info });
  }, []);

  // 1) Status changed (socket → VendorAuthContext refetch, polling, or first load)
  useEffect(() => {
    if (!user || !vendorStatus) {
      lastStatusRef.current = null;
      return;
    }
    const prev = lastStatusRef.current;
    lastStatusRef.current = vendorStatus;
    if (!POPUP_STATUSES.includes(vendorStatus as DecisionStatus)) return;

    const changedLive = prev !== null && prev !== vendorStatus;
    const seen = sessionStorage.getItem(SEEN_KEY) || '';
    const notSeenThisSession = !seen.startsWith(`${vendorStatus}:`);
    // Approved sellers only need the pop-up when it happens live
    if (changedLive || (vendorStatus !== 'approved' && notSeenThisSession)) {
      void showFor(vendorStatus as DecisionStatus);
    }
  }, [user, vendorStatus, showFor]);

  // 2) Realtime event carries a reason — always surface it (e.g. a second resubmission request)
  useEffect(() => {
    const onUpdate = (e: Event) => {
      const status = (e as CustomEvent).detail?.status as DecisionStatus | undefined;
      if (status && POPUP_STATUSES.includes(status)) void showFor(status);
    };
    window.addEventListener('cf_vendor_status_updated', onUpdate);
    return () => window.removeEventListener('cf_vendor_status_updated', onUpdate);
  }, [showFor]);

  // 3) Polling fallback in case the socket is not connected (only while awaiting a decision)
  useEffect(() => {
    if (!user || !['under_review', 'resubmission_requested', 'rejected', 'suspended'].includes(vendorStatus || '')) return;
    const id = window.setInterval(async () => {
      try {
        const s = await getVendorStatus();
        if (s.status !== vendorStatus) await refetchUser();
      } catch {
        /* ignore */
      }
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [user, vendorStatus, refetchUser]);

  if (!user) return null;

  const onVendorPage = location.pathname.startsWith('/vendor') || location.pathname.startsWith('/admin');
  const bannerStatus = vendorStatus as DecisionStatus | 'onboarding_incomplete' | undefined;
  const showBanner =
    !popup &&
    !onVendorPage &&
    bannerStatus &&
    ['resubmission_requested', 'rejected', 'suspended', 'under_review', 'onboarding_incomplete'].includes(bannerStatus);

  const goTo = (path: string) => {
    setPopup(null);
    navigate(path);
  };

  const copy = popup ? COPY[popup.status] : null;
  const Icon = copy?.icon || CheckCircle2;
  const flagged = (popup?.info?.flagged_sections || []).map((n) => STEP_LABELS[n]).filter(Boolean);
  const reason = popup?.info?.rejection_reason;

  return (
    <>
      {popup && copy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className={`bg-white rounded-3xl max-w-md w-full border ${copy.ring} shadow-2xl overflow-hidden animate-scaleUp`}>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${copy.tone}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <button
                  type="button"
                  onClick={() => setPopup(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <h2 className="font-serif text-xl font-bold text-[#223B28]">{copy.title}</h2>
                <p className="text-sm text-[#5F6D61] leading-relaxed">{copy.message}</p>
              </div>

              {reason && popup.status !== 'approved' && (
                <div className={`p-3.5 rounded-2xl border ${copy.ring} ${copy.tone} text-xs`}>
                  <p className="font-bold uppercase tracking-wider text-[10px] mb-1">Reviewer note</p>
                  <p className="leading-relaxed whitespace-pre-line">{reason}</p>
                </div>
              )}

              {flagged.length > 0 && popup.status === 'resubmission_requested' && (
                <div className="text-xs text-[#223B28]">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-[#8E9B90] mb-1.5">Sections to update</p>
                  <div className="flex flex-wrap gap-1.5">
                    {flagged.map((f) => (
                      <span key={f} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-semibold">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[11px] text-[#8E9B90]">We have also emailed this update to {user.email}.</p>
            </div>
            <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#EAE5DB] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPopup(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F6D61] hover:bg-white"
              >
                Later
              </button>
              <button
                type="button"
                onClick={() => goTo(copy.path)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28] shadow-sm"
              >
                {copy.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanner && (
        <button
          type="button"
          onClick={() =>
            navigate(
              bannerStatus === 'onboarding_incomplete'
                ? '/vendor/onboarding'
                : COPY[bannerStatus as DecisionStatus]?.path || '/vendor/status'
            )
          }
          className={`fixed bottom-5 left-5 z-[90] max-w-xs text-left flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border bg-white hover:shadow-2xl transition ${
            bannerStatus === 'onboarding_incomplete' ? 'border-[#D1DDD0]' : COPY[bannerStatus as DecisionStatus]?.ring
          }`}
        >
          <span
            className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
              bannerStatus === 'onboarding_incomplete' ? 'bg-[#EAF1EA] text-[#2E4D34]' : COPY[bannerStatus as DecisionStatus]?.tone
            }`}
          >
            {React.createElement(
              bannerStatus === 'onboarding_incomplete' ? Clock : COPY[bannerStatus as DecisionStatus]?.icon || Clock,
              { className: 'w-4 h-4' }
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9B90]">Seller Hub</span>
            <span className="block text-xs font-semibold text-[#223B28] truncate">
              {bannerStatus === 'onboarding_incomplete'
                ? 'Finish your seller onboarding'
                : COPY[bannerStatus as DecisionStatus]?.title}
            </span>
          </span>
          <ArrowRight className="w-4 h-4 text-[#2E4D34] shrink-0" />
        </button>
      )}
    </>
  );
};

export default VendorStatusNotifier;
