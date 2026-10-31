import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Store,
  MapPin,
  ShieldCheck,
  Building2,
  FileCheck2,
  ArrowRight,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Edit3,
  Lock,
  Building,
  User,
  LogOut,
  Eye,
  X,
  FileText,
} from 'lucide-react';

import { getDocumentPreviewLink, getVendorStatus } from '../../../api/vendorOnboarding';

import { useAuth } from '../../../hooks/useAuth';
import { Button } from '../../../components/ui/Button';
import { FormField } from '../../../components/ui/FormField';
import { DocumentUploader } from '../../../components/vendor/DocumentUploader';
import {
  useOnboardingDraft,
  useSaveOnboardingStep,
  useSubmitOnboarding,
  useIfscLookup,
  useSlugAvailability,
} from '../hooks/useVendorOnboarding';
import {
  createStep1StoreDetailsSchema,
  createStep2PickupAddressSchema,
  createStep3VerificationSchema,
  createStep4BankDetailsSchema,
  createStep5ReviewSchema,
} from '../schemas/onboardingSchemas';
import type {
  StoreDetailsStepData,
  PickupAddressStepData,
  VerificationStepData,
  BankDetailsStepData,
  UploadedDocument,
  SellerType,
  IdentityProofType,
  BankAccountType,
} from '../../../types/onboarding';

const TOTAL_STEPS = 5;

const AVAILABLE_LANGUAGES = [
  'English',
  'Malayalam',
  'Tamil',
  'Hindi',
  'Kannada',
  'Telugu',
  'Bengali',
  'Marathi',
];

