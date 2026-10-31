import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Mail,
  CheckCircle2,
  Clock,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

import { OtpInput } from '../../../components/ui/OtpInput';
import { Button } from '../../../components/ui/Button';
import { useVerificationStatus } from '../hooks/useVerificationStatus';
import { useVerifyOtp } from '../hooks/useVerifyOtp';
import { useResendOtp } from '../hooks/useResendOtp';
import { useAuth } from '../../../hooks/useAuth';
import { setAuthToken } from '../../../api/client';
import type { NormalizedApiError } from '../../../types/auth';

export const VendorVerifyOtpPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser, refetchUser } = useAuth();

  // Load verification status from backend / auth session
  const {
    data: statusData,
    isLoading: isStatusLoading,
    isError: isStatusError,
  } = useVerificationStatus();

  // Redirect to register if there is no active session or pending registration
  useEffect(() => {
    if (isStatusError) {
      navigate('/vendor/register', { replace: true });
    }
  }, [isStatusError, navigate]);

  // Mutations
  const verifyOtpMutation = useVerifyOtp();
  const resendOtpMutation = useResendOtp();

  // Email channel state (Gmail / Email verification only)
  const [emailOtp, setEmailOtp] = useState('');
  const [emailHasError, setEmailHasError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState<string | null>(null);
  const [emailCountdown, setEmailCountdown] = useState<number | null>(null);
  const [emailLockSeconds, setEmailLockSeconds] = useState(0);
  const [emailVerifiedLocally, setEmailVerifiedLocally] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const emailResendSeconds =
    emailCountdown !== null
      ? emailCountdown
      : (statusData?.email?.resend_available_in ?? 30);

  // Active 1-second countdown clock for resends and lockout timers
  useEffect(() => {
    const timer = setInterval(() => {
      setEmailCountdown((prev) => {
        const current = prev !== null ? prev : (statusData?.email?.resend_available_in ?? 30);
        return current > 0 ? current - 1 : 0;
      });
      setEmailLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [statusData?.email?.resend_available_in]);

  const isEmailVerified = Boolean(statusData?.email?.verified || emailVerifiedLocally);
  const isEmailLocked = emailLockSeconds > 0;

  // Destination email string & Gmail detection
  const recipientEmail = statusData?.email?.email || statusData?.email?.masked || 'your email';
  const isGmail = recipientEmail.toLowerCase().includes('@gmail');
  const location = useLocation();
  const devCode = (location.state as any)?.devCode || statusData?.email?.dev_code || statusData?.dev_code;

  // Handle Email OTP Verify
  const handleVerifyEmail = (codeToVerify?: string) => {
    const code = (codeToVerify || emailOtp).trim();
    if (code.length !== 6 || isEmailLocked || isEmailVerified) return;

    setEmailHasError(false);
    setEmailErrorMessage(null);

    verifyOtpMutation.mutate(
      { channel: 'email', otp: code },
      {
        onSuccess: async (res) => {
          if (res.verified) {
            setEmailVerifiedLocally(true);
            setEmailOtp('');
            setIsRedirecting(true);
            if ((res as any).token) {
              setAuthToken((res as any).token);
            }
            if ((res as any).user) {
              setUser((res as any).user);
            } else if (user) {
              setUser({
                ...user,
                email_verified: true,
                vendor_status: 'onboarding_incomplete',
                status: 'onboarding_incomplete',
              });
            }
            try {
              await refetchUser();
            } catch {
              // ignore
            }
            // Smooth automatic redirect to onboarding upon verification
            setTimeout(() => {
              navigate('/vendor/onboarding', { replace: true });
            }, 800);
          }
        },
        onError: (err: NormalizedApiError) => {
          setEmailHasError(true);
          if (err.code === 'too_many_attempts') {
            const retrySec = err.retry_after_seconds || 900;
            setEmailLockSeconds(retrySec);
            setEmailErrorMessage(
              t('otpVerification.errorTooManyAttempts', {
                minutes: Math.ceil(retrySec / 60),
              })
            );
          } else if (err.code === 'otp_expired') {
            setEmailErrorMessage(t('otpVerification.errorOtpExpired'));
          } else {
            setEmailErrorMessage(err.message || t('otpVerification.errorInvalidOtp'));
          }
        },
      }
    );
  };

  // Handle Resend Email OTP
  const handleResendEmail = () => {
    if (emailResendSeconds > 0 || isEmailLocked || isEmailVerified) return;

    setEmailHasError(false);
    setEmailErrorMessage(null);

    resendOtpMutation.mutate(
      { channel: 'email' },
      {
        onSuccess: (res) => {
          setEmailCountdown(res.resend_available_in || 30);
          setEmailOtp('');
        },
        onError: (err: NormalizedApiError) => {
          if (err.code === 'too_many_resends') {
            setEmailErrorMessage(t('otpVerification.errorTooManyResends'));
          } else if (err.code === 'resend_too_soon') {
            setEmailCountdown(err.retry_after_seconds || 30);
          } else {
            setEmailErrorMessage(err.message || t('otpVerification.errorGeneric'));
          }
        },
      }
    );
  };

  // Manual proceed to seller onboarding if verified
  const handleContinue = async () => {
    if (!isEmailVerified) return;
    setIsRedirecting(true);
    if (user) {
      setUser({
        ...user,
        email_verified: true,
        vendor_status: 'onboarding_incomplete',
        status: 'onboarding_incomplete',
      });
    }
    try {
      await refetchUser();
    } catch {
      // ignore
    }
    navigate('/vendor/onboarding', { replace: true });
  };

  if (isStatusLoading) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-10 shadow-lg border border-[#EAE5DB] text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-[#2E4D34] border-t-transparent animate-spin mx-auto" />
        <p className="text-sm font-medium text-[#637365]">Loading verification details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EAE5DB] text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-[#EAF1EA] text-[#2E4D34] mx-auto flex items-center justify-center relative shadow-sm">
          {isEmailVerified ? (
            <CheckCircle2 className="w-7 h-7 text-[#2E4D34]" />
          ) : (
            <Mail className="w-7 h-7" />
          )}
          {isEmailVerified && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#2E4D34] text-white flex items-center justify-center text-xs animate-bounce">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28] tracking-tight">
            {isEmailVerified ? 'Email Verified Successfully' : 'Verify Your Email'}
          </h1>
          <p className="text-xs sm:text-sm text-[#637365] max-w-md mx-auto leading-relaxed">
            {isEmailVerified
              ? 'Your email has been verified. Redirecting you to seller onboarding...'
              : 'Enter the 6-digit verification code sent to your Gmail / email inbox to activate your artisan seller account.'}
          </p>
        </div>
      </div>

      {/* Gmail / Email OTP Verification Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#EAE5DB] space-y-6 transition-all">
        {/* Recipient Details & Status */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#F4EFE6]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#EAE5DB] flex items-center justify-center text-[#2E4D34]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#223B28]">Gmail / Email OTP</h2>
                {isGmail && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-[#FDE8E8] text-[#C5221F] rounded-full border border-[#F8B4B4]">
                    Gmail
                  </span>
                )}
              </div>
              <p className="text-xs text-[#637365]">
                Sent to <span className="font-semibold text-[#1D251E]">{recipientEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isGmail && !isEmailVerified && (
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#F8F9FA] text-[#1A73E8] border border-[#DADCE0] hover:bg-[#F1F3F4] transition-colors"
              >
                <span>Open Gmail</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {isEmailVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF1EA] text-[#2E4D34] border border-[#C4D3C2]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2E4D34]" />
                Verified
              </span>
            ) : isEmailLocked ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF1F2] text-[#BE123C] border border-[#FECDD3]">
                <Lock className="w-3.5 h-3.5" />
                Locked ({Math.ceil(emailLockSeconds / 60)}m)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF8EB] text-[#B45309] border border-[#FDE68A]">
                <Clock className="w-3.5 h-3.5" />
                Pending Code
              </span>
            )}
          </div>
        </div>

        {/* Verification Body */}
        {isEmailVerified ? (
          <div className="p-5 rounded-2xl bg-[#EAF1EA]/70 border border-[#D1DDD0] flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-[#2E4D34] animate-pulse" />
            <h3 className="text-sm font-bold text-[#223B28]">Email Confirmed</h3>
            <p className="text-xs text-[#637365] max-w-sm">
              Your email address has been verified. You can now proceed with setting up your store details and KYC.
            </p>
          </div>
        ) : (
          <div className="space-y-5 pt-1">
            {devCode && (
              <div className="p-3.5 rounded-2xl bg-[#EAF1EA] border border-[#C4D3C2] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#2E4D34]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#2E4D34] flex-shrink-0" />
                  <span>
                    Your 6-Digit Code:{' '}
                    <strong className="font-mono font-bold tracking-widest text-sm bg-white px-2 py-0.5 rounded border border-[#C4D3C2]">
                      {devCode}
                    </strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmailOtp(devCode);
                    handleVerifyEmail(devCode);
                  }}
                  className="px-3 py-1 bg-[#2E4D34] text-white rounded-lg font-semibold hover:bg-[#223B28] text-xs transition-colors shadow-xs"
                >
                  Auto-Fill & Verify
                </button>
              </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-2">
              <label htmlFor="email-otp-0" className="text-xs font-semibold text-[#5F6D61] uppercase tracking-wider">
                Enter 6-Digit Code
              </label>
              <OtpInput
                idPrefix="email-otp"
                value={emailOtp}
                onChange={(val) => {
                  setEmailOtp(val);
                  if (emailHasError) {
                    setEmailHasError(false);
                    setEmailErrorMessage(null);
                  }
                }}
                onComplete={(code) => handleVerifyEmail(code)}
                hasError={emailHasError}
                errorMessage={emailErrorMessage}
                disabled={isEmailLocked || verifyOtpMutation.isPending}
                autoFocus={true}
              />
            </div>

            {/* Error Message */}
            {emailErrorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-2xl bg-[#FFF8F7] border border-[#FAC7C3] flex items-center gap-2.5 text-xs text-[#DC2626] font-medium"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{emailErrorMessage}</span>
              </div>
            )}

            {/* Resend and Action Row */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={
                  emailResendSeconds > 0 ||
                  isEmailLocked ||
                  resendOtpMutation.isPending
                }
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E4D34] hover:text-[#223B28] disabled:text-[#9EB89D] disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    resendOtpMutation.isPending ? 'animate-spin' : ''
                  }`}
                />
                <span>
                  {emailResendSeconds > 0
                    ? `Resend code in ${emailResendSeconds}s`
                    : 'Resend Verification Code'}
                </span>
              </button>

              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={
                  emailOtp.length !== 6 ||
                  isEmailLocked ||
                  verifyOtpMutation.isPending
                }
                isLoading={verifyOtpMutation.isPending}
                loadingText="Verifying..."
                onClick={() => handleVerifyEmail()}
                className="shadow-sm px-6"
              >
                Verify Code
              </Button>
            </div>

            {/* Inbox Tips */}
            <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] text-xs text-[#637365] space-y-1">
              <p className="font-semibold text-[#223B28]">Didn't receive the email?</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#78887A]">
                <li>Check your Spam, Junk, or Promotions tab in Gmail</li>
                <li>Wait 30 seconds and click "Resend Verification Code"</li>
                <li>Verify that your registered email address above is correct</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions: Continue Button & Navigation Link */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#EAE5DB] space-y-4 text-center">
        <Button
          type="button"
          variant="primary"
          size="lg"
          disabled={!isEmailVerified || isRedirecting}
          isLoading={isRedirecting}
          loadingText="Redirecting..."
          onClick={handleContinue}
          className="w-full shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {isEmailVerified ? 'Proceed to Seller Onboarding' : 'Verify Email to Continue'}
        </Button>

        <div className="flex items-center justify-between text-xs font-semibold pt-2 border-t border-[#F4EFE6] px-2">
          <Link
            to="/vendor/register"
            className="inline-flex items-center gap-1.5 text-[#637365] hover:text-[#2E4D34] transition-colors focus:outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Wrong email? Re-register</span>
          </Link>

          <Link
            to="/vendor/login"
            className="text-[#2E4D34] hover:underline transition-colors"
          >
            Already verified? Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VendorVerifyOtpPage;
