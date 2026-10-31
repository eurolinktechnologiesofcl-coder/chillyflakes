import React, { useId, useRef, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Info, Loader2, ShieldCheck, Truck, RotateCcw, Leaf, ShoppingBag } from 'lucide-react';
import { passwordStrength } from './authUtils';

/* -------------------------------------------------------------------------- */
/* Layout shell: brand panel (desktop) + form card                            */
/* -------------------------------------------------------------------------- */

interface AuthShellProps {
  title: string;
  subtitle?: React.ReactNode;
  bagCount?: number;
  children: React.ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, bagCount = 0, children }) => (
  <div className="w-full max-w-[1040px] grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
    {/* Brand panel */}
    <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#243F29] text-white p-9 rounded-3xl shadow-xl border border-[#35523A] relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#2E4D34]/50 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-[#E2C8B8]/10 blur-3xl pointer-events-none" />

      <div className="relative space-y-4">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-[#C4D3C2]">
          <Leaf className="w-3.5 h-3.5 text-[#E2C8B8]" />
          Handmade • Natural • Direct from artisans
        </span>
        <h2 className="font-serif text-3xl font-bold leading-tight text-[#FAF7F2]">
          Your ChillyFlakes account
        </h2>
        <p className="text-sm text-[#C8D6C7] leading-relaxed">
          One secure account for faster checkout, order tracking, saved addresses and easy returns.
        </p>
      </div>

      <ul className="relative space-y-4 my-8">
        {[
          { icon: Truck, t: 'Track every order', d: 'Live status from packing to doorstep.' },
          { icon: RotateCcw, t: 'Hassle-free returns', d: 'Request returns right from your account.' },
          { icon: ShieldCheck, t: 'Secure by design', d: 'Encrypted passwords & protected sessions.' },
        ].map(({ icon: Icon, t, d }) => (
          <li key={t} className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[#C4D3C2] flex-shrink-0">
              <Icon className="w-4 h-4" />
            </span>
            <span>
              <span className="block text-sm font-semibold">{t}</span>
              <span className="block text-xs text-[#A3B8A5] mt-0.5">{d}</span>
            </span>
          </li>
        ))}
      </ul>

      {bagCount > 0 ? (
        <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 p-4">
          <ShoppingBag className="w-5 h-5 text-[#E2C8B8]" />
          <p className="text-xs text-[#E8ECE6]">
            <span className="font-semibold">{bagCount} item{bagCount > 1 ? 's' : ''}</span> saved in your bag — they'll be waiting after you sign in.
          </p>
        </div>
      ) : (
        <p className="relative text-[11px] text-[#A3B8A5]">Trusted by conscious shoppers across India.</p>
      )}
    </aside>

    {/* Form card */}
    <section className="lg:col-span-7 bg-white rounded-3xl border border-[#EAE5DB] shadow-[0_10px_40px_-20px_rgba(34,59,40,0.25)] p-6 sm:p-10">
      <header className="mb-7">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28] tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-[#5F6D61] leading-relaxed">{subtitle}</p>}
      </header>
      {children}
    </section>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Form primitives                                                            */
/* -------------------------------------------------------------------------- */

const inputBase =
  'w-full h-12 rounded-xl border bg-[#FCFBF8] px-4 text-sm text-[#223B28] placeholder:text-[#9AA59B] outline-none transition-all focus:bg-white focus:ring-4';
const inputOk = 'border-[#E3DDD1] focus:border-[#2E4D34] focus:ring-[#2E4D34]/10';
const inputErr = 'border-[#D9534F] focus:border-[#D9534F] focus:ring-[#D9534F]/10';

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  prefix?: string;
  labelAside?: React.ReactNode;
}

export const TextField = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, prefix, labelAside, id, className = '', ...rest }, ref) => {
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-xs font-semibold text-[#223B28]">
            {label}
          </label>
          {labelAside}
        </div>
        <div className="relative">
          {prefix && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#5F6D61] pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-err` : undefined}
            className={`${inputBase} ${error ? inputErr : inputOk} ${prefix ? 'pl-14' : ''} ${className}`}
            {...rest}
          />
        </div>
        {error ? (
          <p id={`${inputId}-err`} className="text-[11px] font-medium text-[#C0392B] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        ) : hint ? (
          <p className="text-[11px] text-[#7E8F80]">{hint}</p>
        ) : null}
      </div>
    );
  }
);
TextField.displayName = 'TextField';

