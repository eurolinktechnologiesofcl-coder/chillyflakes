import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  CreditCard,
  PackageOpen,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Lock,
} from 'lucide-react';

import { createVendorLoginSchema, type VendorLoginFormData } from '../schemas/vendorLoginSchema';
import { useVendorLogin } from '../hooks/useVendorLogin';
import { useAuth } from '../../../hooks/useAuth';
import { FormField } from '../../../components/ui/FormField';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { Button } from '../../../components/ui/Button';
import { setAuthToken } from '../../../api/client';
import type { NormalizedApiError, VendorStatus } from '../../../types/auth';

const DemoLoginHelper = import.meta.env.VITE_DEMO_MODE === 'true'
  ? React.lazy(() => import('../components/DemoLoginHelper'))
  : null;

function getRedirectForStatus(status: VendorStatus, from?: string): string {
  switch (status) {
    case 'pending_verification':
      return '/vendor/verify-otp';
    case 'onboarding_incomplete':
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

export const VendorLoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading, setUser } = useAuth();
  const [generalError, setGeneralError] = useState<string | null>(null);

  const loginMutation = useVendorLogin();

  // Redirect if vendor is already authenticated
  useEffect(() => {
    if (user && !isAuthLoading) {
      const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
      navigate(getRedirectForStatus(user.vendor_status, fromPath), { replace: true });
    }
  }, [user, isAuthLoading, navigate, location.state]);

  const schema = useMemo(() => createVendorLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    resetField,
    formState: { errors },
  } = useForm<VendorLoginFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const clearBannerOnError = () => {
    if (generalError) {
      setGeneralError(null);
    }
  };

  const onSubmit = (data: VendorLoginFormData) => {
    setGeneralError(null);

    loginMutation.mutate(
      {
        identifier: data.identifier.trim(),
        password: data.password,
      },
      {
        onSuccess: (res) => {
          if (res.token) {
            setAuthToken(res.token);
          }
          // Set in-memory session
          setUser(res.user);

          const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
          navigate(getRedirectForStatus(res.vendor_status, fromPath), { replace: true });
        },
        onError: (err: NormalizedApiError) => {
          // Clear ONLY password field, keep identifier intact
          resetField('password', { defaultValue: '' });

          if (err.code === 'account_locked') {
            const mins = err.retry_after_seconds ? Math.ceil(err.retry_after_seconds / 60) : 10;
            setGeneralError(t('login.errorAccountLocked', { minutes: mins }));
          } else if (err.code === 'invalid_credentials' || err.code === 'http_401') {
            setGeneralError(t('login.errorInvalidCredentials'));
          } else {
            setGeneralError(err.message || t('login.errorGeneric'));
          }
        },
      }
    );
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* ========================================================================= */}
      {/* Left Column: Brand Showcase Panel (Desktop Only)                          */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-5 flex-col gap-6 sticky top-28 bg-[#243F29] text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-[#35523A] overflow-hidden relative">
        {/* Soft Background Accent Glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#2E4D34]/40 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-[#E2C8B8]/10 blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF7F2]/10 backdrop-blur-xs border border-white/10 text-xs font-medium text-[#C4D3C2] w-fit">
          <Sparkles className="w-3.5 h-3.5 text-[#E2C8B8]" />
          <span>{t('banner.trustBadge')}</span>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="font-serif text-3xl xl:text-4xl font-bold leading-tight tracking-tight text-[#FAF7F2]">
            {t('login.welcomeHeadline')}
          </h1>
          <p className="text-xs sm:text-sm text-[#C8D6C7] leading-relaxed">
            {t('login.welcomeSubheading')}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/15 my-1" />

        {/* 3 Key Benefit Highlights */}
        <div className="space-y-5">
          {/* Benefit 1 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('login.benefit1_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('login.benefit1_desc')}
              </p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('login.benefit2_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('login.benefit2_desc')}
              </p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <PackageOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('login.benefit3_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('login.benefit3_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Security Reassurance */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-[#A3B8A5]">
          <CheckCircle2 className="w-4 h-4 text-[#86EFAC] flex-shrink-0" />
          <span>Encrypted 256-bit secure sessions • Direct bank settlements</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Right Column: Vendor Login Form Card                                      */}
      {/* ========================================================================= */}
      <div className="w-full lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-[#EAE5DB]">
        {/* Header */}
        <div className="mb-6 sm:mb-8 space-y-2">
          <div className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF1EA] text-[#2E4D34] text-[11px] font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-[#2E4D34]" />
            <span>{t('login.title')}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28] tracking-tight">
            {t('login.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#637365]">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Error Banner */}
        {generalError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-[#FFF8F7] border border-[#FAC7C3] flex items-start gap-3 text-[#DC2626] animate-in fade-in"
          >
            <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-medium">
              {generalError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* 1. Email or Mobile Identifier */}
          <FormField
            id="identifier"
            label={t('login.identifierLabel')}
            required
            autoComplete="username"
            placeholder={t('login.identifierPlaceholder')}
            error={errors.identifier?.message}
            {...register('identifier', {
              onChange: clearBannerOnError,
            })}
          />

          {/* 2. Password without strength meter */}
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                id="password"
                label={t('login.passwordLabel')}
                required
                autoComplete="current-password"
                placeholder={t('login.passwordPlaceholder')}
                showStrengthMeter={false}
                value={field.value}
                onChange={(e) => {
                  field.onChange(e);
                  clearBannerOnError();
                }}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.password?.message}
              />
            )}
          />

          {/* Forgot Password Link */}
          <div className="flex items-center justify-end -mt-1">
            <Link
              to="/vendor/forgot-password"
              className="text-xs font-medium text-[#2E4D34] hover:underline focus:outline-none focus:ring-1 focus:ring-[#2E4D34] rounded"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loginMutation.isPending}
              loadingText={t('login.submitting')}
              className="w-full shadow-md hover:shadow-lg"
              leftIcon={<Lock className="w-4 h-4" />}
            >
              {t('login.submit')}
            </Button>
          </div>

          {/* New seller? Create an account */}
          <div className="text-center pt-3 border-t border-[#F4EFE6] text-xs text-[#637365]">
            <span>{t('login.newSeller')} </span>
            <Link
              to="/vendor/register"
              className="font-semibold text-[#2E4D34] hover:underline focus:outline-none focus:ring-1 focus:ring-[#2E4D34] rounded"
            >
              {t('login.createAccount')}
            </Link>
          </div>
        </form>

        {import.meta.env.VITE_DEMO_MODE === 'true' && DemoLoginHelper && (
          <React.Suspense fallback={null}>
            <DemoLoginHelper
              onFill={(identifier, password) => {
                setValue('identifier', identifier, { shouldValidate: true });
                setValue('password', password, { shouldValidate: true });
              }}
            />
          </React.Suspense>
        )}
      </div>
    </div>
  );
};
export default VendorLoginPage;
