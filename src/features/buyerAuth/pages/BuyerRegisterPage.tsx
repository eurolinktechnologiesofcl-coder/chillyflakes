import React, { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useBuyerAuth } from '../../../context/BuyerAuthContextDef';
import { toApiError } from '../../../api/buyerAuthApi';
import { AuthShell, TextField, PasswordField, StrengthMeter, Alert, SubmitButton, FullPageSpinner } from '../AuthUI';
import { safeRedirect, getBagCount, EMAIL_RE, PHONE_RE, normalizePhone, isPasswordValid } from '../authUtils';

type Fields = 'name' | 'email' | 'phone' | 'password' | 'confirm' | 'terms';

export const BuyerRegisterPage: React.FC = () => {
  const { register, status, isAuthenticated } = useBuyerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = safeRedirect(params.get('redirect'), '/');
  const fromCheckout = redirect.startsWith('/checkout');
  const bagCount = useMemo(getBagCount, []);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Fields, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'loading') return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to={redirect} replace />;

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = key === 'phone' ? e.target.value.replace(/[^\d]/g, '').slice(0, 10) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((x) => ({ ...x, [key]: undefined }));
  };

  const validate = () => {
    const e: Partial<Record<Fields, string>> = {};
    if (form.name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address.';
    if (!PHONE_RE.test(normalizePhone(form.phone))) e.phone = 'Enter a valid 10-digit Indian mobile number.';
    if (!isPasswordValid(form.password)) e.password = 'Use 8+ characters with at least one letter and one number.';
    if (!form.confirm) e.confirm = 'Please confirm your password.';
    else if (form.confirm !== form.password) e.confirm = 'Passwords do not match.';
    if (!terms) e.terms = 'Please accept the Terms & Privacy Policy to continue.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const challenge = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: normalizePhone(form.phone),
        password: form.password,
      });
      const p = new URLSearchParams({ email: challenge.email });
      if (redirect !== '/') p.set('redirect', redirect);
      navigate(`/verify-email?${p.toString()}`, { replace: true, state: challenge });
    } catch (err) {
      const e = toApiError(err);
      if (e.fieldErrors) {
        const mapped: Partial<Record<Fields, string>> = {};
        Object.entries(e.fieldErrors).forEach(([k, v]) => {
          if (['name', 'email', 'phone', 'password'].includes(k)) mapped[k as Fields] = v[0];
        });
        setErrors(mapped);
      }
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loginHref = `/login${redirect !== '/' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`;

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          {fromCheckout ? 'Just a few details and you’re through to checkout. ' : 'Join ChillyFlakes in under a minute. '}
          Already have an account?{' '}
          <Link to={loginHref} className="font-semibold text-[#2E4D34] hover:underline">
            Sign in
          </Link>
        </>
      }
      bagCount={bagCount}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {formError && <Alert tone="error">{formError}</Alert>}

        <TextField
          id="register-name"
          label="Full name"
          placeholder="e.g. Priya Sharma"
          autoComplete="name"
          autoFocus
          value={form.name}
          onChange={update('name')}
          error={errors.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <TextField
            id="register-email"
            type="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
            hint="Order updates & receipts are sent here."
          />
          <TextField
            id="register-phone"
            type="tel"
            inputMode="numeric"
            label="Mobile number"
            prefix="+91"
            placeholder="98XXXXXXXX"
            autoComplete="tel-national"
            value={form.phone}
            onChange={update('phone')}
            error={errors.phone}
            hint="Used for delivery coordination."
          />
        </div>

        <PasswordField
          id="register-password"
          label="Create password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <StrengthMeter password={form.password} />

        <PasswordField
          id="register-confirm"
          label="Confirm password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />

        <div className="space-y-1">
          <label className="flex items-start gap-2.5 text-xs text-[#5F6D61] cursor-pointer select-none">
            <input
              id="register-terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                setErrors((x) => ({ ...x, terms: undefined }));
              }}
              className="mt-0.5 w-4 h-4 rounded border-[#CFC8BA] accent-[#2E4D34]"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="font-semibold text-[#2E4D34] underline">Terms of Service</Link> and{' '}
              <Link to="/privacy" target="_blank" className="font-semibold text-[#2E4D34] underline">Privacy Policy</Link>.
            </span>
          </label>
          {errors.terms && <p className="text-[11px] font-medium text-[#C0392B] pl-6">{errors.terms}</p>}
        </div>

        <SubmitButton id="register-submit" loading={submitting}>
          {submitting ? 'Creating account…' : fromCheckout ? 'Create account & continue' : 'Create account'}
        </SubmitButton>

        <p className="text-center text-[11px] text-[#7E8F80]">
          Want to sell on ChillyFlakes?{' '}
          <Link to="/vendor/register" className="font-semibold text-[#2E4D34] hover:underline">Register as a seller</Link>
        </p>
      </form>
    </AuthShell>
  );
};

export default BuyerRegisterPage;
