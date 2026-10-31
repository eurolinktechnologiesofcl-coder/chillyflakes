import { http, HttpResponse, delay, passthrough } from 'msw';
import { adminHandlers, currentAdminUser } from './adminHandlers';
import { onboardingHandlers } from './onboardingHandlers';
import { buyerAuthHandlers } from './buyerAuthHandlers';
import { loadPersisted, registerPersisted } from './persist';
import { getPlatformSettings } from '../utils/platformSync';
import { products as initialProducts } from '../data/products';
import type { Product } from '../types';
import {
  ALLOWED_CATEGORY_IDS,
  type VendorRegisterPayload,
  type VendorLoginPayload,
  type VendorUser,
  type VendorStatus,
  type CheckAvailabilityPayload,
  type VerifyOtpPayload,
  type ResendOtpPayload,
} from '../types/auth';

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length < 2) return email;
  const user = parts[0];
  const domain = parts[1];
  const prefix = user.slice(0, 2);
  return `${prefix}***@${domain}`;
}

function maskMobile(mobile: string): string {
  const clean = mobile.replace(/\D/g, '');
  if (clean.length < 4) return mobile;
  const start = clean.slice(0, 2);
  const end = clean.slice(-2);
  return `+91 ${start}XXXXXX${end}`;
}

interface PendingRegistrationState {
  fullName: string;
  email: string;
  mobile: string;
  businessName?: string;
  maskedEmail: string;
  maskedMobile: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  emailAttempts: number;
  mobileAttempts: number;
  emailLockedUntil: number | null;
  mobileLockedUntil: number | null;
  emailResends: number;
  mobileResends: number;
  emailResendAvailableAt: number;
  mobileResendAvailableAt: number;
}

interface PasswordResetSessionState {
  identifier: string;
  masked: string;
  step: 'verify' | 'new_password';
  attempts: number;
  lockedUntil: number | null;
  resends: number;
  resendAvailableAt: number;
}

// In-memory mock session state
let mockCurrentVendor: VendorUser | null = null;
let mockPendingRegistration: PendingRegistrationState | null = null;
let mockResetSession: PasswordResetSessionState | null = null;
const MOCK_PASSWORDS: Record<string, string> = {};

const MOCK_CREDENTIALS: Record<
  string,
  { status: VendorStatus; fullName: string; storeName: string; mobile: string }
> = {
  'pending@test.com': {
    status: 'pending_verification',
    fullName: 'Priya Nair',
    storeName: 'Malabar Clay Arts',
    mobile: '9876543211',
  },
  'new@test.com': {
    status: 'onboarding_incomplete',
    fullName: 'Arjun Das',
    storeName: 'Kerala Spice Garden',
    mobile: '9876543212',
  },
  'review@test.com': {
    status: 'under_review',
    fullName: 'Lakshmi Menon',
    storeName: 'Handmade Silk & Linen',
    mobile: '9876543213',
  },
  'rejected@test.com': {
    status: 'rejected',
    fullName: 'Karthik Raja',
    storeName: 'Artisan Wood Craft',
    mobile: '9876543214',
  },
  'suspended@test.com': {
    status: 'suspended',
    fullName: 'Ananya Sharma',
    storeName: 'Botanical Herbs & Soaps',
    mobile: '9876543215',
  },
  'approved@test.com': {
    status: 'approved',
    fullName: 'Pooja Hegde',
    storeName: 'Chilly Earth Pottery',
    mobile: '9876543210',
  },
  '9876543210': {
    status: 'approved',
    fullName: 'Pooja Hegde',
    storeName: 'Chilly Earth Pottery',
    mobile: '9876543210',
  },
  'new-empty@test.com': {
    status: 'approved',
    fullName: 'Ravi Kumar',
    storeName: 'Kaveri Terracotta Works',
    mobile: '9876543299',
  },
  '9876543299': {
    status: 'approved',
    fullName: 'Ravi Kumar',
    storeName: 'Kaveri Terracotta Works',
    mobile: '9876543299',
  },
};

import type { VendorProduct, VendorProductPayload } from '../types/product';
import { vendorCategoriesWithAttributes } from '../data/categoryAttributes';
import type {
  AdminCategory,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  VendorCategoryWithAttributes,
} from '../types/categoryAttributes';
import type {
  AdminProductDetail,
  AdminProductReviewLog,
  RejectReasonCode,
  AdminProductColorGallery,
  AdminProductVariant,
  AdminProductSellerInfo,
  AdminProductListItem,
  AdminApprovePayload,
} from '../types/adminProduct';

export let dynamicVendorCategories: VendorCategoryWithAttributes[] = loadPersisted<VendorCategoryWithAttributes[]>(
  'vendor_categories',
  JSON.parse(JSON.stringify(vendorCategoriesWithAttributes))
);
registerPersisted('vendor_categories', () => dynamicVendorCategories);

export let mockCategories: AdminCategory[] = loadPersisted<AdminCategory[]>(
  'admin_categories',
  dynamicVendorCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug || c.id,
    description: c.description,
    subcategories: [...c.subcategories],
    is_active: c.is_active ?? true,
    product_count: 0,
    created_at: '2026-08-01T00:00:00Z',
  }))
);
registerPersisted('admin_categories', () => mockCategories);

export let mockVendorAlerts: Array<{
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  created_at: string;
}> = [];

export type MockProductRecord = VendorProduct & AdminProductDetail;

export function createProductRecord(
  base: Omit<VendorProduct, 'colors'> & {
    colors?: { name: string; hex: string }[];
    mrp_paise?: number;
    gst_rate_percent?: number;
    wholesale_tiers?: { min_quantity: number; unit_price_paise: number }[];
    shipping_weight_grams?: number;
    shipping_dimensions?: { length_cm: number; width_cm: number; height_cm: number };
    attributes?: Record<string, string>;
    tags?: string[];
    title_i18n?: { en: string; ml?: string; ta?: string; hi?: string; kn?: string };
    description_i18n?: { en: string; ml?: string; ta?: string; hi?: string; kn?: string };
    color_galleries?: AdminProductColorGallery[];
    video_url?: string;
    variants?: AdminProductVariant[];
    seller?: AdminProductSellerInfo;
    submitted_at?: string;
    review_history?: AdminProductReviewLog[];
  }
): MockProductRecord {
  const colors =
    base.colors ||
    (base.color_galleries
      ? base.color_galleries.map((g) => ({ name: g.color_name, hex: g.hex }))
      : []);

  const seller: AdminProductSellerInfo = base.seller || {
    seller_id: 'v_101',
    store_name: 'Kaveri Terracotta Works',
    seller_name: 'Lakshmi Narayan',
    email: 'lakshmi@kavericlay.in',
    mobile_masked: '+91 98765 •••••',
    seller_status: 'approved',
  };

  const title_i18n = base.title_i18n || {
    en: base.title,
    hi: `${base.title} (हिंदी)`,
    ml: `${base.title} (മലയാളം)`,
    ta: `${base.title} (தமிழ்)`,
    kn: `${base.title} (ಕನ್ನಡ)`,
  };

  const description_i18n = base.description_i18n || {
    en: `Handcrafted with care by rural artisans using traditional eco-conscious methods. Features authentic craftsmanship, durable build, and organic sustainable materials. SKU: ${base.sku}.`,
    hi: 'पारंपरिक तरीकों का उपयोग करके ग्रामीण कारीगरों द्वारा हस्तनिर्मित। पर्यावरण के अनुकूल और प्रामाणिक कारीगरी।',
    ml: 'പരമ്പരാഗത ശൈലിയിൽ കരകൗശല വിദഗ്ദ്ധർ നിർമ്മിച്ച ഉത്പന്നം. പ്രകൃതി സൗഹൃദവും ഗുണമേന്മയുള്ളതുമാണ്.',
    ta: 'பாரம்பரிய கைவினைஞர்களால் நேர்த்தியாக உருவாக்கப்பட்ட இயற்கை தயாரிப்பு.',
    kn: 'ಪಾರಂಪರಿಕ ವಿಧಾನಗಳನ್ನು ಬಳಸಿ ಗ್ರಾಮೀಣ ಕುಶಲಕರ್ಮಿಗಳು ತಯಾರಿಸಿದ ಪರಿಸರ ಸ್ನೇಹಿ ಉತ್ಪನ್ನ.',
  };

  const color_galleries =
    base.color_galleries ||
    (colors.length > 0
      ? colors.map((c) => ({
          color_name: c.name,
          hex: c.hex,
          images: [
            base.main_image_url,
            'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
            'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
          ],
        }))
      : [
          {
            color_name: 'Natural',
            hex: '#B8A89A',
            images: [
              base.main_image_url,
              'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
            ],
          },
        ]);

  const variants =
    base.variants ||
    (colors.length > 0
      ? colors.map((c, i) => ({
          sku: `${base.sku}-C${i + 1}`,
          color_name: c.name,
          size: 'Standard',
          stock: Math.max(1, Math.floor(base.total_stock / colors.length)),
          price_paise: base.price_paise,
        }))
      : [
          {
            sku: `${base.sku}-STD`,
            color_name: 'Natural',
            size: 'Standard',
            stock: base.total_stock,
            price_paise: base.price_paise,
          },
        ]);

  return {
    ...base,
    colors,
    mrp_paise: base.mrp_paise || Math.round(base.price_paise * 1.25),
    gst_rate_percent: base.gst_rate_percent || 12,
    wholesale_tiers:
      base.wholesale_tiers ||
      (base.wholesale_enabled
        ? [
            { min_quantity: 10, unit_price_paise: Math.round(base.price_paise * 0.85) },
            { min_quantity: 25, unit_price_paise: Math.round(base.price_paise * 0.75) },
          ]
        : undefined),
    shipping_weight_grams: base.shipping_weight_grams || 650,
    shipping_dimensions: base.shipping_dimensions || { length_cm: 22, width_cm: 18, height_cm: 12 },
    attributes: base.attributes || {
      'Craft Style': 'Traditional Artisan Handmade',
      Material: 'Organic Sustainable Source',
      Origin: 'Karnataka, India',
      'Care Instructions': 'Wipe clean with a soft dry cloth. Keep away from harsh moisture.',
    },
    tags: base.tags || ['Handcrafted', 'Eco-friendly', 'Artisan Guild', 'ChillyFlakes Verified'],
    title_i18n,
    description_i18n,
    color_galleries,
    variants,
    seller,
    submitted_at: base.submitted_at || base.updated_at,
    review_history: base.review_history || [],
  };
}

