import React, { useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  Lock,
} from 'lucide-react';

import { createVendorRegisterSchema, type VendorRegisterFormData } from '../schemas/vendorRegisterSchema';
import { useVendorRegister } from '../hooks/useVendorRegister';
import { useCheckAvailability } from '../hooks/useCheckAvailability';
import { INDIAN_STATES } from '../../../data/indianStates';
import { useLivePlatformSettings } from '../../../utils/platformSync';
import { FormField } from '../../../components/ui/FormField';
import { PasswordInput } from '../../../components/ui/PasswordInput';
import { MultiCheckboxGroup, type CheckboxOption } from '../../../components/ui/MultiCheckboxGroup';
import { Button } from '../../../components/ui/Button';
import { categories as allCategories } from '../../../data/categories';
import { useAuth } from '../../../hooks/useAuth';
import { setAuthToken } from '../../../api/client';
import type { NormalizedApiError, CategoryId } from '../../../types/auth';

export const VendorRegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const { sellerRegistrationOpen } = useLivePlatformSettings();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [emailEarlyError, setEmailEarlyError] = useState<string | null>(null);
  const [mobileEarlyError, setMobileEarlyError] = useState<string | null>(null);

  const emailDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registerMutation = useVendorRegister();
  const checkAvailabilityMutation = useCheckAvailability();

  // Create localized schema based on current language
  const schema = useMemo(() => createVendorRegisterSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    resetField,
    formState: { errors },
  } = useForm<VendorRegisterFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      fullName: '',
      email: '',
      mobile: '',
      businessName: '',
      categories: [],
      wholesaleEnabled: false,
      state: '',
      city: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const categoryOptions: CheckboxOption[] = useMemo(
    () =>
      allCategories.map((cat) => ({
        value: cat.id,
        label: t(cat.i18nKey),
      })),
    [t]
  );

  const handleEmailBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    if (emailDebounceRef.current) clearTimeout(emailDebounceRef.current);
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
    if (!isValidEmail) return;

    emailDebounceRef.current = setTimeout(async () => {
      try {
        const res = await checkAvailabilityMutation.mutateAsync({ channel: 'email', value: val });
        if (!res.available) {
          setEmailEarlyError(t('validation.emailTaken'));
        } else {
          setEmailEarlyError(null);
        }
      } catch {
        // Do not block form if availability check fails
      }
    }, 250);
  };

  const handleMobileBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value.trim().replace(/\D/g, '');
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    const isValidMobile = /^[6-9]\d{9}$/.test(val);
    if (!isValidMobile) return;

    mobileDebounceRef.current = setTimeout(async () => {
      try {
        const res = await checkAvailabilityMutation.mutateAsync({ channel: 'mobile', value: val });
        if (!res.available) {
          setMobileEarlyError(t('validation.mobileTaken'));
        } else {
          setMobileEarlyError(null);
        }
      } catch {
        // Do not block form if availability check fails
      }
    }, 250);
  };

  const renderEmailError = (): React.ReactNode => {
    const err = errors.email?.message || emailEarlyError;
    if (!err) return undefined;
    if (typeof err === 'string' && (err.includes('already registered') || err.includes(t('validation.emailTaken')))) {
      return (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span>{t('validation.emailTaken')}</span>
          <Link
            to="/vendor/login"
            className="font-semibold underline hover:text-[#991B1B] text-[#DC2626] transition-colors"
          >
            {t('validation.loginInstead')}
          </Link>
        </span>
      );
    }
    return err;
  };

  const renderMobileError = (): React.ReactNode => {
    const err = errors.mobile?.message || mobileEarlyError;
    if (!err) return undefined;
    if (typeof err === 'string' && (err.includes('already registered') || err.includes(t('validation.mobileTaken')))) {
      return (
        <span className="inline-flex items-center gap-1.5 flex-wrap">
          <span>{t('validation.mobileTaken')}</span>
          <Link
            to="/vendor/login"
            className="font-semibold underline hover:text-[#991B1B] text-[#DC2626] transition-colors"
          >
            {t('validation.loginInstead')}
          </Link>
        </span>
      );
    }
    return err;
  };

  const onSubmit = (data: VendorRegisterFormData) => {
    setGeneralError(null);

    // Never keep sensitive credentials in persistent storage
    registerMutation.mutate(
      {
        full_name: data.fullName,
        email: data.email,
        mobile: data.mobile,
        business_name: data.businessName?.trim() || undefined,
        categories: data.categories as CategoryId[],
        wholesale_enabled: data.wholesaleEnabled,
        state: data.state,
        city: data.city,
        password: data.password,
        agree_terms: data.agreeTerms,
      },
      {
        onSuccess: (res) => {
          if (res.token) {
            setAuthToken(res.token);
          }
          if (res.user) {
            setUser(res.user);
          }
          navigate('/vendor/verify-otp', {
            replace: true,
            state: { devCode: (res as any).dev_code },
          });
        },
        onError: (err: NormalizedApiError) => {
          if (err.fieldErrors) {
            let hasMappedFieldError = false;

            if (err.fieldErrors.email && err.fieldErrors.email.length > 0) {
              setError('email', { type: 'server', message: err.fieldErrors.email[0] });
              resetField('password', { defaultValue: '' });
              resetField('confirmPassword', { defaultValue: '' });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.mobile && err.fieldErrors.mobile.length > 0) {
              setError('mobile', { type: 'server', message: err.fieldErrors.mobile[0] });
              resetField('password', { defaultValue: '' });
              resetField('confirmPassword', { defaultValue: '' });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.full_name && err.fieldErrors.full_name.length > 0) {
              setError('fullName', { type: 'server', message: err.fieldErrors.full_name[0] });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.business_name && err.fieldErrors.business_name.length > 0) {
              setError('businessName', { type: 'server', message: err.fieldErrors.business_name[0] });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.categories && err.fieldErrors.categories.length > 0) {
              setError('categories', { type: 'server', message: err.fieldErrors.categories[0] });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.state && err.fieldErrors.state.length > 0) {
              setError('state', { type: 'server', message: err.fieldErrors.state[0] });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.city && err.fieldErrors.city.length > 0) {
              setError('city', { type: 'server', message: err.fieldErrors.city[0] });
              hasMappedFieldError = true;
            }
            if (err.fieldErrors.password && err.fieldErrors.password.length > 0) {
              setError('password', { type: 'server', message: err.fieldErrors.password[0] });
              hasMappedFieldError = true;
            }

            if (!hasMappedFieldError) {
              setGeneralError(err.message || t('errors.fixErrors'));
            }
          } else {
            setGeneralError(err.message || t('errors.fixErrors'));
          }
        },
      }
    );
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
      {/* ========================================================================= */}
      {/* Left Column: Brand Story & Artisan Benefits Banner (Hidden on Mobile)     */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:col-span-5 flex-col gap-6 sticky top-28 bg-[#243F29] text-white p-8 sm:p-10 rounded-3xl shadow-xl border border-[#35523A] overflow-hidden relative">
        {/* Soft Background Accent Circles */}
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
            {t('banner.headline')}
          </h1>
          <p className="text-xs sm:text-sm text-[#C8D6C7] leading-relaxed">
            {t('banner.subheading')}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/15 my-1" />

        {/* 3 Benefit Points */}
        <div className="space-y-5">
          {/* Benefit 1 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('banner.benefit1_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('banner.benefit1_desc')}
              </p>
            </div>
          </div>

          {/* Benefit 2 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('banner.benefit2_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('banner.benefit2_desc')}
              </p>
            </div>
          </div>

          {/* Benefit 3 */}
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center flex-shrink-0 text-[#C4D3C2] mt-0.5">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                {t('banner.benefit3_title')}
              </h3>
              <p className="text-xs text-[#A3B8A5] mt-1 leading-relaxed">
                {t('banner.benefit3_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* Trust Endorsement */}
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3 text-xs text-[#A3B8A5]">
          <CheckCircle2 className="w-4 h-4 text-[#86EFAC] flex-shrink-0" />
          <span>Zero upfront listing fees • Direct UPI & NEFT bank settlements</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Right Column: Registration Form (Mobile & Desktop)                         */}
      {/* ========================================================================= */}
      <div className="w-full lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 shadow-lg border border-[#EAE5DB]">
        {/* Form Header */}
        <div className="mb-6 sm:mb-8 space-y-2">
          <div className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF1EA] text-[#2E4D34] text-[11px] font-semibold mb-2">
            <Sparkles className="w-3 h-3 text-[#2E4D34]" />
            <span>{t('auth.sellerRegistration')}</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28] tracking-tight">
            {t('form.title')}
          </h2>
          <p className="text-xs sm:text-sm text-[#637365]">
            {t('form.subtitle')}
          </p>
        </div>

        {/* General Error Banner */}
        {!sellerRegistrationOpen && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-[#FFF8F7] border border-[#FAC7C3] flex items-start gap-3 text-[#DC2626]"
          >
            <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold">Seller registrations are closed</p>
              <p className="mt-0.5">The marketplace is not accepting new seller applications right now. Please check back later.</p>
            </div>
          </div>
        )}

        {generalError && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-2xl bg-[#FFF8F7] border border-[#FAC7C3] flex items-start gap-3 text-[#DC2626] animate-in fade-in"
          >
            <AlertOctagon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">{t('errors.genericTitle')}</p>
              <p className="mt-0.5">{generalError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* 1. Full Name */}
          <FormField
            id="fullName"
            label={t('form.fullName')}
            required
            placeholder={t('form.fullName_placeholder')}
            error={errors.fullName?.message}
            {...register('fullName')}
          />

          {/* 2. Email & Mobile (2-columns on tablet/desktop) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <FormField
              id="email"
              type="email"
              label={t('form.email')}
              required
              placeholder={t('form.email_placeholder')}
              error={renderEmailError()}
              {...register('email')}
              onChange={(e) => {
                if (emailEarlyError) setEmailEarlyError(null);
                void register('email').onChange(e);
              }}
              onBlur={(e) => {
                void register('email').onBlur(e);
                handleEmailBlur(e);
              }}
            />

            <FormField
              id="mobile"
              type="tel"
              label={t('form.mobile')}
              required
              prefixText="+91"
              placeholder={t('form.mobile_placeholder')}
              error={renderMobileError()}
              {...register('mobile')}
              onChange={(e) => {
                if (mobileEarlyError) setMobileEarlyError(null);
                void register('mobile').onChange(e);
              }}
              onBlur={(e) => {
                void register('mobile').onBlur(e);
                handleMobileBlur(e);
              }}
            />
          </div>

          {/* 3. Business Name (Optional) */}
          <FormField
            id="businessName"
            label={t('form.businessName')}
            placeholder={t('form.businessName_placeholder')}
            error={errors.businessName?.message}
            {...register('businessName')}
          />

          {/* 4. What will you sell? Multi-select checkboxes */}
          <Controller
            control={control}
            name="categories"
            render={({ field }) => (
              <MultiCheckboxGroup
                id="categories"
                label={t('form.categoriesLabel')}
                hint={t('form.categoriesHint')}
                required
                options={categoryOptions}
                selectedValues={field.value}
                onChange={field.onChange}
                error={errors.categories?.message}
              />
            )}
          />

          {/* Wholesale Bulk Sales Option */}
          <div className="pt-0.5 pb-1">
            <label
              htmlFor="wholesaleEnabled"
              className="flex items-start gap-2.5 p-3 rounded-xl border border-[#EAE5DB] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] hover:border-[#2E4D34] transition-colors cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="wholesaleEnabled"
                {...register('wholesaleEnabled')}
                className="mt-0.5 w-4 h-4 rounded border-[#C4D3C2] text-[#2E4D34] focus:ring-[#2E4D34] accent-[#2E4D34] cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#223B28]">
                  {t('form.wholesale_label')}
                </span>
                <span className="text-[11px] text-[#637365] mt-0.5">
                  {t('form.wholesale_hint')}
                </span>
              </div>
            </label>
          </div>

          {/* 5. State and City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            {/* State Select */}
            <div className="w-full flex flex-col gap-1.5">
              <label
                htmlFor="state"
                className="text-xs font-semibold text-[#223B28] flex items-center justify-between"
              >
                <span>
                  {t('form.state')}
                  <span className="text-[#DC2626] ml-1">*</span>
                </span>
              </label>

              <select
                id="state"
                {...register('state')}
                aria-invalid={Boolean(errors.state)}
                className={`w-full py-2.5 px-3.5 text-xs text-[#1D251E] bg-white rounded-xl transition-all duration-200 border ${
                  errors.state
                    ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 bg-[#FFF8F7]'
                    : 'border-[#EAE5DB] hover:border-[#C4D3C2] focus:border-[#2E4D34] focus:ring-2 focus:ring-[#2E4D34]/20'
                } focus:outline-none`}
              >
                <option value="">{t('form.selectState')}</option>
                {INDIAN_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name} ({st.code})
                  </option>
                ))}
              </select>

              {errors.state && (
                <p role="alert" className="text-[11px] text-[#DC2626] font-medium pt-0.5">
                  {errors.state.message}
                </p>
              )}
            </div>

            {/* City */}
            <FormField
              id="city"
              label={t('form.city')}
              required
              placeholder={t('form.city_placeholder')}
              error={errors.city?.message}
              {...register('city')}
            />
          </div>

          {/* 6. Password with live strength indicator */}
          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <PasswordInput
                id="password"
                label={t('form.password')}
                required
                placeholder={t('form.password_placeholder')}
                showStrengthMeter={true}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.password?.message}
              />
            )}
          />

          {/* 7. Confirm Password */}
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field }) => (
              <PasswordInput
                id="confirmPassword"
                label={t('form.confirmPassword')}
                required
                placeholder={t('form.confirmPassword_placeholder')}
                showStrengthMeter={false}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          {/* 8. Terms and Privacy Agreement Checkbox */}
          <div className="pt-2">
            <label
              htmlFor="agreeTerms"
              className="flex items-start gap-2.5 text-xs text-[#223B28] cursor-pointer select-none"
            >
              <input
                type="checkbox"
                id="agreeTerms"
                {...register('agreeTerms')}
                aria-invalid={Boolean(errors.agreeTerms)}
                className="mt-0.5 w-4 h-4 rounded border-[#C4D3C2] text-[#2E4D34] focus:ring-[#2E4D34] accent-[#2E4D34] cursor-pointer"
              />
              <span className="leading-relaxed">
                {t('form.terms_prefix')}{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#2E4D34] hover:underline"
                >
                  {t('form.terms_link')}
                </Link>{' '}
                {t('form.terms_and')}{' '}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#2E4D34] hover:underline"
                >
                  {t('form.privacy_link')}
                </Link>
                <span className="text-[#DC2626] ml-1">*</span>
              </span>
            </label>

            {errors.agreeTerms && (
              <p role="alert" className="text-[11px] text-[#DC2626] font-medium pt-1.5 pl-6.5">
                {errors.agreeTerms.message}
              </p>
            )}
          </div>

          {/* 9. Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={registerMutation.isPending}
              disabled={!sellerRegistrationOpen}
              loadingText={t('form.submitting')}
              className="w-full shadow-md hover:shadow-lg"
              leftIcon={<Lock className="w-4 h-4" />}
            >
              {t('form.submit')}
            </Button>
          </div>

          {/* 10. Already have an account? Login */}
          <div className="text-center pt-3 border-t border-[#F4EFE6] text-xs text-[#637365]">
            <span>{t('form.hasAccount')} </span>
            <Link
              to="/vendor/login"
              className="font-semibold text-[#2E4D34] hover:underline focus:outline-none focus:ring-1 focus:ring-[#2E4D34] rounded"
            >
              {t('form.loginLink')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
export default VendorRegisterPage;