export const VendorOnboardingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, refetchUser } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const { data: draft, isLoading: isDraftLoading } = useOnboardingDraft();
  const saveStepMutation = useSaveOnboardingStep();
  const submitMutation = useSubmitOnboarding();
  const ifscMutation = useIfscLookup();
  const slugMutation = useSlugAvailability();

  // Current active step (1 to 5)
  const initialStep = Math.min(
    Math.max(parseInt(searchParams.get('step') || '1', 10), 1),
    TOTAL_STEPS
  );
  const [currentStep, setCurrentStep] = useState<number>(initialStep);

  // General banners & feedback
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [detailSection, setDetailSection] = useState<1 | 2 | 3 | 4 | null>(null);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [reviewerNote, setReviewerNote] = useState<string | null>(null);

  // =========================================================================
  // STEP 1 STATE: Store Details
  // =========================================================================
  const [storeName, setStoreName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [sellerStory, setSellerStory] = useState('');
  const [logoDoc, setLogoDoc] = useState<UploadedDocument | null>(null);
  const [bannerDoc, setBannerDoc] = useState<UploadedDocument | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['English']);
  const [sellerType, setSellerType] = useState<SellerType>('individual_artisan');
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [website, setWebsite] = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // =========================================================================
  // STEP 2 STATE: Pickup Address
  // =========================================================================
  const [pickupContact, setPickupContact] = useState('');
  const [pickupLine1, setPickupLine1] = useState('');
  const [pickupLine2, setPickupLine2] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPincode, setPickupPincode] = useState('');
  const [pickupMobile, setPickupMobile] = useState('');
  const [sameAsBusiness, setSameAsBusiness] = useState(true);

  // Secondary Business Address (if different)
  const [bizContact, setBizContact] = useState('');
  const [bizLine1, setBizLine1] = useState('');
  const [bizLine2, setBizLine2] = useState('');
  const [bizCity, setBizCity] = useState('');
  const [bizState, setBizState] = useState('');
  const [bizPincode, setBizPincode] = useState('');
  const [bizMobile, setBizMobile] = useState('');

  // =========================================================================
  // STEP 3 STATE: Verification (KYC)
  // =========================================================================
  const [panNumber, setPanNumber] = useState('');
  const [panDoc, setPanDoc] = useState<UploadedDocument | null>(null);
  const [gstin, setGstin] = useState('');
  const [idType, setIdType] = useState<IdentityProofType>('aadhaar_masked');
  const [idDoc, setIdDoc] = useState<UploadedDocument | null>(null);
  const [addressDoc, setAddressDoc] = useState<UploadedDocument | null>(null);
  const [artisanCardDoc, setArtisanCardDoc] = useState<UploadedDocument | null>(null);

  // =========================================================================
  // STEP 4 STATE: Bank Details
  // =========================================================================
  const [accHolderName, setAccHolderName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [confirmAccNumber, setConfirmAccNumber] = useState('');
  const [existingMaskedAcc, setExistingMaskedAcc] = useState<string | null>(null);
  const [isEditingAccNumber, setIsEditingAccNumber] = useState(false);
  const [ifscCode, setIfscCode] = useState('');
  const [accType, setAccType] = useState<BankAccountType>('savings');
  const [chequeDoc, setChequeDoc] = useState<UploadedDocument | null>(null);
  const [bankInfo, setBankInfo] = useState<{ bank: string; branch: string } | null>(null);

  // =========================================================================
  // STEP 5 STATE: Review & Submit
  // =========================================================================
  const [acceptedAgreement, setAcceptedAgreement] = useState(false);

  // Validation errors map for the current step
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Flagged sections from resubmission requests
  const flaggedSections = draft?.flagged_sections || [];

  // Populate draft data when first loaded (only once — later saves must not clobber in-progress edits)
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!draft || hydratedRef.current) return;
    hydratedRef.current = true;

    if (draft.step_1) {
      setStoreName(draft.step_1.store_name || user?.store_name || '');
      setStoreSlug(draft.step_1.store_slug || '');
      setShortDescription(draft.step_1.short_description || '');
      setSellerStory(draft.step_1.seller_story || '');
      if (draft.step_1.logo_document) setLogoDoc(draft.step_1.logo_document);
      if (draft.step_1.banner_document) setBannerDoc(draft.step_1.banner_document);
      if (draft.step_1.languages_spoken?.length) setSelectedLanguages(draft.step_1.languages_spoken);
      if (draft.step_1.seller_type) setSellerType(draft.step_1.seller_type);
      if (draft.step_1.social_links) {
        setInstagram(draft.step_1.social_links.instagram || '');
        setFacebook(draft.step_1.social_links.facebook || '');
        setWebsite(draft.step_1.social_links.website || '');
      }
    } else if (user?.store_name && !storeName) {
      setStoreName(user.store_name);
    }

    if (draft.step_2) {
      const p = draft.step_2.pickup_address;
      if (p) {
        setPickupContact(p.contact_person || '');
        setPickupLine1(p.address_line1 || '');
        setPickupLine2(p.address_line2 || '');
        setPickupCity(p.city || '');
        setPickupState(p.state || '');
        setPickupPincode(p.pincode || '');
        setPickupMobile(p.courier_mobile || '');
      }
      setSameAsBusiness(draft.step_2.same_as_business_address ?? true);
      const b = draft.step_2.business_address;
      if (b) {
        setBizContact(b.contact_person || '');
        setBizLine1(b.address_line1 || '');
        setBizLine2(b.address_line2 || '');
        setBizCity(b.city || '');
        setBizState(b.state || '');
        setBizPincode(b.pincode || '');
        setBizMobile(b.courier_mobile || '');
      }
    }

    if (draft.step_3) {
      setPanNumber(draft.step_3.pan_number || '');
      if (draft.step_3.pan_document) setPanDoc(draft.step_3.pan_document);
      setGstin(draft.step_3.gstin || '');
      if (draft.step_3.identity_proof_type) setIdType(draft.step_3.identity_proof_type);
      if (draft.step_3.identity_document) setIdDoc(draft.step_3.identity_document);
      if (draft.step_3.address_document) setAddressDoc(draft.step_3.address_document);
      if (draft.step_3.artisan_card_document) setArtisanCardDoc(draft.step_3.artisan_card_document);
    }

    if (draft.step_4) {
      setAccHolderName(draft.step_4.account_holder_name || '');
      if (draft.step_4.account_number_masked) {
        setExistingMaskedAcc(draft.step_4.account_number_masked);
      }
      setIfscCode(draft.step_4.ifsc_code || '');
      if (draft.step_4.bank_name) {
        setBankInfo({
          bank: draft.step_4.bank_name,
          branch: draft.step_4.branch_name || '',
        });
      }
      if (draft.step_4.account_type) setAccType(draft.step_4.account_type);
      if (draft.step_4.cheque_document) setChequeDoc(draft.step_4.cheque_document);
    }

    if (draft.step_5) {
      setAcceptedAgreement(draft.step_5.accepted_agreement ?? false);
    }

    // If flagged sections exist, jump to the first flagged step
    if (draft.flagged_sections && draft.flagged_sections.length > 0 && !searchParams.get('step')) {
      setCurrentStep(draft.flagged_sections[0]);
    } else if (draft.current_step && !searchParams.get('step')) {
      setCurrentStep(Math.min(draft.current_step, TOTAL_STEPS));
    }
  }, [draft, user]);

  // Debounced slug uniqueness check
  const handleSlugChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-');
    setStoreSlug(clean);

    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (!clean || clean.length < 3) {
      setSlugStatus('idle');
      return;
    }

    setSlugStatus('checking');
    slugDebounceRef.current = setTimeout(async () => {
      try {
        const res = await slugMutation.mutateAsync(clean);
        setSlugStatus(res.available ? 'available' : 'taken');
      } catch {
        setSlugStatus('idle');
      }
    }, 350);
  };

  // Auto-generate slug from store name if slug is untouched
  const handleStoreNameBlur = () => {
    if (!storeSlug && storeName) {
      const generated = storeName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      handleSlugChange(generated);
    }
  };

  // IFSC Lookup on blur or 11 chars
  const handleIfscLookup = async (code: string) => {
    const clean = code.trim().toUpperCase();
    setIfscCode(clean);
    if (clean.length === 11) {
      try {
        const res = await ifscMutation.mutateAsync(clean);
        setBankInfo({ bank: res.bank, branch: res.branch });
      } catch {
        setBankInfo(null);
      }
    } else {
      setBankInfo(null);
    }
  };

  // =========================================================================
  // STEP VALIDATIONS (ZOD)
  // =========================================================================
  const validateCurrentStep = (): boolean => {
    setFieldErrors({});
    setGeneralError(null);

    if (currentStep === 1) {
      const schema = createStep1StoreDetailsSchema(t);
      const res = schema.safeParse({
        store_name: storeName,
        store_slug: storeSlug,
        short_description: shortDescription,
        seller_story: sellerStory,
        logo_document_id: logoDoc?.id || null,
        banner_document_id: bannerDoc?.id || null,
        languages_spoken: selectedLanguages,
        seller_type: sellerType,
        social_links: { instagram, facebook, website },
      });

      if (!res.success) {
        const errors: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const key = issue.path.join('.');
          errors[key] = issue.message;
        });
        setFieldErrors(errors);
        return false;
      }

      if (storeSlug.trim() && slugStatus === 'taken') {
        setFieldErrors({ store_slug: t('onboarding.validation.slugTaken', { defaultValue: 'This store URL slug is already taken. Please choose another.' }) });
        return false;
      }
      return true;
    }

    if (currentStep === 2) {
      const schema = createStep2PickupAddressSchema(t);
      const res = schema.safeParse({
        pickup_address: {
          contact_person: pickupContact,
          address_line1: pickupLine1,
          address_line2: pickupLine2 || undefined,
          city: pickupCity,
          state: pickupState,
          pincode: pickupPincode,
          courier_mobile: pickupMobile,
        },
        same_as_business_address: sameAsBusiness,
        business_address: sameAsBusiness
          ? undefined
          : {
            contact_person: bizContact,
            address_line1: bizLine1,
            address_line2: bizLine2 || undefined,
            city: bizCity,
            state: bizState,
            pincode: bizPincode,
            courier_mobile: bizMobile,
          },
      });

      if (!res.success) {
        const errors: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const key = issue.path.join('.');
          errors[key] = issue.message;
        });
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    if (currentStep === 3) {
      const schema = createStep3VerificationSchema(t, sellerType);
      const res = schema.safeParse({
        pan_number: panNumber.toUpperCase(),
        pan_document_id: panDoc?.id || '',
        gstin: gstin ? gstin.toUpperCase() : undefined,
        identity_proof_type: idType,
        identity_document_id: idDoc?.id || '',
        address_document_id: addressDoc?.id || '',
        artisan_card_document_id: artisanCardDoc?.id || null,
      });

      if (!res.success) {
        const errors: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const key = issue.path.join('.');
          errors[key] = issue.message;
        });
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    if (currentStep === 4) {
      const hasMasked = !!existingMaskedAcc && !isEditingAccNumber;
      const schema = createStep4BankDetailsSchema(t, hasMasked);
      const res = schema.safeParse({
        account_holder_name: accHolderName,
        account_number: hasMasked ? existingMaskedAcc : accNumber,
        confirm_account_number: hasMasked ? existingMaskedAcc : confirmAccNumber,
        ifsc_code: ifscCode.toUpperCase(),
        account_type: accType,
        cheque_document_id: chequeDoc?.id || '',
      });

      if (!res.success) {
        const errors: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const key = issue.path.join('.');
          errors[key] = issue.message;
        });
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    if (currentStep === 5) {
      const schema = createStep5ReviewSchema(t);
      const res = schema.safeParse({
        accepted_agreement: acceptedAgreement,
      });

      if (!res.success) {
        const errors: Record<string, string> = {};
        res.error.issues.forEach((issue) => {
          const key = issue.path.join('.');
          errors[key] = issue.message;
        });
        setFieldErrors(errors);
        return false;
      }
      return true;
    }

    return true;
  };

  // =========================================================================
  // SKIP STEP 1 (STORE DETAILS) WITH AUTOMATIC ARTISAN DEFAULTS
  // =========================================================================
  const handleSkipStep1 = async () => {
    setGeneralError(null);
    setFieldErrors({});

    const fallbackName = user?.store_name || user?.full_name || 'Artisan Studio';
    const finalStoreName = storeName.trim() || fallbackName;
    let finalSlug = storeSlug.trim();
    if (!finalSlug || slugStatus === 'taken') {
      const cleanBase = finalStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artisan';
      finalSlug = `${cleanBase}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    setStoreName(finalStoreName);
    setStoreSlug(finalSlug);

    const payload: StoreDetailsStepData = {
      store_name: finalStoreName,
      store_slug: finalSlug,
      short_description: shortDescription.trim() || 'Authentic handcrafted creations and artisan goods.',
      seller_story: sellerStory.trim(),
      logo_document_id: logoDoc?.id || null,
      banner_document_id: bannerDoc?.id || null,
      languages_spoken: selectedLanguages.length > 0 ? selectedLanguages : ['English'],
      social_links: { instagram, facebook, website },
      seller_type: sellerType || 'individual_artisan',
    };

    try {
      await saveStepMutation.mutateAsync({
        stepNumber: 1,
        data: payload,
      });

      setSaveSuccessMsg(t('onboarding.step1SkippedMsg', { defaultValue: 'Profile initialized with registered name.' }));
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.warn('[Onboarding] Optional step 1 save draft warning:', err);
    } finally {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // =========================================================================
  // SAVE DRAFT STEP LOGIC
  // =========================================================================
  const saveCurrentStepData = async (advance = false) => {
    if (!validateCurrentStep()) return false;

    try {
      let payload: any = {};

      if (currentStep === 1) {
        const fallbackName = user?.store_name || user?.full_name || 'Artisan Studio';
        const finalStoreName = storeName.trim() || fallbackName;
        let finalSlug = storeSlug.trim();
        if (!finalSlug || slugStatus === 'taken') {
          const cleanBase = finalStoreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artisan';
          finalSlug = `${cleanBase}-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        payload = {
          store_name: finalStoreName,
          store_slug: finalSlug,
          short_description: shortDescription.trim(),
          seller_story: sellerStory.trim(),
          logo_document_id: logoDoc?.id || null,
          banner_document_id: bannerDoc?.id || null,
          languages_spoken: selectedLanguages.length > 0 ? selectedLanguages : ['English'],
          social_links: { instagram, facebook, website },
          seller_type: sellerType || 'individual_artisan',
        } as StoreDetailsStepData;
      } else if (currentStep === 2) {
        payload = {
          pickup_address: {
            contact_person: pickupContact.trim(),
            address_line1: pickupLine1.trim(),
            address_line2: pickupLine2.trim() || undefined,
            city: pickupCity.trim(),
            state: pickupState.trim(),
            pincode: pickupPincode.trim(),
            courier_mobile: pickupMobile.trim(),
          },
          same_as_business_address: sameAsBusiness,
          business_address: sameAsBusiness
            ? undefined
            : {
              contact_person: bizContact.trim(),
              address_line1: bizLine1.trim(),
              address_line2: bizLine2.trim() || undefined,
              city: bizCity.trim(),
              state: bizState.trim(),
              pincode: bizPincode.trim(),
              courier_mobile: bizMobile.trim(),
            },
        } as PickupAddressStepData;
      } else if (currentStep === 3) {
        payload = {
          pan_number: panNumber.trim().toUpperCase(),
          pan_document_id: panDoc?.id,
          gstin: gstin.trim().toUpperCase() || undefined,
          identity_proof_type: idType,
          identity_document_id: idDoc?.id,
          address_document_id: addressDoc?.id,
          artisan_card_document_id: artisanCardDoc?.id || null,
        } as VerificationStepData;
      } else if (currentStep === 4) {
        payload = {
          account_holder_name: accHolderName.trim(),
          account_number: !existingMaskedAcc || isEditingAccNumber ? accNumber.trim() : undefined,
          confirm_account_number: !existingMaskedAcc || isEditingAccNumber ? confirmAccNumber.trim() : undefined,
          ifsc_code: ifscCode.trim().toUpperCase(),
          bank_name: bankInfo?.bank,
          branch_name: bankInfo?.branch,
          account_type: accType,
          cheque_document_id: chequeDoc?.id,
        } as BankDetailsStepData;
      }

      await saveStepMutation.mutateAsync({
        stepNumber: currentStep,
        data: payload,
      });

      setSaveSuccessMsg(t('onboarding.savedDraft', { defaultValue: 'Progress saved as draft.' }));
      setTimeout(() => setSaveSuccessMsg(null), 3000);

      if (advance && currentStep < TOTAL_STEPS) {
        setCurrentStep((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return true;
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setGeneralError(apiErr.message || t('common.errorGeneric', { defaultValue: 'Failed to save step draft.' }));
      return false;
    }
  };

  // Submit Final Application
  const handleSubmitFinal = async () => {
    setGeneralError(null);
    if (!validateCurrentStep()) {
      setGeneralError(t('onboarding.acceptAgreementFirst', { defaultValue: 'Please accept the Seller Agreement checkbox before submitting.' }));
      return;
    }

    try {
      await submitMutation.mutateAsync();
      setSubmitSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { message?: string; response?: { data?: { message?: string } } };
      setGeneralError(
        apiErr.response?.data?.message ||
          apiErr.message ||
          t('onboarding.submitFailed', { defaultValue: 'Failed to submit onboarding application.' })
      );
    }
  };

  // After the success popup: refresh session status so route guards allow /vendor/status
  const finishSubmission = async () => {
    try {
      await refetchUser();
    } finally {
      setSubmitSuccess(false);
      navigate('/vendor/status', { replace: true });
    }
  };

  // Reviewer's note for resubmission requests
  useEffect(() => {
    if (user?.vendor_status !== 'resubmission_requested') return;
    getVendorStatus()
      .then((s) => setReviewerNote(s.rejection_reason || null))
      .catch(() => undefined);
  }, [user?.vendor_status]);

  // Resolve preview URLs for the documents shown in the detail popup
  useEffect(() => {
    if (!detailSection) return;
    const docs =
      detailSection === 1
        ? [logoDoc, bannerDoc]
        : detailSection === 3
        ? [panDoc, idDoc, addressDoc, artisanCardDoc]
        : detailSection === 4
        ? [chequeDoc]
        : [];
    docs.forEach((d) => {
      if (!d?.id || docUrls[d.id]) return;
      getDocumentPreviewLink(d.id)
        .then((r) => setDocUrls((prev) => ({ ...prev, [d.id]: r.url })))
        .catch(() => undefined);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailSection]);

  // Step definitions for the progress indicator
  const stepsMeta = useMemo(
    () => [
      { id: 1, title: t('onboarding.steps.step1', { defaultValue: 'Store Details' }), icon: Store },
      { id: 2, title: t('onboarding.steps.step2', { defaultValue: 'Pickup Address' }), icon: MapPin },
      { id: 3, title: t('onboarding.steps.step3', { defaultValue: 'Verification (KYC)' }), icon: ShieldCheck },
      { id: 4, title: t('onboarding.steps.step4', { defaultValue: 'Bank Details' }), icon: Building2 },
      { id: 5, title: t('onboarding.steps.step5', { defaultValue: 'Review & Submit' }), icon: FileCheck2 },
    ],
    [t]
  );

  if (isDraftLoading) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF1EA] border border-[#D1DDD0] flex items-center justify-center animate-spin">
          <div className="w-6 h-6 border-2 border-[#2E4D34] border-t-transparent rounded-full" />
        </div>
        <p className="text-xs font-semibold text-[#5F6D61] uppercase tracking-wider">
          {t('onboarding.loadingDraft', { defaultValue: 'Loading your store onboarding...' })}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 space-y-8">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-[#EAE5DB] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF1EA] text-xs font-semibold text-[#2E4D34] w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('onboarding.badge', { defaultValue: 'Artisan Onboarding' })}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
            {t('onboarding.pageTitle', { defaultValue: 'Set Up Your Artisan Store' })}
          </h1>
          <p className="text-xs sm:text-sm text-[#637365]">
            {t('onboarding.pageSubtitle', {
              defaultValue: 'Complete these 5 steps to verify your craft credentials and start selling on ChillyFlakes.',
            })}
          </p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void saveCurrentStepData(false)}
            isLoading={saveStepMutation.isPending}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {t('onboarding.saveDraftBtn', { defaultValue: 'Save Draft' })}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleLogout()}
            isLoading={isLoggingOut}
            disabled={isLoggingOut}
            leftIcon={<LogOut className="w-4 h-4 text-[#8E9B90]" />}
            className="text-xs text-[#637365]"
          >
            {t('common.logout', { defaultValue: 'Logout' })}
          </Button>
        </div>
      </div>

      {/* Global Banners (Save Success, Flagged Sections Alert, Errors) */}
      {saveSuccessMsg && (
        <div
          role="status"
          className="flex items-center gap-2 p-3.5 rounded-2xl bg-[#EAF1EA] border border-[#2E4D34]/20 text-xs text-[#2E4D34] font-medium animate-fadeIn"
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {flaggedSections.length > 0 && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-[#FFF8F7] border border-[#FCA5A5] flex items-start gap-3.5 text-xs text-[#B91C1C]"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#DC2626]" />
          <div className="space-y-1">
            <p className="font-bold">
              {t('onboarding.resubmissionNotice', { defaultValue: 'Re-verification Requested' })}
            </p>
            <p className="text-[#7F1D1D] leading-relaxed">
              {reviewerNote ||
                t('onboarding.resubmissionDesc', {
                  defaultValue: 'Please fix the highlighted sections indicated by the review team and re-submit.',
                })}
            </p>
            <p className="text-[11px] text-[#991B1B]">
              Sections to fix:{' '}
              <strong>
                {flaggedSections
                  .map((n: number) => ({ 1: 'Store Identity', 2: 'Pickup Address', 3: 'KYC Documents', 4: 'Bank Details' } as Record<number, string>)[n])
                  .filter(Boolean)
                  .join(', ')}
              </strong>
            </p>
          </div>
        </div>
      )}

      {generalError && (
        <div
          role="alert"
          className="p-3.5 rounded-2xl bg-[#FFF5F5] border border-[#FCA5A5] text-xs text-[#B91C1C] flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5-Step Accessible Progress Bar Indicator                              */}
      {/* ===================================================================== */}
      <nav aria-label="Onboarding Progress" className="bg-white rounded-3xl p-4 sm:p-6 shadow-xs border border-[#EAE5DB]">
        <ol className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-2">
          {stepsMeta.map((s) => {
            const isCompleted = s.id < currentStep;
            const isCurrent = s.id === currentStep;
            const isFlagged = flaggedSections.includes(s.id);
            const StepIcon = s.icon;

            return (
              <li key={s.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    // Allow navigating to any already completed step or flagged step
                    if (isCompleted || isCurrent || isFlagged) {
                      setCurrentStep(s.id);
                    }
                  }}
                  disabled={!isCompleted && !isCurrent && !isFlagged}
                  className={`w-full flex flex-col items-center p-3 rounded-2xl transition-all text-center focus:outline-none focus:ring-2 focus:ring-[#2E4D34] ${isCurrent
                      ? 'bg-[#2E4D34] text-white shadow-md'
                      : isFlagged
                        ? 'bg-[#FFF0F0] text-[#C53030] border border-[#FCA5A5]'
                        : isCompleted
                          ? 'bg-[#FAF7F2] text-[#223B28] hover:bg-[#EAF1EA]'
                          : 'text-[#A0ABA2] opacity-60 cursor-not-allowed'
                    }`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 ${isCurrent
                        ? 'bg-white/20 text-white'
                        : isFlagged
                          ? 'bg-[#C53030] text-white'
                          : isCompleted
                            ? 'bg-[#2E4D34] text-white'
                            : 'bg-[#EAE5DB] text-[#8E9B90]'
                      }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold line-clamp-1">{s.title}</span>
                  {isFlagged && (
                    <span className="text-[9px] font-extrabold uppercase text-[#DC2626] mt-0.5">
                      {t('onboarding.flagged', { defaultValue: 'Needs Fix' })}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ===================================================================== */}
      {/* STEP FORMS CONTAINER                                                  */}
      {/* ===================================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xs border border-[#EAE5DB] space-y-8">
        {/* =================================================================== */}
        {/* STEP 1: STORE DETAILS                                               */}
        {/* =================================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="border-b border-[#EAE5DB] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl font-bold text-[#223B28]">
                    {t('onboarding.step1Title', { defaultValue: '1. Store Identity & Brand Details' })}
                  </h2>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#EAF1EA] border border-[#2E4D34]/20 text-[#2E4D34]">
                    {t('common.optional', { defaultValue: 'Optional' })}
                  </span>
                </div>
                <p className="text-xs text-[#637365] mt-1">
                  {t('onboarding.step1Desc', {
                    defaultValue: "Sellers without a physical shop or brand can skip this step. We'll automatically set up your artisan profile using your registered name.",
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleSkipStep1()}
                isLoading={saveStepMutation.isPending}
                className="self-start sm:self-auto border-[#D1DDD0] text-[#2E4D34] hover:bg-[#EAF1EA] text-xs font-semibold"
              >
                {t('onboarding.skipStep1', { defaultValue: 'Skip this step' })}
              </Button>
            </div>

            {/* Seller Type Selector */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-semibold text-[#223B28]">
                {t('onboarding.sellerTypeLabel', { defaultValue: 'Artisan Business Type' })}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'individual_artisan',
                    title: t('onboarding.sellerTypes.artisanTitle', { defaultValue: 'Individual Artisan' }),
                    desc: t('onboarding.sellerTypes.artisanDesc', { defaultValue: 'Solo maker, traditional craftsperson, or home studio' }),
                    icon: User,
                  },
                  {
                    id: 'small_business',
                    title: t('onboarding.sellerTypes.smallBizTitle', { defaultValue: 'Small Craft Studio' }),
                    desc: t('onboarding.sellerTypes.smallBizDesc', { defaultValue: 'Partnership or cooperative with rural artisans' }),
                    icon: Store,
                  },
                  {
                    id: 'registered_company',
                    title: t('onboarding.sellerTypes.companyTitle', { defaultValue: 'Registered Enterprise' }),
                    desc: t('onboarding.sellerTypes.companyDesc', { defaultValue: 'Pvt Ltd, LLP, or registered social enterprise (GSTIN required)' }),
                    icon: Building,
                  },
                ].map((item) => {
                  const isSelected = sellerType === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSellerType(item.id as SellerType)}
                      className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${isSelected
                          ? 'border-[#2E4D34] bg-[#EAF1EA]/40 ring-2 ring-[#2E4D34]/20'
                          : 'border-[#EAE5DB] hover:border-[#2E4D34]/40 bg-[#FAF7F2]/40'
                        }`}
                    >
                      <div className="space-y-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'bg-[#2E4D34] text-white' : 'bg-[#EAE5DB] text-[#637365]'
                            }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-[#223B28]">{item.title}</p>
                        <p className="text-[11px] text-[#637365] leading-relaxed">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Store Name & Slug */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="storeName"
                label={t('onboarding.storeNameLabel', { defaultValue: 'Store / Artisan Name' })}
                error={fieldErrors['store_name']}
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                onBlur={handleStoreNameBlur}
                placeholder={user?.store_name || user?.full_name || 'e.g. Malabar Terracotta Studio'}
                hint={t('onboarding.storeNameHint', { defaultValue: 'Optional. Defaults to your registered name if left blank.' })}
              />

              <FormField
                id="storeSlug"
                label={t('onboarding.storeSlugLabel', { defaultValue: 'Store URL Slug' })}
                error={fieldErrors['store_slug']}
                hint={t('onboarding.storeSlugHint', { defaultValue: 'chillyflakes.in/store/[slug] (Auto-generated if left blank)' })}
                value={storeSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="malabar-terracotta"
                rightElement={
                  <div className="flex items-center text-xs">
                    {slugStatus === 'checking' && (
                      <span className="text-[#8E9B90] animate-pulse">Checking...</span>
                    )}
                    {slugStatus === 'available' && (
                      <CheckCircle2 className="w-4 h-4 text-[#2E4D34]" />
                    )}
                    {slugStatus === 'taken' && (
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                    )}
                  </div>
                }
              />
            </div>

            {/* Short Description */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="shortDescription" className="text-xs font-semibold text-[#223B28]">
                  {t('onboarding.shortDescLabel', { defaultValue: 'Short Store Tagline / Description' })}
                </label>
                <span className="text-[11px] text-[#637365] font-mono">{shortDescription.length}/300</span>
              </div>
              <textarea
                id="shortDescription"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value.slice(0, 300))}
                rows={2}
                placeholder={t('onboarding.shortDescPlaceholder', {
                  defaultValue: 'Optional. e.g. Handcrafted red clay cookware and traditional kitchenware.',
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] hover:border-[#C4D3C2] focus:border-[#2E4D34] focus:ring-2 focus:ring-[#2E4D34]/20 text-xs text-[#1D251E] bg-white resize-none"
              />
              {fieldErrors['short_description'] && (
                <p className="text-[11px] text-[#DC2626] font-medium">{fieldErrors['short_description']}</p>
              )}
            </div>

            {/* Seller Story */}
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="sellerStory" className="text-xs font-semibold text-[#223B28]">
                  {t('onboarding.storyLabel', { defaultValue: 'Artisan Heritage & Craft Story' })} <span className="text-[#DC2626]">*</span>
                </label>
                <span className="text-[11px] text-[#637365] font-mono">{sellerStory.length}/1000 min 20</span>
              </div>
              <textarea
                id="sellerStory"
                value={sellerStory}
                onChange={(e) => setSellerStory(e.target.value.slice(0, 1000))}
                rows={4}
                placeholder={t('onboarding.storyPlaceholder', {
                  defaultValue:
                    'Share your workshop history, materials sourced, sustainable techniques, and traditional craft lineage...',
                })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#EAE5DB] hover:border-[#C4D3C2] focus:border-[#2E4D34] focus:ring-2 focus:ring-[#2E4D34]/20 text-xs text-[#1D251E] bg-white"
              />
              {fieldErrors['seller_story'] && (
                <p className="text-[11px] text-[#DC2626] font-medium">{fieldErrors['seller_story']}</p>
              )}
            </div>

            {/* Media Uploaders: Logo & Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <DocumentUploader
                label={t('onboarding.logoLabel', { defaultValue: 'Store Logo / Artisan Avatar' })}
                description={t('onboarding.logoDesc', { defaultValue: 'Square image, JPG/PNG/WebP, max 2 MB' })}
                documentType="store_logo"
                maxSizeMB={2}
                value={logoDoc}
                onChange={setLogoDoc}
                error={fieldErrors['logo_document_id']}
              />

              <DocumentUploader
                label={t('onboarding.bannerLabel', { defaultValue: 'Storefront Banner (Optional)' })}
                description={t('onboarding.bannerDesc', { defaultValue: 'Horizontal hero image, JPG/PNG/WebP, max 3 MB' })}
                documentType="store_banner"
                maxSizeMB={3}
                value={bannerDoc}
                onChange={setBannerDoc}
                error={fieldErrors['banner_document_id']}
              />
            </div>

            {/* Languages Spoken (Multi-select) */}
            <div className="space-y-2 pt-2">
              <label className="text-xs sm:text-sm font-semibold text-[#223B28]">
                {t('onboarding.languagesLabel', { defaultValue: 'Languages Spoken' })}{' '}
                <span className="text-[#C53030]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_LANGUAGES.map((lang) => {
                  const isChecked = selectedLanguages.includes(lang);
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          if (selectedLanguages.length > 1) {
                            setSelectedLanguages(selectedLanguages.filter((l) => l !== lang));
                          }
                        } else {
                          setSelectedLanguages([...selectedLanguages, lang]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${isChecked
                          ? 'bg-[#2E4D34] text-white border-[#2E4D34]'
                          : 'bg-[#FAF7F2] text-[#637365] border-[#EAE5DB] hover:border-[#2E4D34]/40'
                        }`}
                    >
                      {lang}
                    </button>
                  );
                })}
              </div>
              {fieldErrors['languages_spoken'] && (
                <p className="text-xs text-[#DC2626]">{fieldErrors['languages_spoken']}</p>
              )}
            </div>

            {/* Social Links (Optional) */}
            <div className="space-y-3 pt-2">
              <p className="text-xs font-bold text-[#223B28] uppercase tracking-wider">
                {t('onboarding.socialLinksTitle', { defaultValue: 'Optional Social & Web Links' })}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="Instagram (@username)"
                  className="px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white focus:border-[#2E4D34]"
                />
                <input
                  type="text"
                  value={facebook}
                  onChange={(e) => setFacebook(e.target.value)}
                  placeholder="Facebook page URL"
                  className="px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white focus:border-[#2E4D34]"
                />
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://artisan-website.com"
                  className="px-3 py-2 rounded-xl border border-[#D1DDD0] text-xs bg-white focus:border-[#2E4D34]"
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: PICKUP & DISPATCH ADDRESS                                   */}
        {/* =================================================================== */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="border-b border-[#EAE5DB] pb-4">
              <h2 className="font-serif text-xl font-bold text-[#223B28]">
                {t('onboarding.step2Title', { defaultValue: '2. Workshop & Courier Pickup Address' })}
              </h2>
              <p className="text-xs text-[#637365]">
                {t('onboarding.step2Desc', {
                  defaultValue: 'Courier delivery partners will dispatch pickup trucks to this physical address.',
                })}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="pickupContact"
                  label={t('onboarding.contactPersonLabel', { defaultValue: 'Pickup Contact Person' })}
                  required
                  error={fieldErrors['pickup_address.contact_person']}
                  value={pickupContact}
                  onChange={(e) => setPickupContact(e.target.value)}
                  placeholder="e.g. Senthil Kumaran"
                />

                <FormField
                  id="pickupMobile"
                  type="tel"
                  label={t('onboarding.courierMobileLabel', { defaultValue: 'Courier Coordination Mobile' })}
                  required
                  error={fieldErrors['pickup_address.courier_mobile']}
                  hint="10-digit mobile number starting with 6-9"
                  value={pickupMobile}
                  onChange={(e) => setPickupMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="9876543210"
                />
              </div>

              <FormField
                id="pickupLine1"
                label={t('onboarding.addressLine1Label', { defaultValue: 'Workshop / House / Street Address (Line 1)' })}
                required
                error={fieldErrors['pickup_address.address_line1']}
                value={pickupLine1}
                onChange={(e) => setPickupLine1(e.target.value)}
                placeholder="e.g. 42 Weavers Colony, Gandhi Road"
              />

              <FormField
                id="pickupLine2"
                label={t('onboarding.addressLine2Label', { defaultValue: 'Landmark / Area (Line 2 - Optional)' })}
                error={fieldErrors['pickup_address.address_line2']}
                value={pickupLine2}
                onChange={(e) => setPickupLine2(e.target.value)}
                placeholder="Near Post Office or Temple"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  id="pickupCity"
                  label={t('onboarding.cityLabel', { defaultValue: 'City / District' })}
                  required
                  error={fieldErrors['pickup_address.city']}
                  value={pickupCity}
                  onChange={(e) => setPickupCity(e.target.value)}
                  placeholder="Thrissur"
                />

                <FormField
                  id="pickupState"
                  label={t('onboarding.stateLabel', { defaultValue: 'State / Union Territory' })}
                  required
                  error={fieldErrors['pickup_address.state']}
                  value={pickupState}
                  onChange={(e) => setPickupState(e.target.value)}
                  placeholder="Kerala"
                />

                <FormField
                  id="pickupPincode"
                  label={t('onboarding.pincodeLabel', { defaultValue: '6-digit PIN Code' })}
                  required
                  error={fieldErrors['pickup_address.pincode']}
                  value={pickupPincode}
                  onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="680001"
                  maxLength={6}
                />
              </div>

              {/* Same as Business Address Toggle */}
              <div className="pt-4 border-t border-[#EAE5DB]">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameAsBusiness}
                    onChange={(e) => setSameAsBusiness(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2E4D34] focus:ring-[#2E4D34] border-[#D1DDD0]"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-[#223B28]">
                    {t('onboarding.sameAsBusiness', {
                      defaultValue: 'Registered business address is the same as courier pickup address',
                    })}
                  </span>
                </label>
              </div>

              {/* Secondary Business Address Block */}
              {!sameAsBusiness && (
                <div className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-4 animate-fadeIn">
                  <p className="text-xs font-bold text-[#2E4D34] uppercase tracking-wider">
                    {t('onboarding.registeredBizAddressTitle', { defaultValue: 'Registered Legal Business Address' })}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      id="bizContact"
                      label="Legal Entity Contact Name"
                      required
                      error={fieldErrors['business_address.contact_person']}
                      value={bizContact}
                      onChange={(e) => setBizContact(e.target.value)}
                    />

                    <FormField
                      id="bizMobile"
                      type="tel"
                      label="Contact Mobile"
                      required
                      error={fieldErrors['business_address.courier_mobile']}
                      value={bizMobile}
                      onChange={(e) => setBizMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>

                  <FormField
                    id="bizLine1"
                    label="Address Line 1"
                    required
                    error={fieldErrors['business_address.address_line1']}
                    value={bizLine1}
                    onChange={(e) => setBizLine1(e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                      id="bizCity"
                      label="City"
                      required
                      error={fieldErrors['business_address.city']}
                      value={bizCity}
                      onChange={(e) => setBizCity(e.target.value)}
                    />

                    <FormField
                      id="bizState"
                      label="State"
                      required
                      error={fieldErrors['business_address.state']}
                      value={bizState}
                      onChange={(e) => setBizState(e.target.value)}
                    />

                    <FormField
                      id="bizPincode"
                      label="PIN Code"
                      required
                      error={fieldErrors['business_address.pincode']}
                      value={bizPincode}
                      onChange={(e) => setBizPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: VERIFICATION (KYC & IDENTITY)                               */}
        {/* =================================================================== */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="border-b border-[#EAE5DB] pb-4">
              <h2 className="font-serif text-xl font-bold text-[#223B28]">
                {t('onboarding.step3Title', { defaultValue: '3. Identity & Tax Verification (KYC)' })}
              </h2>
              <p className="text-xs text-[#637365]">
                {t('onboarding.step3Desc', {
                  defaultValue: 'Required for tax invoice generation and payouts under Indian marketplace regulations.',
                })}
              </p>
            </div>

            {/* PAN Card Input & Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
              <FormField
                id="panNumber"
                label={t('onboarding.panNumberLabel', { defaultValue: 'Permanent Account Number (PAN)' })}
                required
                error={fieldErrors['pan_number']}
                hint="10-character alphanumeric (e.g. ABCDE1234F)"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase().slice(0, 10))}
                placeholder="ABCDE1234F"
                maxLength={10}
                className="font-mono uppercase tracking-wider"
              />

              <DocumentUploader
                label={t('onboarding.panDocLabel', { defaultValue: 'PAN Card Copy' })}
                description={t('onboarding.panDocDesc', { defaultValue: 'Upload clear scan/photo of PAN card (PDF or JPG)' })}
                documentType="pan_card"
                required
                value={panDoc}
                onChange={setPanDoc}
                error={fieldErrors['pan_document_id']}
              />
            </div>

            {/* GSTIN (Optional or Required for Registered Company) */}
            <div className="pt-2">
              <FormField
                id="gstin"
                label={
                  sellerType === 'registered_company'
                    ? t('onboarding.gstinRequiredLabel', { defaultValue: 'GSTIN (Goods and Services Tax ID) - Required for Companies' })
                    : t('onboarding.gstinOptionalLabel', { defaultValue: 'GSTIN (Optional for small artisans exempt under threshold)' })
                }
                required={sellerType === 'registered_company'}
                error={fieldErrors['gstin']}
                hint="15-character GSTIN (e.g. 33AABCD1234F1Z5)"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase().slice(0, 15))}
                placeholder="33AABCD1234F1Z5"
                maxLength={15}
                className="font-mono uppercase"
              />
            </div>

            {/* Identity Proof Selection & Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
              <div className="w-full flex flex-col gap-1.5">
                <label htmlFor="idType" className="text-xs font-semibold text-[#223B28] flex items-center justify-between">
                  <span>
                    {t('onboarding.idTypeLabel', { defaultValue: 'Government Identity Proof Type' })}
                    <span className="text-[#DC2626] ml-1">*</span>
                  </span>
                </label>
                <select
                  id="idType"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value as IdentityProofType)}
                  className="w-full py-2.5 px-3.5 text-xs text-[#1D251E] bg-white transition-all duration-200 border border-[#EAE5DB] hover:border-[#C4D3C2] focus:border-[#2E4D34] focus:ring-2 focus:ring-[#2E4D34]/20 rounded-xl focus:outline-none"
                >
                  <option value="aadhaar_masked">Masked Aadhaar Card (first 8 digits hidden)</option>
                  <option value="voter_id">Voter ID Card (Election Commission)</option>
                  <option value="passport">Indian Passport</option>
                  <option value="driving_licence">Driving Licence</option>
                </select>
                {fieldErrors['identity_proof_type'] && (
                  <p className="text-[11px] text-[#DC2626] font-medium">{fieldErrors['identity_proof_type']}</p>
                )}
              </div>

              <DocumentUploader
                label={t('onboarding.idDocLabel', { defaultValue: 'Identity Proof Document' })}
                description={t('onboarding.idDocDesc', { defaultValue: 'Front and back scan in single PDF or clear image' })}
                documentType="identity_proof"
                required
                value={idDoc}
                onChange={setIdDoc}
                error={fieldErrors['identity_document_id']}
              />
            </div>

            {/* Address Proof Upload */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start pt-2">
              <DocumentUploader
                label={t('onboarding.addressDocLabel', { defaultValue: 'Proof of Workshop / Business Address' })}
                description={t('onboarding.addressDocDesc', { defaultValue: 'Utility bill (< 3 months old), rent agreement, or bank statement' })}
                documentType="address_proof"
                required
                value={addressDoc}
                onChange={setAddressDoc}
                error={fieldErrors['address_document_id']}
              />

              <DocumentUploader
                label={t('onboarding.artisanCardLabel', { defaultValue: 'Artisan Card / Craft Certificate (Optional)' })}
                description={t('onboarding.artisanCardDesc', {
                  defaultValue: 'Pehchan ID, DC Handicrafts certificate, or handloom board registration',
                })}
                documentType="artisan_card"
                value={artisanCardDoc}
                onChange={setArtisanCardDoc}
                error={fieldErrors['artisan_card_document_id']}
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 4: BANK ACCOUNT & PAYOUT DETAILS                               */}
        {/* =================================================================== */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="border-b border-[#EAE5DB] pb-4">
              <h2 className="font-serif text-xl font-bold text-[#223B28]">
                {t('onboarding.step4Title', { defaultValue: '4. Bank Account for Weekly Payouts' })}
              </h2>
              <p className="text-xs text-[#637365]">
                {t('onboarding.step4Desc', {
                  defaultValue: 'All earnings and customer sales proceeds are settled to this registered Indian bank account.',
                })}
              </p>
            </div>

            <FormField
              id="accHolderName"
              label={t('onboarding.accHolderLabel', { defaultValue: 'Account Holder Name' })}
              required
              error={fieldErrors['account_holder_name']}
              hint="Must match your legal name or registered enterprise name on PAN"
              value={accHolderName}
              onChange={(e) => setAccHolderName(e.target.value)}
              placeholder="e.g. Senthil Kumaran"
            />

            {/* Masked Account Number Display if already saved */}
            {existingMaskedAcc && !isEditingAccNumber ? (
              <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#D1DDD0] flex items-center justify-center text-[#2E4D34]">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[#7A8A7C]">Saved Payout Account Number</p>
                    <p className="font-mono text-sm font-bold text-[#223B28]">{existingMaskedAcc}</p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingAccNumber(true)}
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                >
                  Change Account
                </Button>
              </div>
            ) : (
              /* Plaintext Account Number + Confirm Input */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  id="accNumber"
                  type="password"
                  label={t('onboarding.accNumberLabel', { defaultValue: 'Bank Account Number' })}
                  required
                  error={fieldErrors['account_number']}
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="8 to 20 numeric digits"
                  className="font-mono"
                />

                <FormField
                  id="confirmAccNumber"
                  type="text"
                  label={t('onboarding.confirmAccNumberLabel', { defaultValue: 'Confirm Bank Account Number' })}
                  required
                  error={fieldErrors['confirm_account_number']}
                  value={confirmAccNumber}
                  onChange={(e) => setConfirmAccNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Re-enter account number"
                  className="font-mono"
                />
              </div>
            )}

            {/* IFSC Code + Automatic Bank Branch Lookup */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                id="ifscCode"
                label={t('onboarding.ifscLabel', { defaultValue: 'IFSC Code' })}
                required
                error={fieldErrors['ifsc_code']}
                hint="11-character code (e.g. SBIN0001234)"
                value={ifscCode}
                onChange={(e) => handleIfscLookup(e.target.value)}
                placeholder="SBIN0001234"
                maxLength={11}
                className="font-mono uppercase tracking-wider"
                rightElement={
                  bankInfo ? (
                    <CheckCircle2 className="w-4 h-4 text-[#2E4D34]" />
                  ) : null
                }
              />

              {/* Account Type Selector */}
              <div className="w-full flex flex-col gap-1.5">
                <label htmlFor="accType" className="text-xs font-semibold text-[#223B28] flex items-center justify-between">
                  <span>
                    {t('onboarding.accTypeLabel', { defaultValue: 'Account Type' })}
                    <span className="text-[#DC2626] ml-1">*</span>
                  </span>
                </label>
                <select
                  id="accType"
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as BankAccountType)}
                  className="w-full py-2.5 px-3.5 text-xs text-[#1D251E] bg-white transition-all duration-200 border border-[#EAE5DB] hover:border-[#C4D3C2] focus:border-[#2E4D34] focus:ring-2 focus:ring-[#2E4D34]/20 rounded-xl focus:outline-none"
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
                {fieldErrors['account_type'] && (
                  <p className="text-[11px] text-[#DC2626] font-medium">{fieldErrors['account_type']}</p>
                )}
              </div>
            </div>

            {/* Bank Branch Verified Badge */}
            {bankInfo && (
              <div className="p-3.5 rounded-2xl bg-[#EAF1EA] border border-[#2E4D34]/20 flex items-center gap-3 text-xs text-[#2E4D34] animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#2E4D34]" />
                <div>
                  <span className="font-bold">{bankInfo.bank}</span> — {bankInfo.branch}
                </div>
              </div>
            )}

            {/* Cheque / Passbook Document */}
            <div className="pt-2">
              <DocumentUploader
                label={t('onboarding.chequeDocLabel', { defaultValue: 'Cancelled Cheque or Bank Passbook Copy' })}
                description={t('onboarding.chequeDocDesc', {
                  defaultValue: 'Upload a document clearly displaying account number, IFSC code, and account holder name.',
                })}
                documentType="cheque_passbook"
                required
                value={chequeDoc}
                onChange={setChequeDoc}
                error={fieldErrors['cheque_document_id']}
              />
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 5: REVIEW AND SUBMISSION                                       */}
        {/* =================================================================== */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="border-b border-[#EAE5DB] pb-4">
              <h2 className="font-serif text-xl font-bold text-[#223B28]">
                {t('onboarding.step5Title', { defaultValue: '5. Review Application & Final Submission' })}
              </h2>
              <p className="text-xs text-[#637365]">
                {t('onboarding.step5Desc', {
                  defaultValue: 'Carefully review your artisan profile and compliance details before sending to verification.',
                })}
              </p>
            </div>

            {/* Summary Card 1: Store Identity */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDetailSection(1)}
              onKeyDown={(e) => e.key === 'Enter' && setDetailSection(1)}
              className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-3 cursor-pointer hover:border-[#2E4D34]/40 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2E4D34] uppercase tracking-wider">
                  <Store className="w-4 h-4" />
                  <span>1. Store Identity</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep(1);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#2E4D34] hover:underline font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#223B28]">
                <div>
                  <span className="text-[#7A8A7C]">Store Name:</span>{' '}
                  <strong className="font-semibold">{storeName || '—'}</strong>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Store URL:</span>{' '}
                  <span className="font-mono text-[#2E4D34]">chillyflakes.in/store/{storeSlug || '—'}</span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Seller Type:</span>{' '}
                  <span className="capitalize">{sellerType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Languages:</span> {selectedLanguages.join(', ')}
                </div>
              </div>
            </div>

            {/* Summary Card 2: Pickup Address */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDetailSection(2)}
              onKeyDown={(e) => e.key === 'Enter' && setDetailSection(2)}
              className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-3 cursor-pointer hover:border-[#2E4D34]/40 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2E4D34] uppercase tracking-wider">
                  <MapPin className="w-4 h-4" />
                  <span>2. Courier Pickup Address</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep(2);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#2E4D34] hover:underline font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="text-xs text-[#223B28] space-y-1">
                <p>
                  <strong className="font-semibold">{pickupContact}</strong> ({pickupMobile})
                </p>
                <p className="text-[#637365]">
                  {pickupLine1}
                  {pickupLine2 ? `, ${pickupLine2}` : ''}, {pickupCity}, {pickupState} - {pickupPincode}
                </p>
              </div>
            </div>

            {/* Summary Card 3: Verification (KYC) */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDetailSection(3)}
              onKeyDown={(e) => e.key === 'Enter' && setDetailSection(3)}
              className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-3 cursor-pointer hover:border-[#2E4D34]/40 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2E4D34] uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  <span>3. KYC Credentials</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep(3);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#2E4D34] hover:underline font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#223B28]">
                <div>
                  <span className="text-[#7A8A7C]">PAN:</span>{' '}
                  <span className="font-mono font-semibold">
                    {panNumber ? panNumber.toUpperCase() : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">GSTIN:</span>{' '}
                  <span className="font-mono">{gstin || 'Exempt / Not provided'}</span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">ID Proof:</span>{' '}
                  <span className="capitalize">{idType.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Documents Attached:</span>{' '}
                  <span className="text-[#2E4D34] font-semibold">
                    {[panDoc, idDoc, addressDoc, artisanCardDoc].filter(Boolean).length} Files Attached
                  </span>
                </div>
              </div>
            </div>

            {/* Summary Card 4: Bank Details */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => setDetailSection(4)}
              onKeyDown={(e) => e.key === 'Enter' && setDetailSection(4)}
              className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EAE5DB] space-y-3 cursor-pointer hover:border-[#2E4D34]/40 hover:shadow-md transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2E4D34] uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>4. Payout Bank Account</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentStep(4);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-[#2E4D34] hover:underline font-bold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#223B28]">
                <div>
                  <span className="text-[#7A8A7C]">Account Holder:</span>{' '}
                  <strong className="font-semibold">{accHolderName || '—'}</strong>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Account Number:</span>{' '}
                  <span className="font-mono font-semibold">
                    {existingMaskedAcc || (accNumber ? `••••••••${accNumber.slice(-4)}` : '—')}
                  </span>
                </div>
                <div>
                  <span className="text-[#7A8A7C]">Bank:</span> {bankInfo?.bank || 'Commercial Bank'}
                </div>
                <div>
                  <span className="text-[#7A8A7C]">IFSC:</span> <span className="font-mono">{ifscCode}</span>
                </div>
              </div>
              <p className="text-[10px] text-[#8E9B90] inline-flex items-center gap-1">
                <Eye className="w-3 h-3" /> Click any card to view full details
              </p>
            </div>

            {/* Seller Agreement Acceptance Checkbox */}
            <div className="p-4 rounded-2xl bg-white border-2 border-[#D1DDD0] space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedAgreement}
                  onChange={(e) => setAcceptedAgreement(e.target.checked)}
                  className="w-5 h-5 rounded text-[#2E4D34] focus:ring-[#2E4D34] border-[#D1DDD0] mt-0.5 flex-shrink-0"
                />
                <span className="text-xs text-[#223B28] leading-relaxed">
                  {t('onboarding.agreementText', {
                    defaultValue:
                      'I hereby certify that all products listed on ChillyFlakes are authentically handcrafted, ethically produced, and accurately represented. I accept the Seller Agreement, Fee Schedule, and KYC Data Privacy Policy.',
                  })}
                </span>
              </label>
              {fieldErrors['accepted_agreement'] && (
                <p className="text-xs text-[#DC2626] font-semibold pl-8">
                  {fieldErrors['accepted_agreement']}
                </p>
              )}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* BOTTOM NAVIGATION ACTIONS                                           */}
        {/* =================================================================== */}
        {generalError && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-[#FFF5F5] border border-[#FCA5A5] text-xs text-[#B91C1C] flex items-start gap-2 mt-6"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="whitespace-pre-line">{generalError}</span>
          </div>
        )}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-6 border-t border-[#EAE5DB]">
          {/* Back button */}
          {currentStep > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCurrentStep((prev) => prev - 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('common.back', { defaultValue: 'Back' })}
            </Button>
          ) : (
            <div />
          )}

          {/* Right Action: Next or Final Submit */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {currentStep === 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleSkipStep1()}
                isLoading={saveStepMutation.isPending}
                className="border-[#D1DDD0] text-[#4F6151] hover:bg-[#F2EFE9]"
              >
                {t('onboarding.skipStep1', { defaultValue: 'Skip this step' })}
              </Button>
            )}

            {currentStep < TOTAL_STEPS ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => void saveCurrentStepData(true)}
                isLoading={saveStepMutation.isPending}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('common.saveAndContinue', { defaultValue: 'Save & Next' })}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSubmitFinal()}
                isLoading={submitMutation.isPending}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
                className="bg-[#2E4D34] hover:bg-[#1F3524] px-6"
              >
                {t('onboarding.submitForApproval', { defaultValue: 'Submit for Approval' })}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION DETAIL POPUP (Step 5 cards)                                   */}
      {/* ===================================================================== */}
      {detailSection && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDetailSection(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-[#EAE5DB] shadow-2xl overflow-hidden animate-scaleUp"
          >
            <div className="px-6 py-4 border-b border-[#EAE5DB] bg-[#FDFCF9] flex items-center justify-between shrink-0">
              <h3 className="font-serif text-lg font-bold text-[#223B28]">
                {
                  {
                    1: '1. Store Identity',
                    2: '2. Courier Pickup Address',
                    3: '3. KYC Credentials',
                    4: '4. Payout Bank Account',
                  }[detailSection]
                }
              </h3>
              <button
                type="button"
                onClick={() => setDetailSection(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm text-[#223B28]">
              {(() => {
                const Row = ({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) => (
                  <div className="grid grid-cols-3 gap-3 py-2 border-b border-[#F0EDE6] last:border-0">
                    <span className="text-xs text-[#7A8A7C] font-semibold uppercase tracking-wider">{label}</span>
                    <span className={`col-span-2 text-sm break-words ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
                  </div>
                );
                const DocTile = ({ label, doc }: { label: string; doc: UploadedDocument | null }) => {
                  const url = doc ? docUrls[doc.id] : undefined;
                  const isPdf = doc ? doc.type === 'application/pdf' || /\.pdf$/i.test(doc.filename || '') : false;
                  return (
                    <div className="rounded-2xl border border-[#EAE5DB] bg-[#FAF7F2] p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#223B28]">{label}</span>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-[#2E4D34] hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Open
                          </a>
                        )}
                      </div>
                      {!doc ? (
                        <p className="text-xs text-[#8E9B90]">Not uploaded</p>
                      ) : (
                        <>
                          <div className="h-36 rounded-xl bg-white border border-[#EAE5DB] overflow-hidden flex items-center justify-center">
                            {url && !isPdf ? (
                              <img src={url} alt={label} className="w-full h-full object-contain" />
                            ) : (
                              <div className="flex flex-col items-center text-[#2E4D34] gap-1">
                                <FileText className="w-8 h-8" />
                                <span className="text-[11px]">{isPdf ? 'PDF document' : 'Loading preview…'}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-[#7A8A7C] truncate">
                            {doc.filename} {doc.size ? `• ${(doc.size / 1024).toFixed(0)} KB` : ''}
                          </p>
                        </>
                      )}
                    </div>
                  );
                };

                if (detailSection === 1) {
                  return (
                    <>
                      <div>
                        <Row label="Store Name" value={storeName} />
                        <Row label="Store URL" value={`chillyflakes.in/store/${storeSlug || '—'}`} mono />
                        <Row label="Seller Type" value={<span className="capitalize">{sellerType.replace(/_/g, ' ')}</span>} />
                        <Row label="Languages" value={selectedLanguages.join(', ')} />
                        <Row label="Short Description" value={shortDescription} />
                        <Row label="Seller Story" value={sellerStory && <span className="whitespace-pre-line">{sellerStory}</span>} />
                        <Row label="Instagram" value={instagram} />
                        <Row label="Facebook" value={facebook} />
                        <Row label="Website" value={website} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DocTile label="Store Logo" doc={logoDoc} />
                        <DocTile label="Store Banner" doc={bannerDoc} />
                      </div>
                    </>
                  );
                }
                if (detailSection === 2) {
                  return (
                    <>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2E4D34] mb-1">Pickup Address</p>
                        <Row label="Contact Person" value={pickupContact} />
                        <Row label="Courier Mobile" value={pickupMobile} mono />
                        <Row label="Address Line 1" value={pickupLine1} />
                        <Row label="Address Line 2" value={pickupLine2} />
                        <Row label="City" value={pickupCity} />
                        <Row label="State" value={pickupState} />
                        <Row label="Pincode" value={pickupPincode} mono />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#2E4D34] mb-1">Business Address</p>
                        {sameAsBusiness ? (
                          <p className="text-xs text-[#637365]">Same as pickup address</p>
                        ) : (
                          <>
                            <Row label="Contact Person" value={bizContact} />
                            <Row label="Mobile" value={bizMobile} mono />
                            <Row label="Address" value={[bizLine1, bizLine2].filter(Boolean).join(', ')} />
                            <Row label="City / State" value={[bizCity, bizState].filter(Boolean).join(', ')} />
                            <Row label="Pincode" value={bizPincode} mono />
                          </>
                        )}
                      </div>
                    </>
                  );
                }
                if (detailSection === 3) {
                  return (
                    <>
                      <div>
                        <Row label="PAN Number" value={panNumber.toUpperCase()} mono />
                        <Row label="GSTIN" value={gstin.toUpperCase() || 'Exempt / Not provided'} mono />
                        <Row label="ID Proof Type" value={<span className="capitalize">{idType.replace(/_/g, ' ')}</span>} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <DocTile label="PAN Card" doc={panDoc} />
                        <DocTile label="Identity Proof" doc={idDoc} />
                        <DocTile label="Address Proof" doc={addressDoc} />
                        <DocTile label="Artisan Card (optional)" doc={artisanCardDoc} />
                      </div>
                    </>
                  );
                }
                return (
                  <>
                    <div>
                      <Row label="Account Holder" value={accHolderName} />
                      <Row
                        label="Account Number"
                        value={accNumber || existingMaskedAcc}
                        mono
                      />
                      <Row label="Account Type" value={<span className="capitalize">{accType}</span>} />
                      <Row label="IFSC Code" value={ifscCode.toUpperCase()} mono />
                      <Row label="Bank" value={bankInfo?.bank} />
                      <Row label="Branch" value={bankInfo?.branch} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DocTile label="Cancelled Cheque / Passbook" doc={chequeDoc} />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="px-6 py-4 border-t border-[#EAE5DB] bg-[#FAF7F2] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDetailSection(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5F6D61] hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = detailSection;
                  setDetailSection(null);
                  setCurrentStep(s);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#2E4D34] text-white text-xs font-semibold hover:bg-[#233B28]"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit this section
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SUBMIT SUCCESS POPUP                                                  */}
      {/* ===================================================================== */}
      {submitSuccess && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="bg-white rounded-3xl max-w-md w-full border border-emerald-200 shadow-2xl overflow-hidden animate-scaleUp text-center">
            <div className="p-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-[#223B28]">Application Submitted!</h2>
              <p className="text-sm text-[#5F6D61] leading-relaxed">
                Thank you{user?.full_name ? `, ${user.full_name}` : ''}. Your store application has been sent to our compliance team
                for verification. Reviews usually complete within 24–48 hours.
              </p>
              <p className="text-xs text-[#8E9B90]">
                You'll get a notification here and an email at <strong>{user?.email}</strong> once a decision is made.
              </p>
            </div>
            <div className="px-6 py-4 bg-[#FAF7F2] border-t border-[#EAE5DB]">
              <button
                type="button"
                onClick={() => void finishSubmission()}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2E4D34] text-white text-sm font-semibold hover:bg-[#233B28]"
              >
                View Application Status <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOnboardingPage;
