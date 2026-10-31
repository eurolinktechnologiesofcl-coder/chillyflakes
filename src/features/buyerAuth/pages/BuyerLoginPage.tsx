import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Store, ArrowRight, LockKeyhole } from 'lucide-react';
import { useBuyerAuth } from '../../../context/BuyerAuthContextDef';
import { toApiError } from '../../../api/buyerAuthApi';
import { AuthShell, TextField, PasswordField, Alert, SubmitButton, FullPageSpinner } from '../AuthUI';
import { safeRedirect, getBagCount, EMAIL_RE, PHONE_RE, normalizePhone } from '../authUtils';

type AccountType = 'shopper' | 'seller';

export const BuyerLoginPage: React.FC = () => {
  const { login, status, isAuthenticated } = useBuyerAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'), '/');
  const accountType: AccountType = params.get('type') === 'seller' ? 'seller' : 'shopper';
  const fromCheckout = redirect.startsWith('/checkout');
  const bagCount = useMemo(getBagCount, []);

  const [identifier, setIdentifier] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const justReset = params.get('reset') === '1';

  if (status === 'loading') return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={redirect} replace />;

  const setType = (t: AccountType) => {
    const next = new URLSearchParams(params);
    if (t === 'seller') next.set('type', 'seller');
    else next.delete('type');
    setParams(next, { replace: true });
  };

  const validate = () => {
    const e: typeof errors = {};
    const id = identifier.trim();
    if (!id) e.identifier = 'Enter your email or mobile number.';
    else if (id.includes('@') ? !EMAIL_RE.test(id) : !PHONE_RE.test(normalizePhone(id)))
      e.identifier = id.includes('@') ? 'Enter a valid email address.' : 'Enter a valid 10-digit mobile number.';
    if (!password) e.password = 'Enter your password.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      await login(identifier.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err) {
      const e = toApiError(err);
      setPassword('');
      if (e.code === 'email_not_verified') {
        const d = e.details || {};
        const email = String(d.email || identifier.trim().toLowerCase());
        const p = new URLSearchParams({ email });
        if (redirect !== '/') p.set('redirect', redirect);
        navigate(`/verify-email?${p.toString()}`, {
          state: {
            email,
            message: e.message,
            resend_after_seconds: Number(d.resend_after_seconds) || 30,
            expires_in_seconds: Number(d.expires_in_seconds) || 600,
            dev_code: typeof d.dev_code === 'string' ? d.dev_code : undefined,
          },
        });
        return;
      }
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const qs = (extra: Record<string, string> = {}) => {
    const p = new URLSearchParams();
    if (redirect !== '/') p.set('redirect', redirect);
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return (
    <AuthShell
      title={accountType === 'seller' ? 'Seller sign in' : 'Welcome back'}
      subtitle={
        accountType === 'seller'
          ? 'Artisans and brands manage their store from the ChillyFlakes Seller Hub.'
          : fromCheckout
          ? 'Sign in to continue to secure checkout.'
          : 'Sign in to your ChillyFlakes account.'
      }
      bagCount={bagCount}
    >
      {/* Account type switch */}
      <div role="tablist" aria-label="Account type" className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[#F4F1EA] border border-[#ECE7DD] mb-7">
        {([
          { key: 'shopper', label: 'Shopper', icon: ShoppingBag },
          { key: 'seller', label: 'Seller / Vendor', icon: Store },
        ] as const).map(({ key, label, icon: Icon }) => {
          const active = accountType === key;
          return (
            <button
              key={key}
              id={`login-tab-${key}`}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setType(key)}
              className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                active ? 'bg-white text-[#223B28] shadow-sm border border-[#E3DDD1]' : 'text-[#5F6D61] hover:text-[#223B28]'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          );
        })}
      </div>

      {accountType === 'shopper' ? (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {justReset && <Alert tone="success">Password updated. Sign in with your new password.</Alert>}
          {formError && <Alert tone="error">{formError}</Alert>}

          <TextField
            id="login-identifier"
            label="Email or mobile number"
            placeholder="you@example.com or 98XXXXXXXX"
            autoComplete="username"
            autoFocus
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setErrors((x) => ({ ...x, identifier: undefined }));
            }}
            error={errors.identifier}
          />

          <PasswordField
            id="login-password"
            label="Password"
            placeholder="Enter your password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((x) => ({ ...x, password: undefined }));
            }}
            error={errors.password}
            labelAside={
              <Link
                id="login-forgot-link"
                to={`/forgot-password${qs({ email: identifier.includes('@') ? identifier.trim() : '' })}`}
                className="text-xs font-semibold text-[#2E4D34] hover:underline"
              >
                Forgot password?
              </Link>
            }
          />

          <SubmitButton id="login-submit" loading={submitting}>
            {submitting ? 'Signing in…' : fromCheckout ? 'Sign in & continue to checkout' : 'Sign in'}
          </SubmitButton>

          <div className="relative py-1">
            <div className="h-px bg-[#EEEAE2]" />
            <span className="absolute left-1/2 -translate-x-1/2 -top-0.5 bg-white px-3 text-[11px] text-[#9AA59B]">New to ChillyFlakes?</span>
          </div>

          <Link
            id="login-create-account"
            to={`/register${qs()}`}
            className="w-full h-12 rounded-xl border border-[#2E4D34] text-[#2E4D34] hover:bg-[#F2F5F0] text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            Create your account <ArrowRight className="w-4 h-4" />
          </Link>

          <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#7E8F80] pt-1">
            <LockKeyhole className="w-3.5 h-3.5" /> By continuing you agree to our{' '}
            <Link to="/terms" className="underline hover:text-[#2E4D34]">Terms</Link> &{' '}
            <Link to="/privacy" className="underline hover:text-[#2E4D34]">Privacy Policy</Link>.
          </p>
        </form>
      ) : (
        <div className="space-y-4">
          <Link
            id="seller-signin-link"
            to="/vendor/login"
            className="group flex items-center gap-4 p-5 rounded-2xl border border-[#E3DDD1] hover:border-[#2E4D34] hover:bg-[#FAFBF8] transition-all"
          >
            <span className="w-11 h-11 rounded-xl bg-[#EAF1EA] text-[#2E4D34] flex items-center justify-center">
              <Store className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[#223B28]">Sign in to Seller Hub</span>
              <span className="block text-xs text-[#5F6D61] mt-0.5">Manage products, orders and payouts.</span>
            </span>
            <ArrowRight className="w-4 h-4 text-[#7E8F80] group-hover:translate-x-0.5 group-hover:text-[#2E4D34] transition-all" />
          </Link>

          <Link
            id="seller-register-link"
            to="/vendor/register"
            className="group flex items-center gap-4 p-5 rounded-2xl border border-[#E3DDD1] hover:border-[#2E4D34] hover:bg-[#FAFBF8] transition-all"
          >
            <span className="w-11 h-11 rounded-xl bg-[#F6EFE6] text-[#8A5A2B] flex items-center justify-center">
              <ArrowRight className="w-5 h-5" />
            </span>
            <span className="flex-1">
              <span className="block text-sm font-semibold text-[#223B28]">Become a Seller</span>
              <span className="block text-xs text-[#5F6D61] mt-0.5">Register your brand — verification takes 2–3 business days.</span>
            </span>
            <ArrowRight className="w-4 h-4 text-[#7E8F80] group-hover:translate-x-0.5 group-hover:text-[#2E4D34] transition-all" />
          </Link>

          <Alert tone="info">
            Seller accounts are separate from shopper accounts. To buy products, switch to{' '}
            <button type="button" onClick={() => setType('shopper')} className="font-semibold underline">
              Shopper
            </button>
            .
          </Alert>
        </div>
      )}
    </AuthShell>
  );
};

export default BuyerLoginPage;