export const mockVendorProducts: MockProductRecord[] = loadPersisted<MockProductRecord[]>('vendor_products', []);
registerPersisted('vendor_products', () => mockVendorProducts);

const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Only pass through auth to the local backend when running on localhost AND VITE_USE_MOCKS_AUTH is explicitly false.
// On cloud deployments like Vercel previews (*.vercel.app), serve all mocks so the demo operates seamlessly.
const passAuthThroughToBackend =
  isLocalhost && import.meta.env.VITE_USE_MOCKS_AUTH === 'false';

// Real Node.js API for shopper authentication (works on any host, incl. production)
const useRealBuyerAuth = import.meta.env.VITE_BUYER_AUTH_API === 'true';

export const handlers = [
  // Always pass through real backend endpoints to Node.js/Express
  http.all('*/api/v1/admin/*', () => passthrough()),
  http.all('*/api/v1/admin/**', () => passthrough()),
  http.all('*/api/v1/orders/*', () => passthrough()),
  http.all('*/api/v1/orders/**', () => passthrough()),
  http.all('*/api/orders/*', () => passthrough()),
  http.all('*/api/orders/**', () => passthrough()),
  http.all('*/api/v1/coupons/*', () => passthrough()),
  http.all('*/api/v1/coupons/**', () => passthrough()),
  http.all('*/api/coupons/*', () => passthrough()),
  http.all('*/api/coupons/**', () => passthrough()),
  http.all('*/api/v1/products/*', () => passthrough()),
  http.all('*/api/v1/products/**', () => passthrough()),
  http.all('*/api/products/*', () => passthrough()),
  http.all('*/api/products/**', () => passthrough()),
  http.all('*/api/v1/categories/*', () => passthrough()),
  http.all('*/api/v1/categories/**', () => passthrough()),
  http.all('*/api/categories/*', () => passthrough()),
  http.all('*/api/categories/**', () => passthrough()),
  http.all('*/api/v1/upload/*', () => passthrough()),
  http.all('*/api/v1/upload/**', () => passthrough()),
  http.all('*/api/v1/csrf/*', () => passthrough()),
  http.all('*/api/v1/csrf/**', () => passthrough()),

  ...(useRealBuyerAuth
    ? [
        http.all('*/api/v1/buyer/auth/*', () => passthrough()),
        http.all('*/api/v1/buyer/auth/**', () => passthrough()),
      ]
    : []),

  // When running locally with a real backend, pass vendor auth and CSRF through to it
  ...(passAuthThroughToBackend
    ? [
        http.all('*/api/v1/csrf/', () => passthrough()),
        http.all('*/api/v1/vendor/auth/*', () => passthrough()),
        http.all('*/api/v1/vendor/auth/**', () => passthrough()),
      ]
    : []),

  ...adminHandlers,
  ...onboardingHandlers,
  ...buyerAuthHandlers,

  // 0. GET /api/v1/csrf/
  http.get('*/api/v1/csrf/', async () => {
    return HttpResponse.json(
      { detail: 'ok' },
      {
        headers: {
          'X-CSRFToken': 'mock-csrf-token-live',
        },
      }
    );
  }),

  // 1. POST /api/v1/vendor/auth/check-availability/
  http.post('*/api/v1/vendor/auth/check-availability/', async ({ request }) => {
    await delay(600);

    const body = (await request.json()) as Partial<CheckAvailabilityPayload>;
    const channel = body.channel;
    const value = (body.value || '').trim();

    if (channel === 'email') {
      if (value.toLowerCase() === 'taken@test.com') {
        return HttpResponse.json({ available: false }, { status: 200 });
      }
      return HttpResponse.json({ available: true }, { status: 200 });
    }

    if (channel === 'mobile') {
      const cleanMobile = value.replace(/\D/g, '');
      if (cleanMobile === '9999999999') {
        return HttpResponse.json({ available: false }, { status: 200 });
      }
      return HttpResponse.json({ available: true }, { status: 200 });
    }

    return HttpResponse.json({ available: true }, { status: 200 });
  }),

  // 2. POST /api/v1/vendor/auth/register/
  http.post('*/api/v1/vendor/auth/register/', async ({ request }) => {
    await delay(600);

    if (getPlatformSettings().system_flags?.seller_registration_open === false) {
      return HttpResponse.json(
        { code: 'registration_closed', message: 'New seller registrations are currently closed by the marketplace administrator.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Partial<VendorRegisterPayload>;
    const email = (body.email || '').toLowerCase().trim();
    const mobile = (body.mobile || '').trim();

    if (email === 'taken@test.com') {
      return HttpResponse.json(
        {
          code: 'already_registered',
          message: 'This email is already registered.',
          fieldErrors: {
            email: ['This email is already registered. Login instead'],
          },
        },
        { status: 400 }
      );
    }

    if (mobile === '9999999999') {
      return HttpResponse.json(
        {
          code: 'already_registered',
          message: 'This mobile number is already registered.',
          fieldErrors: {
            mobile: ['This mobile number is already registered. Login instead'],
          },
        },
        { status: 400 }
      );
    }

    if (body.categories && Array.isArray(body.categories)) {
      const invalidCat = body.categories.find(
        (cat) => !ALLOWED_CATEGORY_IDS.includes(cat as (typeof ALLOWED_CATEGORY_IDS)[number])
      );
      if (invalidCat) {
        return HttpResponse.json(
          {
            code: 'validation_error',
            message: 'Please fix the errors',
            fieldErrors: {
              categories: [`Invalid category: '${invalidCat}'. Must be one of the 8 supported categories.`],
            },
          },
          { status: 400 }
        );
      }
    }

    const maskedEmail = maskEmail(email);
    const maskedMobile = maskMobile(mobile);

    // Save pending registration in memory
    mockPendingRegistration = {
      fullName: body.full_name || 'Artisan Seller',
      email,
      mobile,
      businessName: body.business_name,
      maskedEmail,
      maskedMobile,
      emailVerified: false,
      mobileVerified: false,
      emailAttempts: 0,
      mobileAttempts: 0,
      emailLockedUntil: null,
      mobileLockedUntil: null,
      emailResends: 0,
      mobileResends: 0,
      emailResendAvailableAt: Date.now() + 30000,
      mobileResendAvailableAt: Date.now() + 30000,
    };

    return HttpResponse.json(
      {
        message: 'Account created. OTP sent to your email and mobile.',
        masked_email: maskedEmail,
        masked_mobile: maskedMobile,
      },
      { status: 201 }
    );
  }),

  // 3. GET /api/v1/vendor/auth/verification-status/
  http.get('*/api/v1/vendor/auth/verification-status/', async () => {
    await delay(600);

    if (!mockPendingRegistration) {
      return HttpResponse.json(
        {
          code: 'no_pending_registration',
          message: 'No pending registration found.',
        },
        { status: 401 }
      );
    }

    const now = Date.now();
    const emailResendIn = Math.max(0, Math.ceil((mockPendingRegistration.emailResendAvailableAt - now) / 1000));
    const mobileResendIn = Math.max(0, Math.ceil((mockPendingRegistration.mobileResendAvailableAt - now) / 1000));

    return HttpResponse.json(
      {
        mobile: {
          masked: mockPendingRegistration.maskedMobile,
          verified: mockPendingRegistration.mobileVerified,
          resend_available_in: mobileResendIn,
        },
        email: {
          masked: mockPendingRegistration.maskedEmail,
          verified: mockPendingRegistration.emailVerified,
          resend_available_in: emailResendIn,
        },
        all_verified: mockPendingRegistration.emailVerified,
      },
      { status: 200 }
    );
  }),

  // 4. POST /api/v1/vendor/auth/verify-otp/
  http.post('*/api/v1/vendor/auth/verify-otp/', async ({ request }) => {
    await delay(600);

    if (!mockPendingRegistration) {
      return HttpResponse.json(
        {
          code: 'no_pending_registration',
          message: 'No pending registration found.',
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Partial<VerifyOtpPayload>;
    const channel = body.channel;
    const otp = (body.otp || '').trim();
    const now = Date.now();

    if (channel !== 'mobile' && channel !== 'email') {
      return HttpResponse.json(
        { code: 'invalid_channel', message: 'Channel must be mobile or email.' },
        { status: 400 }
      );
    }

    // Check lock state
    const lockedUntil = channel === 'mobile'
      ? mockPendingRegistration.mobileLockedUntil
      : mockPendingRegistration.emailLockedUntil;

    if (lockedUntil && lockedUntil > now) {
      const remainingSeconds = Math.ceil((lockedUntil - now) / 1000);
      return HttpResponse.json(
        {
          code: 'too_many_attempts',
          message: `Too many attempts. Channel locked. Try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
          retry_after_seconds: remainingSeconds,
        },
        { status: 429 }
      );
    }

    // Check test codes
    if (otp === '000000') {
      if (channel === 'mobile') mockPendingRegistration.mobileAttempts += 1;
      else mockPendingRegistration.emailAttempts += 1;

      const attempts = channel === 'mobile'
        ? mockPendingRegistration.mobileAttempts
        : mockPendingRegistration.emailAttempts;

      if (attempts >= 5) {
        const lockDuration = 900; // 15 mins
        if (channel === 'mobile') mockPendingRegistration.mobileLockedUntil = now + lockDuration * 1000;
        else mockPendingRegistration.emailLockedUntil = now + lockDuration * 1000;

        return HttpResponse.json(
          {
            code: 'too_many_attempts',
            message: 'Too many attempts. Channel locked for 15 minutes.',
            retry_after_seconds: lockDuration,
          },
          { status: 429 }
        );
      }

      return HttpResponse.json(
        { code: 'invalid_otp', message: 'Invalid OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    if (otp === '111111') {
      return HttpResponse.json(
        { code: 'otp_expired', message: 'This OTP has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // Success codes: mobile is '123456', email is '654321'
    const isMobileMatch = channel === 'mobile' && otp === '123456';
    const isEmailMatch = channel === 'email' && otp === '654321';

    if (isMobileMatch) {
      mockPendingRegistration.mobileVerified = true;
      mockPendingRegistration.mobileAttempts = 0;
      mockPendingRegistration.mobileLockedUntil = null;
    } else if (isEmailMatch) {
      mockPendingRegistration.emailVerified = true;
      mockPendingRegistration.emailAttempts = 0;
      mockPendingRegistration.emailLockedUntil = null;
    } else {
      // Wrong OTP
      if (channel === 'mobile') mockPendingRegistration.mobileAttempts += 1;
      else mockPendingRegistration.emailAttempts += 1;

      const attempts = channel === 'mobile'
        ? mockPendingRegistration.mobileAttempts
        : mockPendingRegistration.emailAttempts;

      if (attempts >= 5) {
        const lockDuration = 900;
        if (channel === 'mobile') mockPendingRegistration.mobileLockedUntil = now + lockDuration * 1000;
        else mockPendingRegistration.emailLockedUntil = now + lockDuration * 1000;

        return HttpResponse.json(
          {
            code: 'too_many_attempts',
            message: 'Too many attempts. Channel locked for 15 minutes.',
            retry_after_seconds: lockDuration,
          },
          { status: 429 }
        );
      }

      return HttpResponse.json(
        { code: 'invalid_otp', message: 'Invalid OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    const allVerified = mockPendingRegistration.mobileVerified && mockPendingRegistration.emailVerified;

    if (allVerified) {
      // Mark mock vendor status as onboarding_incomplete and log user in
      mockCurrentVendor = {
        id: `v_${Date.now()}`,
        full_name: mockPendingRegistration.fullName,
        email: mockPendingRegistration.email,
        mobile_masked: mockPendingRegistration.maskedMobile,
        vendor_status: 'onboarding_incomplete',
        store_name: mockPendingRegistration.businessName || 'Artisan Workshop',
      };
    }

    return HttpResponse.json(
      {
        channel,
        verified: true,
        all_verified: allVerified,
      },
      { status: 200 }
    );
  }),

  // 5. POST /api/v1/vendor/auth/resend-otp/
  http.post('*/api/v1/vendor/auth/resend-otp/', async ({ request }) => {
    await delay(600);

    if (!mockPendingRegistration) {
      return HttpResponse.json(
        {
          code: 'no_pending_registration',
          message: 'No pending registration found.',
        },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Partial<ResendOtpPayload>;
    const channel = body.channel;
    const now = Date.now();

    if (channel !== 'mobile' && channel !== 'email') {
      return HttpResponse.json(
        { code: 'invalid_channel', message: 'Channel must be mobile or email.' },
        { status: 400 }
      );
    }

    // Check resend too soon
    const resendAt = channel === 'mobile'
      ? mockPendingRegistration.mobileResendAvailableAt
      : mockPendingRegistration.emailResendAvailableAt;

    if (resendAt && resendAt > now) {
      const waitSec = Math.ceil((resendAt - now) / 1000);
      return HttpResponse.json(
        {
          code: 'resend_too_soon',
          message: `Please wait ${waitSec} seconds before requesting another code.`,
          retry_after_seconds: waitSec,
        },
        { status: 429 }
      );
    }

    // Track resends
    if (channel === 'mobile') {
      mockPendingRegistration.mobileResends += 1;
      if (mockPendingRegistration.mobileResends >= 4) {
        return HttpResponse.json(
          {
            code: 'too_many_resends',
            message: 'Maximum OTP resend limit reached for mobile. Please try again in one hour.',
            retry_after_seconds: 3600,
          },
          { status: 429 }
        );
      }
      mockPendingRegistration.mobileAttempts = 0;
      mockPendingRegistration.mobileLockedUntil = null;
      mockPendingRegistration.mobileResendAvailableAt = now + 30000;
    } else {
      mockPendingRegistration.emailResends += 1;
      if (mockPendingRegistration.emailResends >= 4) {
        return HttpResponse.json(
          {
            code: 'too_many_resends',
            message: 'Maximum OTP resend limit reached for email. Please try again in one hour.',
            retry_after_seconds: 3600,
          },
          { status: 429 }
        );
      }
      mockPendingRegistration.emailAttempts = 0;
      mockPendingRegistration.emailLockedUntil = null;
      mockPendingRegistration.emailResendAvailableAt = now + 30000;
    }

    return HttpResponse.json({ resend_available_in: 30 }, { status: 200 });
  }),

  // 6. POST /api/v1/vendor/auth/login/
  http.post('*/api/v1/vendor/auth/login/', async ({ request }) => {
    await delay(600);

    const body = (await request.json()) as Partial<VendorLoginPayload>;
    const rawIdentifier = (body.identifier || '').trim().toLowerCase();
    const password = body.password || '';

    // Check account lockout scenario
    if (rawIdentifier === 'locked@test.com') {
      return HttpResponse.json(
        {
          code: 'account_locked',
          message: 'Too many attempts. Account locked temporarily.',
          retry_after_seconds: 600,
        },
        { status: 429 }
      );
    }

    // Check valid credentials: password must match updated password or default "Test@123"
    const matched = MOCK_CREDENTIALS[rawIdentifier];
    const expectedPassword =
      MOCK_PASSWORDS[rawIdentifier] ||
      (matched ? MOCK_PASSWORDS[matched.mobile] : undefined) ||
      'Test@123';

    if (matched && password === expectedPassword) {
      const user: VendorUser = {
        id: `v_${rawIdentifier.replace(/[^a-zA-Z0-9]/g, '_')}`,
        full_name: matched.fullName,
        email: rawIdentifier.includes('@') ? rawIdentifier : 'vendor@chillyflakes.in',
        mobile_masked: `+91 ******${matched.mobile.slice(-4)}`,
        vendor_status: matched.status,
        store_name: matched.storeName,
      };

      // Set mock in-memory session (only fully active if not pending verification)
      mockCurrentVendor = user.vendor_status !== 'pending_verification' ? user : null;

      // If logging in with pending_verification, seed mockPendingRegistration
      if (user.vendor_status === 'pending_verification') {
        mockPendingRegistration = {
          fullName: matched.fullName,
          email: user.email,
          mobile: matched.mobile,
          businessName: matched.storeName,
          maskedEmail: maskEmail(user.email),
          maskedMobile: maskMobile(matched.mobile),
          emailVerified: false,
          mobileVerified: false,
          emailAttempts: 0,
          mobileAttempts: 0,
          emailLockedUntil: null,
          mobileLockedUntil: null,
          emailResends: 0,
          mobileResends: 0,
          emailResendAvailableAt: Date.now() + 30000,
          mobileResendAvailableAt: Date.now() + 30000,
        };
      }

      return HttpResponse.json(
        {
          message: 'Login successful.',
          vendor_status: user.vendor_status,
          user,
        },
        { status: 200 }
      );
    }

    // Any other credentials -> 401 invalid_credentials
    return HttpResponse.json(
      {
        code: 'invalid_credentials',
        message: 'Invalid credentials',
      },
      { status: 401 }
    );
  }),

  // 7. GET /api/v1/vendor/auth/me/
  http.get('*/api/v1/vendor/auth/me/', async () => {
    await delay(600);
    if (mockCurrentVendor) {
      return HttpResponse.json(mockCurrentVendor, { status: 200 });
    }
    return HttpResponse.json(
      {
        code: 'unauthenticated',
        message: 'Authentication credentials were not provided.',
      },
      { status: 401 }
    );
  }),

  // 8. POST /api/v1/vendor/auth/logout/
  http.post('*/api/v1/vendor/auth/logout/', async () => {
    await delay(600);
    mockCurrentVendor = null;
    mockPendingRegistration = null;
    return HttpResponse.json(
      {
        message: 'Logged out successfully.',
      },
      { status: 200 }
    );
  }),

  // 9. POST /api/v1/vendor/auth/password-reset/request/
  http.post('*/api/v1/vendor/auth/password-reset/request/', async ({ request }) => {
    await delay(600);
    const body = (await request.json()) as { identifier?: string };
    const rawIdentifier = (body.identifier || '').trim();

    let masked = '';
    if (rawIdentifier.includes('@')) {
      masked = maskEmail(rawIdentifier.toLowerCase());
    } else {
      masked = maskMobile(rawIdentifier);
    }

    // Anti-enumeration: always returns 200 with masked value
    mockResetSession = {
      identifier: rawIdentifier.toLowerCase(),
      masked: masked || 'us***@example.com',
      step: 'verify',
      attempts: 0,
      lockedUntil: null,
      resends: 0,
      resendAvailableAt: Date.now() + 30000,
    };

    return HttpResponse.json(
      {
        masked: mockResetSession.masked,
        resend_available_in: 30,
      },
      { status: 200 }
    );
  }),

  // 10. POST /api/v1/vendor/auth/password-reset/verify/
  http.post('*/api/v1/vendor/auth/password-reset/verify/', async ({ request }) => {
    await delay(600);
    if (!mockResetSession) {
      return HttpResponse.json(
        {
          code: 'reset_session_expired',
          message: 'Your reset session has expired. Please request a new code.',
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (mockResetSession.lockedUntil && mockResetSession.lockedUntil > now) {
      const remainingSeconds = Math.ceil((mockResetSession.lockedUntil - now) / 1000);
      return HttpResponse.json(
        {
          code: 'too_many_attempts',
          message: `Too many attempts. Locked. Please try again in ${Math.ceil(remainingSeconds / 60)} minutes.`,
          retry_after_seconds: remainingSeconds,
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { otp?: string };
    const otp = (body.otp || '').trim();

    if (otp === '000000') {
      mockResetSession.attempts += 1;
      if (mockResetSession.attempts >= 5) {
        mockResetSession.lockedUntil = now + 900 * 1000;
        return HttpResponse.json(
          {
            code: 'too_many_attempts',
            message: 'Too many attempts. Channel locked for 15 minutes.',
            retry_after_seconds: 900,
          },
          { status: 429 }
        );
      }
      return HttpResponse.json(
        { code: 'invalid_otp', message: 'Invalid OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    if (otp === '111111') {
      return HttpResponse.json(
        { code: 'otp_expired', message: 'This OTP has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    if (otp === '123456') {
      mockResetSession.step = 'new_password';
      mockResetSession.attempts = 0;
      mockResetSession.lockedUntil = null;
      return HttpResponse.json({ verified: true }, { status: 200 });
    }

    mockResetSession.attempts += 1;
    if (mockResetSession.attempts >= 5) {
      mockResetSession.lockedUntil = now + 900 * 1000;
      return HttpResponse.json(
        {
          code: 'too_many_attempts',
          message: 'Too many attempts. Channel locked for 15 minutes.',
          retry_after_seconds: 900,
        },
        { status: 429 }
      );
    }

    return HttpResponse.json(
      { code: 'invalid_otp', message: 'Invalid OTP code. Please check and try again.' },
      { status: 400 }
    );
  }),

  // 11. POST /api/v1/vendor/auth/password-reset/resend/
  http.post('*/api/v1/vendor/auth/password-reset/resend/', async () => {
    await delay(600);
    if (!mockResetSession) {
      return HttpResponse.json(
        {
          code: 'reset_session_expired',
          message: 'Your reset session has expired. Please request a new code.',
        },
        { status: 400 }
      );
    }

    const now = Date.now();
    if (mockResetSession.resendAvailableAt > now) {
      const waitSec = Math.ceil((mockResetSession.resendAvailableAt - now) / 1000);
      return HttpResponse.json(
        {
          code: 'resend_too_soon',
          message: `Please wait ${waitSec} seconds before requesting another code.`,
          retry_after_seconds: waitSec,
        },
        { status: 429 }
      );
    }

    mockResetSession.resends += 1;
    if (mockResetSession.resends >= 4) {
      return HttpResponse.json(
        {
          code: 'too_many_resends',
          message: 'Maximum OTP resend limit reached for this hour.',
          retry_after_seconds: 3600,
        },
        { status: 429 }
      );
    }

    mockResetSession.attempts = 0;
    mockResetSession.lockedUntil = null;
    mockResetSession.resendAvailableAt = now + 30000;

    return HttpResponse.json({ resend_available_in: 30 }, { status: 200 });
  }),

  // 12. POST /api/v1/vendor/auth/password-reset/confirm/
  http.post('*/api/v1/vendor/auth/password-reset/confirm/', async ({ request }) => {
    await delay(600);
    if (!mockResetSession || mockResetSession.step !== 'new_password') {
      return HttpResponse.json(
        {
          code: 'reset_session_expired',
          message: 'Password reset session expired. Please start over from step 1.',
        },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { new_password?: string; confirm_password?: string };
    const newPass = (body.new_password || '').trim();
    const confirmPass = (body.confirm_password || '').trim();

    if (newPass === 'Test@123') {
      return HttpResponse.json(
        {
          code: 'password_reused',
          message: 'New password cannot be the same as your old password.',
        },
        { status: 400 }
      );
    }

    if (newPass !== confirmPass) {
      return HttpResponse.json(
        {
          code: 'validation_error',
          message: 'Passwords do not match.',
          fieldErrors: {
            confirm_password: ['Passwords do not match.'],
          },
        },
        { status: 400 }
      );
    }

    const ident = mockResetSession.identifier;
    MOCK_PASSWORDS[ident] = newPass;

    // Also associate matching credential in MOCK_CREDENTIALS
    const matched = MOCK_CREDENTIALS[ident];
    if (matched) {
      MOCK_PASSWORDS[matched.mobile] = newPass;
    } else {
      for (const [key, cred] of Object.entries(MOCK_CREDENTIALS)) {
        if (cred.mobile === ident || key === ident) {
          MOCK_PASSWORDS[key] = newPass;
          MOCK_PASSWORDS[cred.mobile] = newPass;
        }
      }
    }

    // Clear reset session upon completion
    mockResetSession = null;

    return HttpResponse.json(
      {
        message: 'Password updated successfully. Please log in.',
      },
      { status: 200 }
    );
  }),

  // 13. GET /api/v1/vendor/auth/password-reset/status/
  http.get('*/api/v1/vendor/auth/password-reset/status/', async () => {
    await delay(600);
    return HttpResponse.json(
      {
        step: mockResetSession ? mockResetSession.step : 'none',
      },
      { status: 200 }
    );
  }),

  // 14. GET /api/v1/vendor/dashboard/summary/
  http.get('*/api/v1/vendor/dashboard/summary/', async () => {
    await delay(600);
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    if (isEmpty) {
      return HttpResponse.json(
        {
          total_sales_paise: 0,
          orders_today: 0,
          pending_orders: 0,
          low_stock_count: 0,
          available_balance_paise: 0,
          pending_payout_paise: 0,
          changes: {
            total_sales_pct: 0,
            orders_today_pct: 0,
            pending_orders_diff: 0,
            available_balance_pct: 0,
          },
        },
        { status: 200 }
      );
    }

    return HttpResponse.json(
      {
        total_sales_paise: 12450000, // ₹1,24,500
        orders_today: 8,
        pending_orders: 3,
        low_stock_count: 4,
        available_balance_paise: 8720000, // ₹87,200
        pending_payout_paise: 3730000, // ₹37,300
        changes: {
          total_sales_pct: 14.2,
          orders_today_pct: 25.0,
          pending_orders_diff: -1,
          available_balance_pct: 8.5,
        },
      },
      { status: 200 }
    );
  }),

  // 15. GET /api/v1/vendor/dashboard/sales-chart/
  http.get('*/api/v1/vendor/dashboard/sales-chart/', async ({ request }) => {
    await delay(600);
    const url = new URL(request.url);
    const range = (url.searchParams.get('range') || '30') as '7' | '30' | '90';
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    const numDays = range === '7' ? 7 : range === '90' ? 90 : 30;
    const now = new Date();
    const points = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      if (isEmpty) {
        points.push({
          date: dateStr,
          sales_paise: 0,
          orders: 0,
        });
      } else {
        // Deterministic realistic curve based on day of month
        const dayNum = d.getDate();
        const baseSales = 220000 + ((dayNum * 17) % 35) * 12000;
        const orders = 2 + ((dayNum * 7) % 8);
        points.push({
          date: dateStr,
          sales_paise: baseSales,
          orders,
        });
      }
    }

    return HttpResponse.json(
      {
        range,
        points,
      },
      { status: 200 }
    );
  }),

  // 16. GET /api/v1/vendor/dashboard/recent-orders/
  http.get('*/api/v1/vendor/dashboard/recent-orders/', async ({ request }) => {
    await delay(600);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page_size') || '5', 10));
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    if (isEmpty) {
      return HttpResponse.json(
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
        },
        { status: 200 }
      );
    }

    const allOrders = [
      { id: 'ord_1', order_number: 'ORD-8492', customer_first_name: 'Priya', amount_paise: 320000, status: 'processing', date: '2026-10-18T14:20:00Z' },
      { id: 'ord_2', order_number: 'ORD-8491', customer_first_name: 'Rahul', amount_paise: 145000, status: 'delivered', date: '2026-10-18T11:05:00Z' },
      { id: 'ord_3', order_number: 'ORD-8490', customer_first_name: 'Ananya', amount_paise: 480000, status: 'shipped', date: '2026-10-17T16:45:00Z' },
      { id: 'ord_4', order_number: 'ORD-8489', customer_first_name: 'Suresh', amount_paise: 85000, status: 'delivered', date: '2026-10-17T09:30:00Z' },
      { id: 'ord_5', order_number: 'ORD-8488', customer_first_name: 'Deepa', amount_paise: 210000, status: 'pending', date: '2026-10-16T18:10:00Z' },
      { id: 'ord_6', order_number: 'ORD-8487', customer_first_name: 'Vikram', amount_paise: 650000, status: 'delivered', date: '2026-10-15T13:25:00Z' },
      { id: 'ord_7', order_number: 'ORD-8486', customer_first_name: 'Meera', amount_paise: 199000, status: 'delivered', date: '2026-10-14T10:15:00Z' },
      { id: 'ord_8', order_number: 'ORD-8485', customer_first_name: 'Arun', amount_paise: 340000, status: 'cancelled', date: '2026-10-14T08:50:00Z' },
      { id: 'ord_9', order_number: 'ORD-8484', customer_first_name: 'Sneha', amount_paise: 95000, status: 'delivered', date: '2026-10-13T17:40:00Z' },
      { id: 'ord_10', order_number: 'ORD-8483', customer_first_name: 'Rajesh', amount_paise: 520000, status: 'delivered', date: '2026-10-12T12:00:00Z' },
    ];

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const results = allOrders.slice(startIndex, endIndex);

    return HttpResponse.json(
      {
        count: allOrders.length,
        next: endIndex < allOrders.length ? `/api/v1/vendor/dashboard/recent-orders/?page=${page + 1}&page_size=${pageSize}` : null,
        previous: page > 1 ? `/api/v1/vendor/dashboard/recent-orders/?page=${page - 1}&page_size=${pageSize}` : null,
        results,
      },
      { status: 200 }
    );
  }),

  // 17. GET /api/v1/vendor/dashboard/low-stock/
  http.get('*/api/v1/vendor/dashboard/low-stock/', async ({ request }) => {
    await delay(600);
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page_size') || '5', 10));
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    if (isEmpty) {
      return HttpResponse.json(
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
        },
        { status: 200 }
      );
    }

    const allLowStock = [
      { id: 'item_1', product_name: 'Natural Clay Water Pot', stock_left: 2, threshold: 5, category: 'Handmade Pottery' },
      { id: 'item_2', product_name: 'Cold Pressed Coconut Oil 500ml', stock_left: 3, threshold: 5, category: 'Natural Products' },
      { id: 'item_3', product_name: 'Handmade Brass Diya Set', stock_left: 1, threshold: 5, category: 'Jewelry & Brass' },
      { id: 'item_4', product_name: 'Handloom Cotton Kurta L', stock_left: 4, threshold: 5, category: 'Clothes & Fashion' },
    ];

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const results = allLowStock.slice(startIndex, endIndex);

    return HttpResponse.json(
      {
        count: allLowStock.length,
        next: endIndex < allLowStock.length ? `/api/v1/vendor/dashboard/low-stock/?page=${page + 1}&page_size=${pageSize}` : null,
        previous: page > 1 ? `/api/v1/vendor/dashboard/low-stock/?page=${page - 1}&page_size=${pageSize}` : null,
        results,
      },
      { status: 200 }
    );
  }),

  // 18. GET /api/v1/vendor/dashboard/recent-reviews/
  http.get('*/api/v1/vendor/dashboard/recent-reviews/', async ({ request }) => {
    await delay(600);
    const url = new URL(request.url);

    // Intentional fail testing: ?fail=reviews
    if (url.searchParams.get('fail') === 'reviews') {
      return HttpResponse.json(
        {
          code: 'review_fetch_error',
          message: 'Failed to load reviews from marketplace database.',
        },
        { status: 500 }
      );
    }

    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';
    if (isEmpty) {
      return HttpResponse.json(
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
        },
        { status: 200 }
      );
    }

    const allReviews = [
      {
        id: 'rev_1',
        customer_name: 'Nandini S.',
        rating: 5,
        comment: 'Beautiful craftsmanship, the terracotta jug keeps water cool naturally!',
        product_name: 'Handmade Terracotta Jug',
        date: '2026-10-17T10:00:00Z',
      },
      {
        id: 'rev_2',
        customer_name: 'Karthik R.',
        rating: 5,
        comment: 'Very fast delivery and securely packed. Pure quality.',
        product_name: 'Cold Pressed Sesame Oil',
        date: '2026-10-16T14:30:00Z',
      },
      {
        id: 'rev_3',
        customer_name: 'Divya M.',
        rating: 4,
        comment: 'Great finish and refreshing herbal scent, would definitely order again.',
        product_name: 'Herbal Handmade Bath Soap',
        date: '2026-10-15T09:15:00Z',
      },
      {
        id: 'rev_4',
        customer_name: 'Amit K.',
        rating: 5,
        comment: 'Authentic handwoven piece, lovely texture and organic feel.',
        product_name: 'Handspun Khadi Scarf',
        date: '2026-10-13T16:00:00Z',
      },
      {
        id: 'rev_5',
        customer_name: 'Sunita P.',
        rating: 4,
        comment: 'Sturdy brass work, looks traditional and well polished.',
        product_name: 'Brass Incense Burner',
        date: '2026-10-12T11:45:00Z',
      },
    ];

    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page_size') || '5', 10));
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const results = allReviews.slice(startIndex, endIndex);

    return HttpResponse.json(
      {
        count: allReviews.length,
        next: endIndex < allReviews.length ? `/api/v1/vendor/dashboard/recent-reviews/?page=${page + 1}&page_size=${pageSize}` : null,
        previous: page > 1 ? `/api/v1/vendor/dashboard/recent-reviews/?page=${page - 1}&page_size=${pageSize}` : null,
        results,
      },
      { status: 200 }
    );
  }),

  // 19. GET /api/v1/vendor/dashboard/alerts/
  http.get('*/api/v1/vendor/dashboard/alerts/', async () => {
    await delay(600);
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    if (isEmpty) {
      return HttpResponse.json([], { status: 200 });
    }

    return HttpResponse.json(mockVendorAlerts, { status: 200 });
  }),

  // 20. GET /api/v1/vendor/products/
  http.get('*/api/v1/vendor/products/', async ({ request }) => {
    await delay(600);
    const isEmpty = mockCurrentVendor?.email === 'new-empty@test.com';

    if (isEmpty) {
      return HttpResponse.json(
        {
          count: 0,
          next: null,
          previous: null,
          results: [],
          status_counts: {
            all: 0,
            draft: 0,
            pending_review: 0,
            approved: 0,
            rejected: 0,
            unpublished: 0,
            archived: 0,
          },
        },
        { status: 200 }
      );
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const category = url.searchParams.get('category') || '';
    const wholesale = url.searchParams.get('wholesale');
    const lowStock = url.searchParams.get('low_stock');
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const ordering = url.searchParams.get('ordering') || 'updated_desc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page_size') || '10', 10));

    // Calculate status counts on all products
    const statusCounts = {
      all: mockVendorProducts.length,
      draft: mockVendorProducts.filter((p) => p.status === 'draft').length,
      pending_review: mockVendorProducts.filter((p) => p.status === 'pending_review').length,
      approved: mockVendorProducts.filter((p) => p.status === 'approved').length,
      rejected: mockVendorProducts.filter((p) => p.status === 'rejected').length,
      unpublished: mockVendorProducts.filter((p) => p.status === 'unpublished').length,
      archived: mockVendorProducts.filter((p) => p.status === 'archived').length,
    };

    let filtered = [...mockVendorProducts];

    // Filter by status (if not 'all' or empty)
    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }

    // Filter by category
    if (category) {
      filtered = filtered.filter((p) => p.category.id === category);
    }

    // Filter by wholesale
    if (wholesale === 'true') {
      filtered = filtered.filter((p) => p.wholesale_enabled === true);
    } else if (wholesale === 'false') {
      filtered = filtered.filter((p) => p.wholesale_enabled === false);
    }

    // Filter by low stock (stock <= 5)
    if (lowStock === 'true') {
      filtered = filtered.filter((p) => p.total_stock <= 5);
    }

    // Filter by search (title or SKU)
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (ordering) {
        case 'updated_asc':
          return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
        case 'price_asc':
          return a.price_paise - b.price_paise;
        case 'price_desc':
          return b.price_paise - a.price_paise;
        case 'stock_asc':
          return a.total_stock - b.total_stock;
        case 'stock_desc':
          return b.total_stock - a.total_stock;
        case 'updated_desc':
        default:
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
    });

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const results = filtered.slice(startIndex, endIndex);

    return HttpResponse.json(
      {
        count: totalCount,
        next: endIndex < totalCount ? `/api/v1/vendor/products/?page=${page + 1}&page_size=${pageSize}` : null,
        previous: page > 1 ? `/api/v1/vendor/products/?page=${page - 1}&page_size=${pageSize}` : null,
        results,
        status_counts: statusCounts,
      },
      { status: 200 }
    );
  }),

  // 21. POST /api/v1/vendor/products/:id/duplicate/
  http.post('*/api/v1/vendor/products/:id/duplicate/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    const newProduct = {
      ...found,
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${found.title} (Copy)`,
      sku: `${found.sku}-COPY`,
      status: 'draft' as const,
      rejection_reason: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockVendorProducts.unshift(newProduct);
    return HttpResponse.json(newProduct, { status: 201 });
  }),

  // 22. POST /api/v1/vendor/products/:id/withdraw/
  http.post('*/api/v1/vendor/products/:id/withdraw/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status !== 'pending_review') {
      return HttpResponse.json(
        { code: 'invalid_status_transition', message: 'Only products under review can be withdrawn.' },
        { status: 400 }
      );
    }

    found.status = 'draft';
    found.updated_at = new Date().toISOString();
    return HttpResponse.json(found, { status: 200 });
  }),

  // 23. POST /api/v1/vendor/products/:id/unpublish/
  http.post('*/api/v1/vendor/products/:id/unpublish/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status !== 'approved') {
      return HttpResponse.json(
        { code: 'invalid_status_transition', message: 'Only live approved products can be unpublished.' },
        { status: 400 }
      );
    }

    found.status = 'unpublished';
    found.updated_at = new Date().toISOString();
    return HttpResponse.json(found, { status: 200 });
  }),

  // 24. POST /api/v1/vendor/products/:id/republish/
  http.post('*/api/v1/vendor/products/:id/republish/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status !== 'unpublished') {
      return HttpResponse.json(
        { code: 'invalid_status_transition', message: 'Only unpublished products can be republished.' },
        { status: 400 }
      );
    }

    found.status = 'approved';
    found.updated_at = new Date().toISOString();
    return HttpResponse.json(found, { status: 200 });
  }),

  // 25. POST /api/v1/vendor/products/:id/archive/
  http.post('*/api/v1/vendor/products/:id/archive/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    found.status = 'archived';
    found.updated_at = new Date().toISOString();
    return HttpResponse.json(found, { status: 200 });
  }),

  // 26. DELETE /api/v1/vendor/products/:id/
  http.delete('*/api/v1/vendor/products/:id/', async ({ params }) => {
    await delay(600);
    const id = params.id as string;
    const index = mockVendorProducts.findIndex((p) => p.id === id);

    if (index === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    const product = mockVendorProducts[index];
    if (product.status !== 'draft') {
      return HttpResponse.json(
        {
          code: 'not_deletable',
          message: 'Only draft products can be deleted. You can unpublish or archive live products instead.',
        },
        { status: 409 }
      );
    }

    mockVendorProducts.splice(index, 1);
    return HttpResponse.json({ success: true, message: 'Draft product deleted successfully.' }, { status: 200 });
  }),

  // ================= VENDOR PRODUCT FORM & UPLOAD ENDPOINTS =================

  // GET /api/v1/vendor/categories/
  http.get('*/api/v1/vendor/categories/', async () => {
    await delay(500);
    const active = dynamicVendorCategories.filter((c) => c.is_active !== false);
    return HttpResponse.json(active, { status: 200 });
  }),

  // GET /api/v1/vendor/products/:id/
  http.get('*/api/v1/vendor/products/:id/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);
    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    const colors = found.colors || [];
    const has_colors = (found as any).has_colors ?? (colors.length > 0);
    const color_items =
      (found as any).color_items ||
      (found.color_galleries && found.color_galleries.length > 0
        ? found.color_galleries.map((g, idx) => ({
            id: `col_${idx + 1}`,
            name: g.color_name,
            hex: g.hex,
            images: g.images.map((url, i) => ({
              id: `img_${idx}_${i}`,
              upload_id: `upl_${idx}_${i}`,
              url,
              is_primary: i === 0,
              order: i,
              alt: `${found.title} - ${g.color_name}`,
            })),
            sizes: (found.variants || [])
              .filter((v) => v.color_name === g.color_name)
              .map((v) => ({
                label: v.size || 'Standard',
                stock: v.stock,
                sku: v.sku,
                price_override_paise:
                  v.price_paise !== found.price_paise ? v.price_paise : undefined,
              })),
          }))
        : []);

    const image_items =
      (found as any).image_items ||
      (found.main_image_url
        ? [
            {
              id: 'img_main',
              upload_id: 'upl_main',
              url: found.main_image_url,
              is_primary: true,
              order: 0,
              alt: found.title,
            },
          ]
        : []);

    const formatted = {
      ...found,
      subcategory:
        (found as any).subcategory || (found.category ? (found.category as any).name : ''),
      description:
        (found as any).description || found.description_i18n?.en || '',
      brand: (found as any).brand || found.seller?.store_name || '',
      translations: (found as any).translations || {
        ml: {
          title: found.title_i18n?.ml || '',
          description: found.description_i18n?.ml || '',
        },
        ta: {
          title: found.title_i18n?.ta || '',
          description: found.description_i18n?.ta || '',
        },
        hi: {
          title: found.title_i18n?.hi || '',
          description: found.description_i18n?.hi || '',
        },
        kn: {
          title: found.title_i18n?.kn || '',
          description: found.description_i18n?.kn || '',
        },
      },
      tags: found.tags || [],
      attributes: found.attributes || {},
      has_colors,
      color_items,
      image_items,
      video_upload:
        (found as any).video_upload ||
        (found.video_url
          ? { upload_id: 'vid_1', url: found.video_url, duration_seconds: 30 }
          : null),
      mrp_paise: found.mrp_paise || Math.round(found.price_paise * 1.25),
      gst_rate: (found as any).gst_rate ?? found.gst_rate_percent ?? 12,
      hsn: (found as any).hsn || '',
      stock: found.total_stock,
      shipping: (found as any).shipping || {
        weight_g: found.shipping_weight_grams || 500,
        length_cm: found.shipping_dimensions?.length_cm || 20,
        width_cm: found.shipping_dimensions?.width_cm || 15,
        height_cm: found.shipping_dimensions?.height_cm || 10,
        processing_days: 2,
      },
      wholesale: (found as any).wholesale || {
        enabled: Boolean(found.wholesale_enabled),
        moq: 10,
        tiers: (found.wholesale_tiers || []).map((t) => ({
          min_qty: t.min_quantity,
          price_paise: t.unit_price_paise,
        })),
      },
    };

    return HttpResponse.json(formatted, { status: 200 });
  }),

  // POST /api/v1/vendor/products/ (create draft)
  http.post('*/api/v1/vendor/products/', async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as Partial<VendorProductPayload>;
    const title = (body.title || 'Untitled Product Draft').trim();

    if (body.has_colors && body.colors && body.colors.length > 0) {
      const names = body.colors.map((c) => c.name.trim().toLowerCase());
      const hasDup = names.some((n, i) => n && names.indexOf(n) !== i);
      if (hasDup) {
        return HttpResponse.json(
          {
            code: 'duplicate_colors',
            message: 'Duplicate color names are not allowed within a product.',
            fieldErrors: { colors: 'Duplicate color names are not allowed within a product.' },
          },
          { status: 400 }
        );
      }
    }

    const catObj =
      vendorCategoriesWithAttributes.find((c) => c.id === body.category_id) ||
      vendorCategoriesWithAttributes[0];

    const id = `prod_${Date.now()}`;
    const mainImageUrl = body.has_colors
      ? body.colors?.[0]?.images?.[0]?.url ||
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'
      : body.images?.[0]?.url ||
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80';

    const created: any = {
      id,
      title,
      sku: body.colors?.[0]?.sizes?.[0]?.sku || `SKU-${Date.now().toString().slice(-6)}`,
      main_image_url: mainImageUrl,
      category: { id: catObj.id, name: catObj.name },
      subcategory: body.subcategory,
      price_paise: body.price_paise || 99900,
      mrp_paise: body.mrp_paise || Math.round((body.price_paise || 99900) * 1.25),
      gst_rate_percent: body.gst_rate ?? 12,
      gst_rate: body.gst_rate ?? 12,
      hsn: body.hsn,
      total_stock: body.has_colors
        ? (body.colors || []).reduce(
            (sum, c) =>
              sum +
              c.sizes.reduce((sSum, s) => sSum + Number(s.stock || 0), 0),
            0
          )
        : Number(body.stock || 0),
      colors: body.has_colors
        ? (body.colors || []).map((c) => ({ name: c.name, hex: c.hex }))
        : [],
      color_items: body.colors || [],
      image_items: body.images || [],
      video_upload: body.video_upload,
      video_url: body.video_upload?.url,
      description: body.description || '',
      brand: body.brand,
      translations: body.translations,
      tags: body.tags || [],
      attributes: body.attributes || {},
      has_colors: Boolean(body.has_colors),
      shipping: body.shipping || {
        weight_g: 500,
        length_cm: 20,
        width_cm: 15,
        height_cm: 10,
        processing_days: 2,
      },
      shipping_weight_grams: body.shipping?.weight_g || 500,
      shipping_dimensions: {
        length_cm: body.shipping?.length_cm || 20,
        width_cm: body.shipping?.width_cm || 15,
        height_cm: body.shipping?.height_cm || 10,
      },
      wholesale: body.wholesale || { enabled: false, moq: 10, tiers: [] },
      wholesale_enabled: Boolean(body.wholesale?.enabled),
      wholesale_tiers: body.wholesale?.tiers?.map((t) => ({
        min_quantity: t.min_qty,
        unit_price_paise: t.price_paise,
      })),
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seller: {
        seller_id: mockCurrentVendor?.id || 'v_unknown',
        store_name: mockCurrentVendor?.store_name || mockCurrentVendor?.full_name || 'Vendor Store',
        seller_name: mockCurrentVendor?.full_name || 'Vendor',
        email: mockCurrentVendor?.email || '',
        mobile_masked: mockCurrentVendor?.mobile_masked || '',
        seller_status: 'approved',
      },
    };

    mockVendorProducts.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // PATCH /api/v1/vendor/products/:id/
  http.patch('*/api/v1/vendor/products/:id/', async ({ params, request }) => {
    await delay(700);
    const id = params.id as string;
    const index = mockVendorProducts.findIndex((p) => p.id === id);
    if (index === -1) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }
    const existing = mockVendorProducts[index];

    if (existing.status === 'pending_review') {
      return HttpResponse.json(
        {
          code: 'pending_review_locked',
          message:
            'Products currently under admin review cannot be modified. Withdraw first.',
        },
        { status: 409 }
      );
    }

    const body = (await request.json()) as Partial<VendorProductPayload>;

    if (body.has_colors && body.colors && body.colors.length > 0) {
      const names = body.colors.map((c) => c.name.trim().toLowerCase());
      const hasDup = names.some((n, i) => n && names.indexOf(n) !== i);
      if (hasDup) {
        return HttpResponse.json(
          {
            code: 'duplicate_colors',
            message: 'Duplicate color names are not allowed within a product.',
            fieldErrors: { colors: 'Duplicate color names are not allowed within a product.' },
          },
          { status: 400 }
        );
      }
    }

    // Check if approved product has critical content changes
    let newStatus: any = existing.status;
    if (existing.status === 'approved') {
      const contentChanged =
        (body.title !== undefined && body.title !== existing.title) ||
        (body.description !== undefined &&
          body.description !== (existing as any).description) ||
        (body.category_id !== undefined &&
          body.category_id !== existing.category.id) ||
        body.attributes !== undefined ||
        body.colors !== undefined ||
        body.images !== undefined ||
        body.video_upload !== undefined;

      if (contentChanged) {
        newStatus = 'pending_review';
      }
    }

    const catObj = body.category_id
      ? vendorCategoriesWithAttributes.find((c) => c.id === body.category_id) ||
        existing.category
      : existing.category;

    const updated: any = {
      ...existing,
      title: body.title !== undefined ? body.title.trim() : existing.title,
      category: { id: catObj.id, name: catObj.name },
      subcategory:
        body.subcategory !== undefined
          ? body.subcategory
          : (existing as any).subcategory,
      description:
        body.description !== undefined
          ? body.description
          : (existing as any).description,
      brand: body.brand !== undefined ? body.brand : (existing as any).brand,
      translations:
        body.translations !== undefined
          ? body.translations
          : (existing as any).translations,
      tags: body.tags !== undefined ? body.tags : existing.tags,
      attributes:
        body.attributes !== undefined ? body.attributes : existing.attributes,
      has_colors:
        body.has_colors !== undefined
          ? body.has_colors
          : (existing as any).has_colors,
      colors:
        body.has_colors && body.colors
          ? body.colors.map((c) => ({ name: c.name, hex: c.hex }))
          : body.has_colors === false
          ? []
          : existing.colors,
      color_items: body.colors !== undefined ? body.colors : (existing as any).color_items,
      image_items: body.images !== undefined ? body.images : (existing as any).image_items,
      video_upload:
        body.video_upload !== undefined
          ? body.video_upload
          : (existing as any).video_upload,
      video_url:
        body.video_upload !== undefined
          ? body.video_upload?.url
          : existing.video_url,
      mrp_paise: body.mrp_paise !== undefined ? body.mrp_paise : existing.mrp_paise,
      price_paise:
        body.price_paise !== undefined ? body.price_paise : existing.price_paise,
      gst_rate_percent:
        body.gst_rate !== undefined ? body.gst_rate : existing.gst_rate_percent,
      gst_rate:
        body.gst_rate !== undefined ? body.gst_rate : (existing as any).gst_rate,
      hsn: body.hsn !== undefined ? body.hsn : (existing as any).hsn,
      total_stock:
        body.has_colors && body.colors
          ? body.colors.reduce(
              (sum, c) =>
                sum +
                c.sizes.reduce((sSum, s) => sSum + Number(s.stock || 0), 0),
              0
            )
          : body.stock !== undefined
          ? Number(body.stock)
          : existing.total_stock,
      shipping:
        body.shipping !== undefined ? body.shipping : (existing as any).shipping,
      shipping_weight_grams:
        body.shipping?.weight_g !== undefined
          ? body.shipping.weight_g
          : existing.shipping_weight_grams,
      shipping_dimensions: body.shipping
        ? {
            length_cm: body.shipping.length_cm,
            width_cm: body.shipping.width_cm,
            height_cm: body.shipping.height_cm,
          }
        : existing.shipping_dimensions,
      wholesale:
        body.wholesale !== undefined
          ? body.wholesale
          : (existing as any).wholesale,
      wholesale_enabled:
        body.wholesale?.enabled !== undefined
          ? body.wholesale.enabled
          : existing.wholesale_enabled,
      wholesale_tiers: body.wholesale?.tiers
        ? body.wholesale.tiers.map((t) => ({
            min_quantity: t.min_qty,
            unit_price_paise: t.price_paise,
          }))
        : existing.wholesale_tiers,
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (body.has_colors && body.colors && body.colors[0]?.images?.[0]?.url) {
      updated.main_image_url = body.colors[0].images[0].url;
    } else if (body.images && body.images[0]?.url) {
      updated.main_image_url = body.images[0].url;
    }

    mockVendorProducts[index] = updated;
    return HttpResponse.json(updated, { status: 200 });
  }),

  // POST /api/v1/vendor/products/:id/submit/
  http.post('*/api/v1/vendor/products/:id/submit/', async ({ params }) => {
    await delay(700);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);
    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status === 'pending_review') {
      return HttpResponse.json(
        { code: 'already_pending', message: 'Product is already submitted for review.' },
        { status: 409 }
      );
    }

    // Validation
    const fieldErrors: Record<string, string> = {};
    if (!found.title || found.title.trim().length < 3) {
      fieldErrors['title'] = 'Title is required (minimum 3 characters).';
    }
    const desc =
      (found as any).description || found.description_i18n?.en || '';
    if (desc.trim().length < 50) {
      fieldErrors['description'] =
        'Description must be at least 50 characters of plain text.';
    }
    if (found.price_paise > (found.mrp_paise || found.price_paise)) {
      fieldErrors['price_paise'] = 'Selling price cannot exceed Base Price (MRP).';
    }

    if (Object.keys(fieldErrors).length > 0) {
      return HttpResponse.json(
        {
          code: 'validation_error',
          message: 'Please resolve the highlighted errors before submitting for review.',
          fieldErrors,
        },
        { status: 400 }
      );
    }

    found.status = 'pending_review';
    found.rejection_reason = undefined;
    (found as any).submitted_at = new Date().toISOString();
    found.updated_at = new Date().toISOString();

    return HttpResponse.json(found, { status: 200 });
  }),

  // POST /api/v1/vendor/uploads/images/
  http.post('*/api/v1/vendor/uploads/images/', async ({ request }) => {
    await delay(700);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return HttpResponse.json(
        { code: 'missing_file', message: 'No image file uploaded.' },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return HttpResponse.json(
        { code: 'file_too_large', message: 'Image exceeds maximum 5 MB limit.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return HttpResponse.json(
        { code: 'invalid_type', message: 'Only JPG, PNG and WebP images are supported.' },
        { status: 400 }
      );
    }

    const uploadId = `upl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let url =
      'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80';
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      try {
        url = URL.createObjectURL(file);
      } catch {
        // Fallback
      }
    }

    return HttpResponse.json(
      {
        id: uploadId,
        url,
        thumbnail_url: url,
        width: 1200,
        height: 1200,
        size: file.size,
      },
      { status: 201 }
    );
  }),

  // POST /api/v1/vendor/uploads/video/
  http.post('*/api/v1/vendor/uploads/video/', async ({ request }) => {
    await delay(700);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return HttpResponse.json(
        { code: 'missing_file', message: 'No video file uploaded.' },
        { status: 400 }
      );
    }

    if (file.size > 50 * 1024 * 1024) {
      return HttpResponse.json(
        { code: 'file_too_large', message: 'Video exceeds maximum 50 MB limit.' },
        { status: 400 }
      );
    }

    const allowedTypes = ['video/mp4', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      return HttpResponse.json(
        { code: 'invalid_type', message: 'Only MP4 and WebM videos are supported.' },
        { status: 400 }
      );
    }

    const uploadId = `vid_${Date.now()}`;
    let url =
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    if (typeof URL !== 'undefined' && URL.createObjectURL) {
      try {
        url = URL.createObjectURL(file);
      } catch {
        // Fallback
      }
    }

    return HttpResponse.json(
      {
        id: uploadId,
        url,
        duration: 30,
        size: file.size,
      },
      { status: 201 }
    );
  }),

  // DELETE /api/v1/vendor/uploads/:id/
  http.delete('*/api/v1/vendor/uploads/:id/', async () => {
    await delay(300);
    return HttpResponse.json({ success: true, message: 'Upload removed.' }, { status: 200 });
  }),

  // 30. GET /api/v1/admin/products/
  http.get('*/api/v1/admin/products/', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || '';
    const category = url.searchParams.get('category') || '';
    const seller = url.searchParams.get('seller') || '';
    const search = (url.searchParams.get('search') || '').trim().toLowerCase();
    const ordering = url.searchParams.get('ordering') || 'submitted_asc';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('page_size') || '10', 10));

    const statusCounts = {
      all: mockVendorProducts.length,
      pending_review: mockVendorProducts.filter((p) => p.status === 'pending_review').length,
      approved: mockVendorProducts.filter((p) => p.status === 'approved').length,
      rejected: mockVendorProducts.filter((p) => p.status === 'rejected').length,
    };

    let filtered = [...mockVendorProducts];

    // Filter by status (if not empty and not 'all')
    if (status && status !== 'all') {
      filtered = filtered.filter((p) => p.status === status);
    }

    // Filter by category
    if (category) {
      filtered = filtered.filter((p) => p.category.id === category);
    }

    // Filter by seller
    if (seller) {
      filtered = filtered.filter((p) => p.seller.seller_id === seller);
    }

    // Filter by search (title, sku, seller store)
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.seller.store_name.toLowerCase().includes(search)
      );
    }

    // Ordering
    filtered.sort((a, b) => {
      switch (ordering) {
        case 'submitted_desc':
          return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
        case 'price_asc':
          return a.price_paise - b.price_paise;
        case 'price_desc':
          return b.price_paise - a.price_paise;
        case 'updated_desc':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'submitted_asc':
        default:
          return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      }
    });

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const sliced = filtered.slice(startIndex, endIndex);

    const results: AdminProductListItem[] = sliced.map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      main_image_url: p.main_image_url,
      category: p.category,
      price_paise: p.price_paise,
      total_stock: p.total_stock,
      status: p.status,
      rejection_reason: p.rejection_reason,
      wholesale_enabled: p.wholesale_enabled,
      seller: {
        seller_id: p.seller.seller_id,
        store_name: p.seller.store_name,
      },
      submitted_at: p.submitted_at,
      updated_at: p.updated_at,
    }));

    return HttpResponse.json(
      {
        count: totalCount,
        next:
          endIndex < totalCount
            ? `/api/v1/admin/products/?page=${page + 1}&page_size=${pageSize}`
            : null,
        previous:
          page > 1
            ? `/api/v1/admin/products/?page=${page - 1}&page_size=${pageSize}`
            : null,
        results,
        status_counts: statusCounts,
      },
      { status: 200 }
    );
  }),

  // 31. GET /api/v1/admin/products/:id/
  http.get('*/api/v1/admin/products/:id/', async ({ params }) => {
    await delay(500);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    return HttpResponse.json(found, { status: 200 });
  }),

  // 32. POST /api/v1/admin/products/:id/approve/
  http.post('*/api/v1/admin/products/:id/approve/', async ({ params, request }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status !== 'pending_review') {
      return HttpResponse.json(
        { code: 'not_pending', message: 'Product is not in pending review state.' },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as AdminApprovePayload;

    // Custom Category resolution
    const isCustomCat = Boolean(
      found.is_custom_category ||
      !found.category?.id ||
      found.requested_category_name
    );

    if (isCustomCat) {
      if (!body.category_id && !body.new_category) {
        return HttpResponse.json(
          {
            code: 'category_required',
            message: 'Category resolution is required to approve a product with custom category.',
          },
          { status: 400 }
        );
      }

      const origCat = found.requested_category_name || found.category?.name || 'Custom Category';
      found.original_requested_category = origCat;
      found.is_custom_category = false;

      if (body.new_category) {
        const catName = body.new_category.name.trim();
        const catSlug = body.new_category.slug?.trim() || catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const catId = `cat_${Date.now()}`;
        const newAdminCat: AdminCategory = {
          id: catId,
          name: catName,
          slug: catSlug,
          subcategories: body.new_category.subcategories || [],
          is_active: true,
          product_count: 1,
          created_at: new Date().toISOString(),
          created_by: currentAdminUser?.name || 'Super Admin',
        };
        mockCategories.push(newAdminCat);

        const newVendorCat: VendorCategoryWithAttributes = {
          id: catId,
          name: catName,
          slug: catSlug,
          description: `Artisan products in ${catName}`,
          subcategories: body.new_category.subcategories || [],
          sizes_enabled: false,
          attributes: [],
          is_active: true,
        };
        dynamicVendorCategories.push(newVendorCat);

        found.category = { id: catId, name: catName, slug: catSlug };
        if (body.new_category.subcategories && body.new_category.subcategories.length > 0) {
          found.subcategory = body.new_category.subcategories[0];
        }
      } else if (body.new_subcategory && body.category_id) {
        const parentCat = mockCategories.find((c) => c.id === body.category_id);
        const parentVendorCat = dynamicVendorCategories.find((c) => c.id === body.category_id);
        const subName = body.new_subcategory.name.trim();

        if (parentCat) {
          if (!parentCat.subcategories.includes(subName)) {
            parentCat.subcategories.push(subName);
          }
          parentCat.product_count = (parentCat.product_count || 0) + 1;
        }
        if (parentVendorCat && !parentVendorCat.subcategories.includes(subName)) {
          parentVendorCat.subcategories.push(subName);
        }

        found.category = {
          id: body.category_id,
          name: parentCat ? parentCat.name : (found.category?.name || 'Catalog'),
          slug: parentCat?.slug,
        };
        found.subcategory = subName;
      } else if (body.category_id) {
        const existingCat = mockCategories.find((c) => c.id === body.category_id);
        if (existingCat) {
          existingCat.product_count = (existingCat.product_count || 0) + 1;
          found.category = {
            id: existingCat.id,
            name: existingCat.name,
            slug: existingCat.slug,
          };
        }
        found.subcategory = body.subcategory || undefined;
      }
    }

    found.status = 'approved';
    found.rejection_reason = undefined;
    found.updated_at = new Date().toISOString();

    if (!found.review_history) {
      found.review_history = [];
    }
    found.review_history.unshift({
      id: `rev_${Date.now()}`,
      reviewed_by: currentAdminUser?.name || 'Platform Super Admin',
      decision: 'approved',
      created_at: new Date().toISOString(),
    });

    // Push notification to seller alerts
    mockVendorAlerts.unshift({
      id: `alt_${Date.now()}`,
      title: 'Product Listing Approved',
      message: `Your product '${found.title}' has been reviewed and approved by ChillyFlakes admin. It is now live on the store.`,
      type: 'success',
      created_at: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cf_catalog_updated'));
    }

    return HttpResponse.json(found, { status: 200 });
  }),

  // 33. POST /api/v1/admin/products/:id/reject/
  http.post('*/api/v1/admin/products/:id/reject/', async ({ params, request }) => {
    await delay(600);
    const id = params.id as string;
    const found = mockVendorProducts.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found.' }, { status: 404 });
    }

    if (found.status !== 'pending_review') {
      return HttpResponse.json(
        { code: 'not_pending', message: 'Product is not in pending review state.' },
        { status: 409 }
      );
    }

    const body = (await request.json()) as { reason_code: RejectReasonCode; reason: string };
    const reason = (body.reason || '').trim();

    if (reason.length < 10 || reason.length > 500) {
      return HttpResponse.json(
        { code: 'invalid_reason', message: 'Rejection reason must be between 10 and 500 characters.' },
        { status: 400 }
      );
    }

    found.status = 'rejected';
    found.rejection_reason = reason;
    found.updated_at = new Date().toISOString();

    if (!found.review_history) {
      found.review_history = [];
    }
    found.review_history.unshift({
      id: `rev_${Date.now()}`,
      reviewed_by: currentAdminUser?.name || 'Platform Super Admin',
      decision: 'rejected',
      reason_code: body.reason_code,
      reason,
      created_at: new Date().toISOString(),
    });

    // Push notification to seller alerts
    mockVendorAlerts.unshift({
      id: `alt_${Date.now()}`,
      title: 'Product Review Update: Changes Requested',
      message: `Your product '${found.title}' was reviewed. Changes requested: "${reason}". Please update and resubmit.`,
      type: 'warning',
      created_at: new Date().toISOString(),
    });

    return HttpResponse.json(found, { status: 200 });
  }),

  // ================= ADMIN CATEGORIES ENDPOINTS =================

  // 34. GET /api/v1/admin/categories/
  http.get('*/api/v1/admin/categories/', async () => {
    await delay(500);
    // Recalculate product counts dynamically from mockVendorProducts
    const withCounts = mockCategories.map((c) => ({
      ...c,
      product_count: mockVendorProducts.filter(
        (p) => p.category?.id === c.id || p.category?.name?.toLowerCase() === c.name.toLowerCase()
      ).length,
    }));
    return HttpResponse.json(withCounts, { status: 200 });
  }),

  // 35. POST /api/v1/admin/categories/
  http.post('*/api/v1/admin/categories/', async ({ request }) => {
    await delay(600);
    const body = (await request.json()) as CreateCategoryPayload;
    const name = body.name?.trim();
    if (!name || name.length < 3) {
      return HttpResponse.json(
        { code: 'invalid_name', message: 'Category name must be at least 3 characters.' },
        { status: 400 }
      );
    }

    const slug = (body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')).toLowerCase();
    const id = `cat_${Date.now()}`;

    const newCat: AdminCategory = {
      id,
      name,
      slug,
      description: body.description?.trim(),
      subcategories: body.subcategories || [],
      is_active: true,
      product_count: 0,
      created_at: new Date().toISOString(),
      created_by: currentAdminUser?.name || 'Platform Super Admin',
    };
    mockCategories.push(newCat);

    dynamicVendorCategories.push({
      id,
      name,
      slug,
      description: body.description?.trim() || `Products in ${name}`,
      subcategories: body.subcategories || [],
      sizes_enabled: false,
      attributes: [],
      is_active: true,
    });

    return HttpResponse.json(newCat, { status: 201 });
  }),

  // 36. PATCH /api/v1/admin/categories/:id/
  http.patch('*/api/v1/admin/categories/:id/', async ({ params, request }) => {
    await delay(500);
    const id = params.id as string;
    const cat = mockCategories.find((c) => c.id === id);
    const vendorCat = dynamicVendorCategories.find((c) => c.id === id);

    if (!cat) {
      return HttpResponse.json({ code: 'not_found', message: 'Category not found.' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateCategoryPayload;

    if (body.name !== undefined) {
      const trimmed = body.name.trim();
      cat.name = trimmed;
      if (vendorCat) vendorCat.name = trimmed;
      // Also update products referencing this category
      mockVendorProducts.forEach((p) => {
        if (p.category?.id === id) {
          p.category.name = trimmed;
        }
      });
    }

    if (body.description !== undefined) {
      cat.description = body.description.trim();
      if (vendorCat) vendorCat.description = body.description.trim();
    }

    if (body.is_active !== undefined) {
      cat.is_active = body.is_active;
      if (vendorCat) vendorCat.is_active = body.is_active;
    }

    return HttpResponse.json(cat, { status: 200 });
  }),

  // 37. POST /api/v1/admin/categories/:id/subcategories/
  http.post('*/api/v1/admin/categories/:id/subcategories/', async ({ params, request }) => {
    await delay(500);
    const id = params.id as string;
    const cat = mockCategories.find((c) => c.id === id);
    const vendorCat = dynamicVendorCategories.find((c) => c.id === id);

    if (!cat) {
      return HttpResponse.json({ code: 'not_found', message: 'Category not found.' }, { status: 404 });
    }

    const body = (await request.json()) as { name: string };
    const name = (body.name || '').trim();

    if (!name || name.length < 3) {
      return HttpResponse.json(
        { code: 'invalid_name', message: 'Subcategory name must be at least 3 characters.' },
        { status: 400 }
      );
    }

    if (!cat.subcategories.includes(name)) {
      cat.subcategories.push(name);
    }
    if (vendorCat && !vendorCat.subcategories.includes(name)) {
      vendorCat.subcategories.push(name);
    }

    return HttpResponse.json(cat, { status: 200 });
  }),

  // 38. GET /api/products/ & GET /products/ - Real-time catalog combining baseline products and approved vendor products
  http.get('*/api/products/', async ({ request }) => {
    await delay(120);
    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get('category');
    const searchFilter = (url.searchParams.get('search') || '').trim().toLowerCase();

    // Dynamically retrieve approved products from vendor database
    const approvedVendorItems: Product[] = mockVendorProducts
      .filter((p) => p.status === 'approved')
      .map((p) => ({
        id: p.id,
        name: p.title,
        price: Math.round(p.price_paise / 100),
        originalPrice: Math.round((p.price_paise / 100) * 1.15),
        category: p.category?.name || 'Handcrafted',
        condition: 'New' as const,
        conditionDetails: 'Artisan Handcrafted & Inspected',
        material: 'Natural Organic Handcrafted',
        dimensions: 'Standard Artisan Size',
        description: p.description_i18n?.en || 'Authentic handcrafted creation verified by ChillyFlakes standards.',
        features: ['100% Handcrafted', 'Zero Middlemen', 'Direct From Artisan'],
        image: p.main_image_url || '/hero-chilli.png',
        rating: 4.9,
        reviewsCount: 12,
        discount: 10,
        stock: p.total_stock || 15,
        inStock: p.total_stock > 0,
        sellerId: p.seller?.seller_id,
        sellerName: p.seller?.store_name,
      }));

    let all = [...initialProducts];
    approvedVendorItems.forEach((vp) => {
      if (!all.some((p) => p.id === vp.id)) {
        all.unshift(vp);
      }
    });

    if (categoryFilter && categoryFilter !== 'All') {
      all = all.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchFilter) {
      all = all.filter(
        (p) =>
          p.name.toLowerCase().includes(searchFilter) ||
          p.description.toLowerCase().includes(searchFilter) ||
          p.material.toLowerCase().includes(searchFilter)
      );
    }

    return HttpResponse.json(all, { status: 200 });
  }),

  http.get('*/products/', async ({ request }) => {
    await delay(120);
    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get('category');
    const searchFilter = (url.searchParams.get('search') || '').trim().toLowerCase();

    const approvedVendorItems: Product[] = mockVendorProducts
      .filter((p) => p.status === 'approved')
      .map((p) => ({
        id: p.id,
        name: p.title,
        price: Math.round(p.price_paise / 100),
        originalPrice: Math.round((p.price_paise / 100) * 1.15),
        category: p.category?.name || 'Handcrafted',
        condition: 'New' as const,
        conditionDetails: 'Artisan Handcrafted & Inspected',
        material: 'Natural Organic Handcrafted',
        dimensions: 'Standard Artisan Size',
        description: p.description_i18n?.en || 'Authentic handcrafted creation verified by ChillyFlakes standards.',
        features: ['100% Handcrafted', 'Zero Middlemen', 'Direct From Artisan'],
        image: p.main_image_url || '/hero-chilli.png',
        rating: 4.9,
        reviewsCount: 12,
        discount: 10,
        stock: p.total_stock || 15,
        inStock: p.total_stock > 0,
        sellerId: p.seller?.seller_id,
        sellerName: p.seller?.store_name,
      }));

    let all = [...initialProducts];
    approvedVendorItems.forEach((vp) => {
      if (!all.some((p) => p.id === vp.id)) {
        all.unshift(vp);
      }
    });

    if (categoryFilter && categoryFilter !== 'All') {
      all = all.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchFilter) {
      all = all.filter(
        (p) =>
          p.name.toLowerCase().includes(searchFilter) ||
          p.description.toLowerCase().includes(searchFilter) ||
          p.material.toLowerCase().includes(searchFilter)
      );
    }

    return HttpResponse.json(all, { status: 200 });
  }),
];
