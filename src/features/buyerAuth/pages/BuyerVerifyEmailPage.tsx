import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { useBuyerAuth } from '../../../context/BuyerAuthContextDef';
import { toApiError, type VerificationChallenge } from '../../../api/buyerAuthApi';
import { AuthShell, Alert, SubmitButton, OtpInput, FullPageSpinner } from '../AuthUI';
import { safeRedirect, getBagCount, EMAIL_RE } from '../authUtils';

/** Step 2 of sign-up (and of signing in with an unverified email): confirm the emailed code. */
export const BuyerVerifyEmailPage: React.FC = () => {
  const { verifyEmail, resendVerification, status, isAuthenticated } = useBuyerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const email = (params.get('email') || '').trim().toLowerCase();
  const redirect = safeRedirect(params.get('redirect'), '/');
  const bagCount = useMemo(getBagCount, []);
  const initial = (location.state as Partial<VerificationChallenge> | null) || null;

  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(initial?.dev_code ?? null);
  const [info, setInfo] = useState<string | null>(initial?.message ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState<number>(initial?.resend_after_seconds ?? 30);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  if (status === 'loading') return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={redirect} replace />;
  if (!EMAIL_RE.test(email)) return <Navigate to="/register" replace />;

  const onVerify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (code.length !== 6) return;
    setError(null);
    setLoading(true);
    try {
      await verifyEmail(email, code);
      navigate(redirect, { replace: true });
    } catch (err) {
      const e = toApiError(err);
      setCode('');
      if (e.code === 'already_verified') {
        navigate(`/login?email=${encodeURIComponent(email)}${redirect !== '/' ? `&redirect=${encodeURIComponent(redirect)}` : ''}`, { replace: true });
        return;
      }
      if (e.code === 'code_expired' || e.code === 'too_many_attempts') setCooldown(0);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await resendVerification(email);
      setDevCode(res.dev_code ?? null);
      setInfo('A new code has been sent. Check your inbox (and spam folder).');
      setCooldown(res.resend_after_seconds || 30);
      setCode('');
    } catch (err) {
      const e = toApiError(err);
      setError(e.message);
      if (e.retry_after_seconds) setCooldown(e.retry_after_seconds);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle={
        <>
          We sent a 6-digit code to <span className="font-semibold text-[#223B28]">{email}</span>. Enter it below to activate your account.
        </>
      }
      bagCount={bagCount}
    >
      <form onSubmit={onVerify} noValidate className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl bg-[#F6F3EC] border border-[#ECE7DD] p-4">
          <span className="w-10 h-10 rounded-xl bg-white border border-[#E3DDD1] flex items-center justify-center text-[#2E4D34]">
            <MailCheck className="w-5 h-5" />
          </span>
          <p className="text-xs text-[#5F6D61] leading-relaxed">
            The code expires in 10 minutes. Can't find it? Check your spam or promotions folder.
          </p>
        </div>

        {error && <Alert tone="error">{error}</Alert>}
        {info && !error && <Alert tone="success">{info}</Alert>}
        {devCode && (
          <Alert tone="info">
            <span className="font-semibold">Development mode:</span> your code is{' '}
            <span className="font-mono font-bold tracking-widest">{devCode}</span>. This hint never appears in production.
          </Alert>
        )}

        <OtpInput idPrefix="verify-otp" value={code} onChange={setCode} hasError={!!error} />

        <SubmitButton id="verify-email-submit" loading={loading} disabled={code.length !== 6}>
          {loading ? 'Verifying…' : 'Verify & continue'}
        </SubmitButton>

        <div className="flex items-center justify-between text-xs">
          <Link
            to={`/register${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
            className="inline-flex items-center gap-1.5 font-semibold text-[#5F6D61] hover:text-[#223B28]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Wrong email?
          </Link>
          <button
            id="verify-email-resend"
            type="button"
            disabled={cooldown > 0 || loading}
            onClick={onResend}
            className="font-semibold text-[#2E4D34] hover:underline disabled:text-[#9AA59B] disabled:no-underline"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </AuthShell>
  );
};

export default BuyerVerifyEmailPage;