export const PasswordField = React.forwardRef<HTMLInputElement, Omit<FieldProps, 'type' | 'prefix'>>(
  ({ label, error, hint, labelAside, id, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    const autoId = useId();
    const inputId = id || autoId;
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor={inputId} className="text-xs font-semibold text-[#223B28]">
            {label}
          </label>
          {labelAside}
        </div>
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={show ? 'text' : 'password'}
            aria-invalid={!!error}
            className={`${inputBase} ${error ? inputErr : inputOk} pr-12`}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-lg flex items-center justify-center text-[#7E8F80] hover:text-[#2E4D34] hover:bg-[#F2F5F0] transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error ? (
          <p className="text-[11px] font-medium text-[#C0392B] flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> {error}
          </p>
        ) : hint ? (
          <p className="text-[11px] text-[#7E8F80]">{hint}</p>
        ) : null}
      </div>
    );
  }
);
PasswordField.displayName = 'PasswordField';

export const StrengthMeter: React.FC<{ password: string }> = ({ password }) => {
  const { score, label, checks } = passwordStrength(password);
  if (!password) return null;
  const colors = ['bg-[#E3DDD1]', 'bg-[#D9534F]', 'bg-[#E6A23C]', 'bg-[#8DB580]', 'bg-[#2E4D34]'];
  return (
    <div className="space-y-2 -mt-1">
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= score ? colors[score] : 'bg-[#EEEAE2]'}`} />
        ))}
        <span className="text-[11px] font-semibold text-[#5F6D61] w-12 text-right">{label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li key={c.label} className={`text-[11px] flex items-center gap-1 ${c.ok ? 'text-[#2E4D34]' : 'text-[#9AA59B]'}`}>
            <CheckCircle2 className="w-3 h-3" /> {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Alert: React.FC<{ tone: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({ tone, children }) => {
  const styles = {
    error: 'bg-[#FDF1F0] border-[#F3C9C5] text-[#9B2C22]',
    success: 'bg-[#EEF6EE] border-[#CDE1CB] text-[#2E4D34]',
    info: 'bg-[#F6F3EC] border-[#E7DFCF] text-[#5B4B2E]',
  }[tone];
  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-xs leading-relaxed ${styles}`}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-px" />
      <div>{children}</div>
    </div>
  );
};

export const SubmitButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }> = ({
  loading,
  children,
  disabled,
  className = '',
  ...rest
}) => (
  <button
    type="submit"
    disabled={disabled || loading}
    className={`w-full h-12 rounded-xl bg-[#2E4D34] hover:bg-[#223B28] text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${className}`}
    {...rest}
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

export const FullPageSpinner: React.FC = () => (
  <div className="min-h-[60vh] w-full flex items-center justify-center">
    <Loader2 className="w-7 h-7 text-[#2E4D34] animate-spin" aria-label="Loading" />
  </div>
);

/* 6-box OTP input with paste & keyboard navigation */
export const OtpInput: React.FC<{ value: string; onChange: (v: string) => void; hasError?: boolean; idPrefix?: string }> = ({ value, onChange, hasError, idPrefix = 'otp' }) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  const setAt = (i: number, d: string) => {
    const arr = digits.slice();
    arr[i] = d;
    onChange(arr.join('').slice(0, 6));
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={(e) => {
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasted) {
        e.preventDefault();
        onChange(pasted);
        refs.current[Math.min(pasted.length, 5)]?.focus();
      }
    }}>
      {digits.map((d, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            setAt(i, v);
            if (v && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-lg font-semibold rounded-xl border bg-[#FCFBF8] text-[#223B28] outline-none transition-all focus:bg-white focus:ring-4 ${
            hasError ? 'border-[#D9534F] focus:ring-[#D9534F]/10' : 'border-[#E3DDD1] focus:border-[#2E4D34] focus:ring-[#2E4D34]/10'
          }`}
        />
      ))}
    </div>
  );
};
