import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MailCheck, KeyRound, ShieldCheck } from 'lucide-react';
import { useBuyerAuth } from '../../../context/BuyerAuthContextDef';
import { toApiError } from '../../../api/buyerAuthApi';
import { AuthShell, TextField, PasswordField, StrengthMeter, Alert, SubmitButton, OtpInput } from '../AuthUI';
import { EMAIL_RE, isPasswordValid, safeRedirect, getBagCount } from '../authUtils';

type Step = 'email' | 'code' | 'password';

const STEPS: { key: Step; label: string; icon: typeof MailCheck }[] = [
  { key: 'email', label: 'Email', icon: MailCheck },
  { key: 'code', label: 'Verify', icon: ShieldCheck },
  { key: 'password', label: 'New password', icon: KeyRound },
];

export const BuyerForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset, verifyPasswordReset, resetPassword } = useBuyerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'), '/');
  const bagCount = useMemo(getBagCount, []);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; code?: string; password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => window.clearInterval(t);
  }, [cooldown]);

  const loginHref = (extra = '') => {
    const p = new URLSearchParams();
    if (redirect !== '/') p.set('redirect', redirect);
    if (extra) p.set('reset', '1');
    if (email) p.set('email', email.trim().toLowerCase());
    const s = p.toString();
    return `/login${s ? `?${s}` : ''}`;
  };

  const sendCode = async (isResend = false) => {
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) {
      setFieldError({ email: 'Enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset(email.trim().toLowerCase());
      setDevCode(res.dev_code ?? null);
      setInfo(isResend ? 'A new code has been sent.' : res.message);
      setCooldown(res.resend_after_seconds || 30);
      setCode('');
      setStep('code');
    } catch (err) {
      setError(toApiError(err).message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    if (code.length !== 6) {
      setFieldError({ code: 'Enter the 6-digit code.' });
      return;
    }
    setLoading(true);
    try {
      const token = await verifyPasswordReset(email.trim().toLowerCase(), code);
      setResetToken(token);
      setInfo(null);
      setStep('password');
    } catch (err) {
      const e = toApiError(err);
      setError(e.message);
      setCode('');
      if (e.code === 'code_expired' || e.code === 'too_many_attempts') setCooldown(0);
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    const fe: typeof fieldError = {};
    if (!isPasswordValid(password)) fe.password = 'Use 8+ characters with at least one letter and one number.';
    if (confirm !== password) fe.confirm = 'Passwords do not match.';
    setFieldError(fe);
    if (Object.keys(fe).length) return;
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase(), resetToken, password);
      navigate(loginHref('reset'), { replace: true });
    } catch (err) {
      const e = toApiError(err);
      if (e.code === 'invalid_token') {
        setStep('email');
        setResetToken('');
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <AuthShell
      title="Reset your password"
      subtitle={
        step === 'email'
          ? 'Enter the email linked to your account and we’ll send you a 6-digit verification code.'
          : step === 'code'
          ? <>Enter the code sent to <span className="font-semibold text-[#223B28]">{email.trim().toLowerCase()}</span>. It expires in 10 minutes.</>
          : 'Choose a strong new password. You’ll be signed out of other devices.'
      }
      bagCount={bagCount}
    >
      {/* Stepper */}
      <ol className="flex items-center gap-2 mb-7" aria-label="Progress">
        {STEPS.map((s, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          const Icon = s.icon;
          return (
            <li key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center border text-xs font-semibold transition-colors ${
                  done ? 'bg-[#2E4D34] border-[#2E4D34] text-white' : active ? 'bg-[#EAF1EA] border-[#2E4D34] text-[#2E4D34]' : 'bg-white border-[#E3DDD1] text-[#9AA59B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className={`text-[11px] font-semibold hidden sm:inline ${active || done ? 'text-[#223B28]' : 'text-[#9AA59B]'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className={`h-px flex-1 ${done ? 'bg-[#2E4D34]' : 'bg-[#E3DDD1]'}`} />}
            </li>
          );
        })}
      </ol>

      <div className="space-y-5">
        {error && <Alert tone="error">{error}</Alert>}
        {info && !error && <Alert tone="success">{info}</Alert>}

        {step === 'email' && (
          <form noValidate onSubmit={(e) => { e.preventDefault(); sendCode(); }} className="space-y-5">
            <TextField
              id="reset-email"
              type="email"
              label="Email address"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError({});
              }}
              error={fieldError.email}
            />
            <SubmitButton id="reset-send-code" loading={loading}>
              {loading ? 'Sending code…' : 'Send verification code'}
            </SubmitButton>
          </form>
        )}

        {step === 'code' && (
          <form noValidate onSubmit={verify} className="space-y-5">
            {devCode && (
              <Alert tone="info">
                <span className="font-semibold">Development mode:</span> your code is{' '}
                <span className="font-mono font-bold tracking-widest">{devCode}</span>. This hint never appears in production.
              </Alert>
            )}
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setFieldError({});
              }}
              hasError={!!fieldError.code}
            />
            {fieldError.code && <p className="text-[11px] font-medium text-[#C0392B]">{fieldError.code}</p>}
            <SubmitButton id="reset-verify-code" loading={loading} disabled={code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify code'}
            </SubmitButton>
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setError(null);
                  setInfo(null);
                }}
                className="font-semibold text-[#5F6D61] hover:text-[#223B28]"
              >
                Change email
              </button>
              <button
                id="reset-resend-code"
                type="button"
                disabled={cooldown > 0 || loading}
                onClick={() => sendCode(true)}
                className="font-semibold text-[#2E4D34] hover:underline disabled:text-[#9AA59B] disabled:no-underline"
              >
                {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
              </button>
            </div>
          </form>
        )}

        {step === 'password' && (
          <form noValidate onSubmit={submitPassword} className="space-y-5">
            <PasswordField
              id="reset-new-password"
              label="New password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setFieldError((x) => ({ ...x, password: undefined }));
              }}
              error={fieldError.password}
            />
            <StrengthMeter password={password} />
            <PasswordField
              id="reset-confirm-password"
              label="Confirm new password"
              placeholder="Re-enter new password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setFieldError((x) => ({ ...x, confirm: undefined }));
              }}
              error={fieldError.confirm}
            />
            <SubmitButton id="reset-save-password" loading={loading}>
              {loading ? 'Updating password…' : 'Update password'}
            </SubmitButton>
          </form>
        )}

        <Link to={loginHref()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5F6D61] hover:text-[#2E4D34]">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
};

export default BuyerForgotPasswordPage;
