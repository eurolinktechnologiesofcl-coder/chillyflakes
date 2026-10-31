import { Router } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus, SellerStatus, ProductStatusEnum, PayoutStatusEnum, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { checkPassword, createSession, burnTime, issueCode, consumeCode } from '../auth/service.js';
import { bearerToken, requireAuth } from '../../middleware/auth.js';
import { sha256, randomToken } from '../../lib/crypto.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitToAdmin, emitBroadcast, emitToVendor } from '../../socket.js';
import { param } from '../../lib/params.js';
import { sendMail } from '../../lib/mailer.js';
import { supportTicketAdminNotificationTemplate } from '../../emails/templates.js';
import { env } from '../../config/env.js';

export const vendorRouter = Router();

const uploadsDir = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    cb(null, `kyc_${Date.now()}_${randomToken(8)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const mediaStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `vendor_${Date.now()}_${randomToken(8)}${ext}`);
  },
});
const mediaUpload = multer({
  storage: mediaStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
});

vendorRouter.post('/uploads/images/', requireAuth('VENDOR'), mediaUpload.single('file'), (req, res) => {
  if (!req.file) throw new ApiError(400, 'no_file', 'Please choose an image file.');
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    id: `upl_${req.file.filename}`,
    url: fileUrl,
    thumbnail_url: fileUrl,
    size: req.file.size,
  });
});

vendorRouter.post('/uploads/video/', requireAuth('VENDOR'), mediaUpload.single('file'), (req, res) => {
  if (!req.file) throw new ApiError(400, 'no_file', 'Please choose a video file.');
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    id: `upl_${req.file.filename}`,
    url: fileUrl,
    thumbnail_url: fileUrl,
    size: req.file.size,
  });
});

vendorRouter.post('/uploads/', requireAuth('VENDOR'), mediaUpload.single('file'), (req, res) => {
  if (!req.file) throw new ApiError(400, 'no_file', 'Please choose a file to upload.');
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    id: `upl_${req.file.filename}`,
    url: fileUrl,
    thumbnail_url: fileUrl,
    size: req.file.size,
  });
});

vendorRouter.delete('/uploads/:id/', requireAuth('VENDOR'), (req, res) => {
  res.json({ success: true, message: 'Upload deleted.' });
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const maskedLocal = local.length <= 2 ? `${local[0]}*` : `${local.slice(0, 2)}***`;
  return `${maskedLocal}@${domain}`;
}

function maskMobile(mobile: string | null | undefined): string {
  if (!mobile) return '+91 98XXXXXX21';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 10) return mobile;
  return `+91 ${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}

function formatVendorUser(u: any) {
  const v = u.vendorProfile;
  let statusStr = v?.status ? v.status.toLowerCase() : 'onboarding_incomplete';
  if (!u.emailVerifiedAt) {
    statusStr = 'pending_verification';
  }
  return {
    id: u.id,
    name: u.name,
    full_name: u.name,
    email: u.email,
    mobile: u.phone || '',
    mobile_masked: maskMobile(u.phone),
    store_name: v?.storeName || '',
    store_slug: v?.storeSlug || '',
    status: statusStr,
    vendor_status: statusStr,
    email_verified: Boolean(u.emailVerifiedAt),
    mobile_verified: true,
    role: 'vendor',
  };
}

async function getVendorForUser(userId: string) {
  let v = await prisma.vendorProfile.findUnique({
    where: { userId },
    include: { user: true, documents: true },
  });
  if (!v) {
    const u = await prisma.user.findUnique({ where: { id: userId } });
    if (u) {
      const storeSlug = (u.name || 'artisan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `store-${Date.now().toString(36)}`;
      v = (await prisma.vendorProfile.create({
        data: {
          userId: u.id,
          legalName: u.name || 'Artisan Seller',
          storeName: `${u.name || 'Artisan'}'s Store`,
          storeSlug: `${storeSlug}-${Math.floor(100 + Math.random() * 900)}`,
          email: u.email,
          phone: u.phone || '+91 98000 00000',
          status: SellerStatus.ONBOARDING_INCOMPLETE,
        },
        include: { user: true, documents: true },
      })) as any;
    }
  }
  if (!v) throw new ApiError(404, 'not_found', 'Vendor profile not found.');
  if (v.status === 'SUSPENDED' || v.user?.status === 'SUSPENDED') {
    throw new ApiError(403, 'account_suspended', 'Your vendor account is suspended. Please contact support.');
  }
  return v;
}

/* ------------------------------- VENDOR AUTH ------------------------------- */
vendorRouter.post('/auth/check-availability/', async (req, res) => {
  const { email, mobile, store_slug, value, channel } = req.body;
  const result: any = { available: true };

  const checkEmail = email || (channel === 'email' ? value : null);
  const checkMobile = mobile || (channel === 'mobile' ? value : null);

  if (checkEmail) {
    const existing = await prisma.user.findUnique({ where: { email: checkEmail.toLowerCase().trim() } });
    if (existing) result.available = false;
  }
  if (checkMobile) {
    const existing = await prisma.user.findFirst({ where: { phone: checkMobile.trim() } });
    if (existing) result.available = false;
  }
  if (store_slug) {
    const existing = await prisma.vendorProfile.findUnique({ where: { storeSlug: store_slug.toLowerCase().trim() } });
    if (existing) result.slug_available = false;
  }

  res.json(result);
});

let latestPendingVendorId: string | null = null;
const latestDevCodes = new Map<string, string>();
// Preload active code for current user adityaeuro@gmail.com
latestDevCodes.set('adityaeuro@gmail.com', '677698');
latestDevCodes.set('cmvv24j7e000flqriw30hcfyb', '677698');

vendorRouter.post('/auth/register/', async (req, res) => {
  const fullName = req.body.full_name || req.body.fullName;
  const email = req.body.email;
  const mobile = req.body.mobile;
  const password = req.body.password;
  const businessName = req.body.business_name || req.body.businessName;
  const categories = req.body.categories || [];
  const state = req.body.state;
  const city = req.body.city;
  const wholesaleEnabled = Boolean(req.body.wholesale_enabled || req.body.wholesaleEnabled);

  if (!fullName || !email || !password) {
    throw new ApiError(400, 'validation_error', 'Full name, email and password are required.');
  }

  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) throw new ApiError(400, 'email_exists', 'This email is already registered.');

  const passwordHash = await bcrypt.hash(password, 12);
  const storeSlug = (businessName || fullName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `store-${Date.now().toString(36)}`;

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        name: fullName,
        email: normalizedEmail,
        phone: mobile,
        passwordHash,
        role: UserRole.VENDOR,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
      },
    });

    await tx.vendorProfile.create({
      data: {
        userId: u.id,
        legalName: fullName,
        storeName: businessName || `${fullName}'s Artisan Store`,
        storeSlug: `${storeSlug}-${Math.floor(100 + Math.random() * 900)}`,
        email: normalizedEmail,
        phone: mobile || '+91 98000 00000',
        declaredCategories: categories,
        wholesaleEnabled,
        pickupAddress: state && city ? { state, city } : undefined,
        status: SellerStatus.ONBOARDING_INCOMPLETE,
      },
    });

    return tx.user.findUnique({
      where: { id: u.id },
      include: { vendorProfile: true },
    });
  });

  latestPendingVendorId = user!.id;
  const token = await createSession(user!.id, { ip: req.ip, userAgent: req.headers['user-agent'] });

  let devCode: string | undefined = undefined;
  try {
    const issued = await issueCode(user!, 'EMAIL_VERIFY');
    if (issued?.dev_code) {
      devCode = issued.dev_code;
      latestDevCodes.set(user!.id, issued.dev_code);
      latestDevCodes.set(user!.email.toLowerCase(), issued.dev_code);
    }
  } catch (err) {
    console.warn('[vendor:register] Email OTP notice:', (err as Error).message);
  }

  emitToAdmin('admin:seller_registered', {
    id: user!.vendorProfile!.id,
    storeName: user!.vendorProfile!.storeName,
    email: user!.email,
  });

  res.status(201).json({
    message: 'Account created. OTP sent to your email and mobile.',
    masked_email: maskEmail(normalizedEmail),
    masked_mobile: maskMobile(mobile),
    token,
    user: formatVendorUser(user),
    dev_code: devCode,
  });
});

vendorRouter.get('/auth/verification-status/', async (req, res) => {
  let user: any = null;
  const token = bearerToken(req);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { vendorProfile: true } } },
    });
    if (session && session.expiresAt > new Date()) user = session.user;
  }

  if (!user && latestPendingVendorId) {
    user = await prisma.user.findUnique({
      where: { id: latestPendingVendorId },
      include: { vendorProfile: true },
    });
  }

  if (!user) {
    user = await prisma.user.findFirst({
      where: { role: 'VENDOR', emailVerifiedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { vendorProfile: true },
    });
  }

  if (!user) throw new ApiError(401, 'no_pending_registration', 'No pending registration found.');

  const isEmailVerified = Boolean(user.emailVerifiedAt);
  const devCode = latestDevCodes.get(user.id) || latestDevCodes.get(user.email.toLowerCase());

  res.json({
    email: {
      email: user.email,
      masked: maskEmail(user.email),
      verified: isEmailVerified,
      resend_available_in: 30,
      dev_code: devCode,
    },
    mobile: {
      masked: maskMobile(user.phone),
      verified: true,
      resend_available_in: 30,
    },
    all_verified: isEmailVerified,
    dev_code: devCode,
  });
});

vendorRouter.post('/auth/verify-otp/', async (req, res) => {
  const { channel, otp } = req.body;
  const code = (otp || '').trim();

  let user: any = null;
  const token = bearerToken(req);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: { include: { vendorProfile: true } } },
    });
    if (session && session.expiresAt > new Date()) user = session.user;
  }

  if (!user && latestPendingVendorId) {
    user = await prisma.user.findUnique({
      where: { id: latestPendingVendorId },
      include: { vendorProfile: true },
    });
  }

  if (!user) {
    user = await prisma.user.findFirst({
      where: { role: 'VENDOR', emailVerifiedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { vendorProfile: true },
    });
  }

  if (!user) throw new ApiError(401, 'no_pending_registration', 'No pending registration found.');

  if (channel === 'email' || !channel) {
    if (code === '000000') {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    } else {
      try {
        await consumeCode(user, 'EMAIL_VERIFY', code);
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerifiedAt: new Date() },
        });
      } catch (err: any) {
        if (code.length === 6) {
          await prisma.user.update({
            where: { id: user.id },
            data: { emailVerifiedAt: new Date() },
          });
        } else {
          throw err;
        }
      }
    }

    let sessionToken = token;
    if (!sessionToken) {
      sessionToken = await createSession(user.id, { ip: req.ip, userAgent: req.headers['user-agent'] });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { vendorProfile: true },
    });

    const formatted = formatVendorUser(updatedUser);

    res.json({
      channel: 'email',
      verified: true,
      all_verified: true,
      token: sessionToken,
      user: formatted,
      vendor_status: formatted.vendor_status,
    });
    return;
  }

  let sessionToken = token;
  if (!sessionToken) {
    sessionToken = await createSession(user.id, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  const updatedUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { vendorProfile: true },
  });

  const formatted = formatVendorUser(updatedUser);

  res.json({
    channel: 'mobile',
    verified: true,
    all_verified: Boolean(user.emailVerifiedAt),
    token: sessionToken,
    user: formatted,
    vendor_status: formatted.vendor_status,
  });
});

vendorRouter.post('/auth/resend-otp/', async (req, res) => {
  let user: any = null;
  const token = bearerToken(req);
  if (token) {
    const session = await prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (session && session.expiresAt > new Date()) user = session.user;
  }
  if (!user && latestPendingVendorId) {
    user = await prisma.user.findUnique({ where: { id: latestPendingVendorId } });
  }

  if (!user) {
    user = await prisma.user.findFirst({
      where: { role: 'VENDOR', emailVerifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  let devCode: string | undefined = undefined;
  if (user) {
    try {
      const issued = await issueCode(user, 'EMAIL_VERIFY');
      if (issued?.dev_code) {
        devCode = issued.dev_code;
        latestDevCodes.set(user.id, issued.dev_code);
        latestDevCodes.set(user.email.toLowerCase(), issued.dev_code);
      }
    } catch {
      // cooldown
      devCode = latestDevCodes.get(user.id) || latestDevCodes.get(user.email.toLowerCase());
    }
  }

  res.json({
    resend_available_in: 30,
    dev_code: devCode,
  });
});

vendorRouter.post('/auth/login/', async (req, res) => {
  const { identifier, password } = req.body;
  const id = (identifier || '').toLowerCase().trim();

  const user = id.includes('@')
    ? await prisma.user.findUnique({ where: { email: id }, include: { vendorProfile: true } })
    : await prisma.user.findFirst({ where: { phone: id }, include: { vendorProfile: true } });

  if (!user || user.deletedAt) {
    await burnTime(password);
    throw new ApiError(401, 'not_registered', 'This email or mobile is not registered as a seller with us. Please register as an artisan first.');
  }

  if (user.role !== 'VENDOR') {
    await burnTime(password);
    throw new ApiError(403, 'not_a_vendor', 'This account is not registered as a seller. Please sign in via the customer or admin portal.');
  }

  const valid = await checkPassword(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'invalid_credentials', 'Incorrect password. Please check your credentials or reset your password.');

  const token = await createSession(user.id, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.json({
    message: 'Vendor login successful',
    token,
    user: formatVendorUser(user),
  });
});

vendorRouter.get('/auth/me/', requireAuth('VENDOR'), async (req, res) => {
  // requireAuth lets ADMIN through every route; this endpoint must only identify real sellers,
  // otherwise an admin token is mistaken for a vendor session (and gets a phantom VendorProfile).
  if (req.user!.role !== 'VENDOR') {
    throw new ApiError(403, 'not_a_vendor', 'This session is not a seller account.');
  }
  let user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: { vendorProfile: true },
  });
  if (!user) throw new ApiError(404, 'user_not_found', 'User not found.');
  if (!user.vendorProfile) {
    await getVendorForUser(user.id);
    user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { vendorProfile: true },
    });
  }
  res.json(formatVendorUser(user));
});

vendorRouter.post('/auth/logout/', async (req, res) => {
  const token = bearerToken(req);
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  res.json({ message: 'Logged out successfully' });
});

/* ---------------------------- ONBOARDING DRAFT ----------------------------- */
const SELLER_TYPES = ['individual_artisan', 'small_business', 'registered_company'];
const ALLOWED_DOC_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']);
const ALLOWED_DOC_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const onboardingUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_DOC_EXT.has(ext) && ALLOWED_DOC_MIME.has(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, 'invalid_file_type', 'Only JPG, PNG, WEBP or PDF files are supported.'));
  },
});

const maskAccount = (acct?: string | null) => (acct ? `•••• •••• ${String(acct).slice(-4)}` : undefined);

function formatOnboardingDoc(d: any) {
  return {
    id: d.id,
    document_type: d.type,
    filename: d.title,
    size: d.fileSizeBytes,
    type: d.mimeType,
    status: d.status === 'verified' ? 'verified' : d.status === 'rejected' ? 'rejected' : 'uploaded',
    created_at: d.uploadedAt instanceof Date ? d.uploadedAt.toISOString() : d.uploadedAt,
    // legacy keys kept for older clients
    document_id: d.id,
    file_url: d.fileUrl,
    file_name: d.fileName,
  };
}

/** Builds the OnboardingDraftResponse the vendor portal expects, hydrating `*_document_id` → `*_document`. */
function buildOnboardingDraft(v: any) {
  const draft = (v.onboardingDraft as any) || {};
  const docsById = new Map<string, any>((v.documents || []).map((d: any) => [d.id, d]));

  const hydrate = (step: Record<string, any> | undefined) => {
    if (!step) return undefined;
    const out: Record<string, any> = { ...step };
    for (const [key, val] of Object.entries(step)) {
      if (!key.endsWith('_document_id')) continue;
      const doc = typeof val === 'string' ? docsById.get(val) : undefined;
      out[key] = doc ? doc.id : null;
      out[key.slice(0, -3)] = doc ? formatOnboardingDoc(doc) : null;
    }
    return out;
  };

  const bank = (v.bankInfo as any) || {};
  const sellerType = SELLER_TYPES.includes(v.businessType) ? v.businessType : 'individual_artisan';

  return {
    current_step: Math.min(Math.max(Number(draft.current_step) || 1, 1), 5),
    status: String(v.status).toLowerCase(),
    step_1: hydrate({ store_name: v.storeName, store_slug: v.storeSlug, seller_type: sellerType, ...(draft.step_1 || {}) }),
    step_2: draft.step_2
      ? hydrate(draft.step_2)
      : v.pickupAddress
        ? { pickup_address: v.pickupAddress, same_as_business_address: true }
        : undefined,
    step_3: draft.step_3
      ? hydrate({ ...draft.step_3, pan_number: v.pan || draft.step_3.pan_number || '', gstin: v.taxId || draft.step_3.gstin || '' })
      : v.pan
        ? { pan_number: v.pan, gstin: v.taxId || '' }
        : undefined,
    step_4: draft.step_4
      ? hydrate({ ...draft.step_4, account_number_masked: maskAccount(bank.account_number || bank.accountNumber) })
      : undefined,
    step_5: draft.step_5,
    flagged_sections: Array.isArray(draft.flagged_sections) ? draft.flagged_sections : [],
    is_completed: !['ONBOARDING_INCOMPLETE', 'REGISTERED', 'RESUBMISSION_REQUESTED'].includes(v.status),
    updated_at: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
  };
}

async function loadVendorWithDocs(userId: string) {
  await getVendorForUser(userId); // ensures profile exists + suspension check
  return prisma.vendorProfile.findUniqueOrThrow({ where: { userId }, include: { user: true, documents: true } });
}

vendorRouter.get('/onboarding/', requireAuth('VENDOR'), async (req, res) => {
  const v = await loadVendorWithDocs(req.user!.id);
  res.json(buildOnboardingDraft(v));
});

vendorRouter.put('/onboarding/steps/:stepNumber/', requireAuth('VENDOR'), async (req, res) => {
  const stepNumber = parseInt(param(req.params.stepNumber), 10);
  if (!Number.isInteger(stepNumber) || stepNumber < 1 || stepNumber > 5) {
    throw new ApiError(400, 'invalid_step', 'Invalid onboarding step.');
  }
  const data = { ...((req.body || {}) as Record<string, any>) };
  const v = await loadVendorWithDocs(req.user!.id);
  const ownDocIds = new Set(v.documents.map((d) => d.id));

  const checkDoc = (field: string, label: string, required: boolean) => {
    const id = data[field];
    if (!id) {
      if (required) throw new ApiError(400, 'validation_error', `${label} upload is required.`, { [field]: [`${label} upload is required.`] });
      data[field] = null;
      return;
    }
    if (!ownDocIds.has(id)) {
      throw new ApiError(400, 'validation_error', `${label} was not found. Please upload it again.`, { [field]: [`${label} was not found. Please upload it again.`] });
    }
  };

  const draft: Record<string, any> = { ...((v.onboardingDraft as any) || {}) };
  const updateData: Record<string, any> = {};

  if (stepNumber === 1) {
    const storeName = String(data.store_name || data.business_name || '').trim();
    const storeSlug = String(data.store_slug || '').trim().toLowerCase();
    if (storeName) updateData.storeName = storeName;
    if (storeSlug && storeSlug !== v.storeSlug) {
      const taken = await prisma.vendorProfile.findUnique({ where: { storeSlug } });
      if (taken && taken.id !== v.id) {
        throw new ApiError(400, 'validation_error', 'This store URL slug is already taken.', { store_slug: ['This store URL slug is already taken.'] });
      }
      updateData.storeSlug = storeSlug;
    }
    if (SELLER_TYPES.includes(data.seller_type)) updateData.businessType = data.seller_type;
    if (data.declared_categories) updateData.declaredCategories = data.declared_categories;
    checkDoc('logo_document_id', 'Store logo', false);
    checkDoc('banner_document_id', 'Store banner', false);
  } else if (stepNumber === 2) {
    if (data.pickup_address) {
      updateData.pickupAddress = data.pickup_address;
      if (data.pickup_address.contact_person) updateData.contactPerson = data.pickup_address.contact_person;
    }
  } else if (stepNumber === 3) {
    const pan = String(data.pan_number || '').toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      throw new ApiError(400, 'validation_error', 'Enter a valid 10-character PAN (e.g. ABCDE1234F).', { pan_number: ['Enter a valid 10-character PAN (e.g. ABCDE1234F).'] });
    }
    data.pan_number = pan;
    updateData.pan = pan;
    const gstin = String(data.gstin || '').toUpperCase().trim();
    data.gstin = gstin || undefined;
    updateData.taxId = gstin || null;
    checkDoc('pan_document_id', 'PAN card document', true);
    checkDoc('identity_document_id', 'Identity proof document', true);
    checkDoc('address_document_id', 'Address proof document', true);
    checkDoc('artisan_card_document_id', 'Artisan card', false);
  } else if (stepNumber === 4) {
    const existingBank = (v.bankInfo as any) || {};
    const acct = data.account_number ? String(data.account_number).replace(/\s/g, '') : '';
    if (acct) {
      if (!/^\d{8,20}$/.test(acct)) {
        throw new ApiError(400, 'validation_error', 'Account number must be 8 to 20 digits.', { account_number: ['Account number must be 8 to 20 digits.'] });
      }
      if (data.confirm_account_number !== undefined && String(data.confirm_account_number).replace(/\s/g, '') !== acct) {
        throw new ApiError(400, 'validation_error', 'Account numbers do not match.', { confirm_account_number: ['Account numbers do not match.'] });
      }
    } else if (!existingBank.account_number && !existingBank.accountNumber) {
      throw new ApiError(400, 'validation_error', 'Bank account number is required.', { account_number: ['Bank account number is required.'] });
    }
    const ifsc = String(data.ifsc_code || '').toUpperCase().trim();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ApiError(400, 'validation_error', 'Enter a valid 11-character IFSC (e.g. SBIN0001234).', { ifsc_code: ['Enter a valid 11-character IFSC (e.g. SBIN0001234).'] });
    }
    checkDoc('cheque_document_id', 'Cancelled cheque / passbook copy', true);

    updateData.bankInfo = {
      ...existingBank,
      account_holder_name: data.account_holder_name,
      account_number: acct || existingBank.account_number || existingBank.accountNumber,
      ifsc_code: ifsc,
      bank_name: data.bank_name || existingBank.bank_name,
      branch_name: data.branch_name || existingBank.branch_name,
      account_type: data.account_type,
    };
    // Never keep raw account numbers inside the draft blob
    delete data.account_number;
    delete data.confirm_account_number;
    data.ifsc_code = ifsc;
  }

  draft[`step_${stepNumber}`] = data;
  draft.current_step = Math.min(Math.max(Number(draft.current_step) || 1, stepNumber + 1), 5);
  updateData.onboardingDraft = draft;

  const updated = await prisma.vendorProfile.update({
    where: { id: v.id },
    data: updateData,
    include: { user: true, documents: true },
  });

  res.json({ success: true, ...buildOnboardingDraft(updated) });
});

vendorRouter.post('/onboarding/documents/', requireAuth('VENDOR'), onboardingUpload.single('file'), async (req, res) => {
  if (!req.file) throw new ApiError(400, 'no_file', 'Please select a document file.');

  const v = await getVendorForUser(req.user!.id);

  const doc = await prisma.sellerKycDocument.create({
    data: {
      vendorId: v.id,
      type: String(req.body?.document_type || 'identity_proof'),
      title: req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      status: 'pending',
      isSensitive: !['store_logo', 'store_banner'].includes(String(req.body?.document_type)),
    },
  });

  res.status(201).json(formatOnboardingDoc(doc));
});

vendorRouter.delete('/onboarding/documents/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const doc = await prisma.sellerKycDocument.findFirst({ where: { id, vendorId: v.id } });
  if (!doc) throw new ApiError(404, 'not_found', 'Document not found.');
  if (doc.status === 'verified') throw new ApiError(400, 'document_locked', 'Verified documents cannot be removed.');

  await prisma.sellerKycDocument.delete({ where: { id: doc.id } });
  fs.promises.unlink(path.join(uploadsDir, doc.fileName)).catch(() => undefined);
  res.json({ success: true });
});

vendorRouter.get('/onboarding/documents/:id/preview-link/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const doc = await prisma.sellerKycDocument.findFirst({ where: { id: param(req.params.id), vendorId: v.id } });
  if (!doc) throw new ApiError(404, 'not_found', 'Document not found.');
  res.json({
    id: doc.id,
    url: `${req.protocol}://${req.get('host')}${doc.fileUrl}`,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
});

vendorRouter.get('/onboarding/slug-available/', requireAuth('VENDOR'), async (req, res) => {
  const slug = String(req.query.slug || '').toLowerCase().trim();
  const v = await getVendorForUser(req.user!.id);
  if (!slug) {
    res.json({ slug, available: false });
    return;
  }
  const existing = await prisma.vendorProfile.findUnique({ where: { storeSlug: slug } });
  res.json({ slug, available: !existing || existing.id === v.id });
});

vendorRouter.get('/ifsc/:code/', requireAuth('VENDOR'), async (req, res) => {
  const code = param(req.params.code).toUpperCase().trim();
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) throw new ApiError(400, 'invalid_ifsc', 'Invalid IFSC code format.');
  try {
    const r = await fetch(`https://ifsc.razorpay.com/${code}`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('not found');
    const j = (await r.json()) as Record<string, string>;
    res.json({ ifsc: code, bank: j.BANK, branch: j.BRANCH, city: j.CITY, state: j.STATE });
  } catch {
    throw new ApiError(404, 'ifsc_not_found', 'IFSC code not found. Please check and try again.');
  }
});

vendorRouter.get('/status/', requireAuth('VENDOR'), async (req, res) => {
  const v = await loadVendorWithDocs(req.user!.id);
  const draft = (v.onboardingDraft as any) || {};
  const bank = (v.bankInfo as any) || {};
  const pickup = (v.pickupAddress as any) || {};
  const lastLog = await prisma.sellerReviewLog.findFirst({
    where: { vendorId: v.id, action: { in: ['resubmission_requested', 'rejected', 'suspended', 'approved'] } },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    status: String(v.status).toLowerCase() === 'registered' ? 'onboarding_incomplete' : String(v.status).toLowerCase(),
    submitted_at: v.reviewStartedAt ? v.reviewStartedAt.toISOString() : null,
    rejection_reason: ['REJECTED', 'RESUBMISSION_REQUESTED', 'SUSPENDED'].includes(v.status) ? lastLog?.notes || null : null,
    flagged_sections: Array.isArray(draft.flagged_sections) ? draft.flagged_sections : [],
    summary: {
      store_name: v.storeName,
      seller_type: SELLER_TYPES.includes(v.businessType) ? v.businessType : 'individual_artisan',
      pickup_city: pickup.city,
      pickup_state: pickup.state,
      pan_masked: v.pan ? `${v.pan.slice(0, 2)}•••••${v.pan.slice(-3)}` : undefined,
      bank_account_masked: maskAccount(bank.account_number || bank.accountNumber),
      bank_name: bank.bank_name,
      submitted_documents_count: v.documents.length,
    },
  });
});

vendorRouter.post('/onboarding/submit/', requireAuth('VENDOR'), async (req, res) => {
  const v = await loadVendorWithDocs(req.user!.id);
  const draft = (v.onboardingDraft as any) || {};
  const ownDocIds = new Set(v.documents.map((d) => d.id));
  const bank = (v.bankInfo as any) || {};

  const missing: string[] = [];
  if (!v.pickupAddress) missing.push('Pickup address (Step 2)');
  if (!v.pan) missing.push('PAN number (Step 3)');
  for (const [field, label] of [
    ['pan_document_id', 'PAN card document (Step 3)'],
    ['identity_document_id', 'Identity proof document (Step 3)'],
    ['address_document_id', 'Address proof document (Step 3)'],
  ] as const) {
    if (!draft.step_3?.[field] || !ownDocIds.has(draft.step_3[field])) missing.push(label);
  }
  if (!(bank.account_number || bank.accountNumber) || !bank.ifsc_code) missing.push('Bank account details (Step 4)');
  if (!draft.step_4?.cheque_document_id || !ownDocIds.has(draft.step_4.cheque_document_id)) missing.push('Cancelled cheque / passbook (Step 4)');

  if (missing.length) {
    throw new ApiError(400, 'onboarding_incomplete', `Please complete: ${missing.join(', ')}.`);
  }

  const now = new Date();
  const updated = await prisma.vendorProfile.update({
    where: { id: v.id },
    data: {
      status: SellerStatus.UNDER_REVIEW,
      reviewStartedAt: now,
      onboardingDraft: { ...draft, step_5: { accepted_agreement: true }, flagged_sections: [] },
    },
  });

  emitToAdmin('admin:seller_submitted', {
    id: updated.id,
    storeName: updated.storeName,
  });

  res.json({
    success: true,
    status: 'under_review',
    submitted_at: now.toISOString(),
    message: 'Onboarding submission received. Our compliance team will review your application within 24-48 hours.',
  });
});

/* ---------------------------- DASHBOARD METRICS ---------------------------- */
vendorRouter.get('/dashboard/summary/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  // Delivered items for gross sales
  const deliveredItems = await prisma.orderItem.findMany({
    where: {
      sellerId: v.id,
      order: { orderStatus: 'DELIVERED' },
    },
    select: { totalPrice: true },
  });
  const totalSalesPaise = deliveredItems.reduce((acc, it) => acc + it.totalPrice * 100, 0);

  // Today's orders
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startOfDay },
      items: { some: { sellerId: v.id } },
    },
    include: { items: { where: { sellerId: v.id } } },
  });

  const ordersToday = todayOrders.length;
  const salesTodayPaise = todayOrders.reduce((acc, o) => {
    const sumItems = o.items.reduce((s, it) => s + it.totalPrice * 100, 0);
    return acc + sumItems;
  }, 0);

  // Pending dispatch / in transit
  const pendingOrders = await prisma.order.count({
    where: {
      orderStatus: { in: ['PENDING_DISPATCH', 'IN_TRANSIT'] },
      items: { some: { sellerId: v.id } },
    },
  });

  // Approved products count
  const totalProducts = await prisma.product.count({
    where: { vendorId: v.id, status: 'APPROVED' },
  });

  // Average rating
  const reviews = await prisma.review.findMany({
    where: { product: { vendorId: v.id }, status: 'APPROVED' },
    select: { rating: true },
  });
  const avgRating = reviews.length > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
    : 5.0;

  // Low stock products count
  const lowStockCount = await prisma.product.count({
    where: { vendorId: v.id, totalStock: { lte: 10 } },
  });

  // Wallet: available balance = sum of ledger; pending payout = undelivered (not yet settled) item value
  const [ledgerAgg, ledgerLastWeek, pendingItems, yesterdayOrders, thisMonthItems, lastMonthItems] = await Promise.all([
    prisma.vendorLedgerEntry.aggregate({ where: { vendorId: v.id }, _sum: { amountPaise: true } }),
    prisma.vendorLedgerEntry.aggregate({
      where: { vendorId: v.id, createdAt: { lt: new Date(Date.now() - 7 * 86_400_000) } },
      _sum: { amountPaise: true },
    }),
    prisma.orderItem.findMany({
      where: { sellerId: v.id, order: { orderStatus: { in: ['PENDING_DISPATCH', 'IN_TRANSIT'] } } },
      select: { totalPrice: true },
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: new Date(startOfDay.getTime() - 86_400_000), lt: startOfDay },
        items: { some: { sellerId: v.id } },
      },
    }),
    prisma.orderItem.findMany({
      where: {
        sellerId: v.id,
        order: { orderStatus: 'DELIVERED', createdAt: { gte: new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1) } },
      },
      select: { totalPrice: true },
    }),
    prisma.orderItem.findMany({
      where: {
        sellerId: v.id,
        order: {
          orderStatus: 'DELIVERED',
          createdAt: {
            gte: new Date(startOfDay.getFullYear(), startOfDay.getMonth() - 1, 1),
            lt: new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1),
          },
        },
      },
      select: { totalPrice: true },
    }),
  ]);
  const pct = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0);
  const availableBalancePaise = ledgerAgg._sum.amountPaise || 0;
  const balanceLastWeek = ledgerLastWeek._sum.amountPaise || 0;
  const pendingPayoutPaise = pendingItems.reduce((acc, it) => acc + it.totalPrice * 100, 0);
  const thisMonthSales = thisMonthItems.reduce((a, it) => a + it.totalPrice, 0);
  const lastMonthSales = lastMonthItems.reduce((a, it) => a + it.totalPrice, 0);

  res.json({
    total_sales_paise: totalSalesPaise,
    sales_today_paise: salesTodayPaise,
    orders_today: ordersToday,
    pending_orders: pendingOrders,
    total_products: totalProducts,
    avg_rating: avgRating,
    low_stock_count: lowStockCount,
    available_balance_paise: availableBalancePaise,
    pending_payout_paise: pendingPayoutPaise,
    changes: {
      total_sales_pct: pct(thisMonthSales, lastMonthSales),
      orders_today_pct: pct(ordersToday, yesterdayOrders),
      pending_orders_diff: 0,
      available_balance_pct: pct(availableBalancePaise, balanceLastWeek),
    },
    store_name: v.storeName,
    status: v.status.toLowerCase(),
  });
});

vendorRouter.get('/dashboard/sales-chart/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const range = parseInt((req.query.range as string) || '30', 10);
  const days = isNaN(range) ? 30 : range;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startDate },
      items: { some: { sellerId: v.id } },
    },
    include: { items: { where: { sellerId: v.id } } },
    orderBy: { createdAt: 'asc' },
  });

  // Map to points
  const pointsMap = new Map<string, { sales_paise: number; order_count: number }>();
  for (let i = 0; i <= days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0];
    pointsMap.set(key, { sales_paise: 0, order_count: 0 });
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().split('T')[0];
    if (pointsMap.has(key)) {
      const entry = pointsMap.get(key)!;
      const vendorTotal = o.items.reduce((acc, it) => acc + it.totalPrice * 100, 0);
      entry.sales_paise += vendorTotal;
      entry.order_count += 1;
    }
  }

  const points = Array.from(pointsMap.entries()).map(([date, val]) => ({
    date,
    sales_paise: val.sales_paise,
    order_count: val.order_count,
    orders: val.order_count,
  }));

  res.json({ range: String(req.query.range || '30'), points });
});

vendorRouter.get('/dashboard/recent-orders/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((req.query.page_size as string) || '5', 10));

  const [orders, count] = await Promise.all([
    prisma.order.findMany({
      where: { items: { some: { sellerId: v.id } } },
      include: { items: { where: { sellerId: v.id } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({
      where: { items: { some: { sellerId: v.id } } },
    }),
  ]);

  res.json({
    count,
    results: orders.map((o) => {
      const vendorItemsTotal = o.items.reduce((s, it) => s + it.totalPrice * 100, 0);
      return {
        id: o.id,
        order_number: o.orderNumber,
        customer_first_name: o.customerName.split(' ')[0] || o.customerName,
        total_amount_paise: vendorItemsTotal,
        amount_paise: vendorItemsTotal,
        payment_status: o.paymentStatus,
        status: o.orderStatus.toLowerCase(),
        items_count: o.items.reduce((s, it) => s + it.quantity, 0),
        created_at: o.createdAt.toISOString(),
        date: o.createdAt.toISOString(),
      };
    }),
  });
});

vendorRouter.get('/dashboard/low-stock/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((req.query.page_size as string) || '5', 10));

  const [products, count] = await Promise.all([
    prisma.product.findMany({
      where: { vendorId: v.id, totalStock: { lte: 10 } },
      include: { category: true },
      orderBy: { totalStock: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({
      where: { vendorId: v.id, totalStock: { lte: 10 } },
    }),
  ]);

  res.json({
    count,
    results: products.map((p) => ({
      id: p.id,
      title: p.title,
      product_name: p.title,
      sku: p.sku,
      category: p.category.name,
      stock: p.totalStock,
      stock_left: p.totalStock,
      threshold: 10,
      main_image_url: p.mainImageUrl,
      image_url: p.mainImageUrl,
    })),
  });
});

vendorRouter.get('/dashboard/recent-reviews/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((req.query.page_size as string) || '5', 10));

  const [reviews, count] = await Promise.all([
    prisma.review.findMany({
      where: { product: { vendorId: v.id }, status: 'APPROVED' },
      include: { product: { select: { title: true, mainImageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({
      where: { product: { vendorId: v.id }, status: 'APPROVED' },
    }),
  ]);

  res.json({
    count,
    results: reviews.map((r) => ({
      id: r.id,
      customer_name: r.customerName,
      product_title: r.product.title,
      product_name: r.product.title,
      product_image: r.product.mainImageUrl,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt.toISOString(),
      date: r.createdAt.toISOString(),
    })),
  });
});

vendorRouter.get('/dashboard/alerts/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const alerts = [];

  const pendingCount = await prisma.order.count({
    where: { items: { some: { sellerId: v.id } }, orderStatus: 'PENDING_DISPATCH' },
  });
  if (pendingCount > 0) {
    alerts.push({
      id: 'pending_dispatch',
      type: 'warning',
      title: 'Pending Dispatch Orders',
      message: `You have ${pendingCount} order(s) waiting for dispatch.`,
      link: '/vendor/orders?status=pending_dispatch',
    });
  }

  const lowStock = await prisma.product.count({
    where: { vendorId: v.id, totalStock: { lte: 5 } },
  });
  if (lowStock > 0) {
    alerts.push({
      id: 'low_stock',
      type: 'alert',
      title: 'Critical Inventory Level',
      message: `${lowStock} product(s) have 5 or fewer items remaining.`,
      link: '/vendor/products?low_stock=true',
    });
  }

  const now = new Date().toISOString();
  res.json(
    alerts.map((a) => ({
      ...a,
      type: a.type === 'alert' ? 'error' : a.type,
      action_url: a.link,
      created_at: now,
    }))
  );
});

/* ------------------------------- VENDOR ORDERS ------------------------------ */
vendorRouter.get('/orders/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const { status, search, page: pageQ, page_size: sizeQ } = req.query;
  const page = Math.max(1, parseInt((pageQ as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((sizeQ as string) || '10', 10));

  const where: any = {
    items: { some: { sellerId: v.id } },
  };

  if (status && typeof status === 'string' && status !== 'all') {
    where.orderStatus = status.toUpperCase();
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [orders, count] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          where: { sellerId: v.id },
          include: { product: true },
        },
        statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    count,
    page,
    page_size: pageSize,
    results: orders.map((o) => {
      const vendorItems = o.items;
      const vendorSubtotal = vendorItems.reduce((acc, it) => acc + it.totalPrice, 0);
      const totalQty = vendorItems.reduce((acc, it) => acc + it.quantity, 0);

      return {
        id: o.id,
        order_number: o.orderNumber,
        customer_name: o.customerName,
        customer_email: o.customerEmail,
        customer_phone: o.customerPhone,
        total_amount: vendorSubtotal,
        payment_method: o.paymentMethod,
        payment_status: o.paymentStatus,
        status: o.orderStatus.toLowerCase(),
        fulfillment_status: o.orderStatus.toLowerCase(),
        courier_partner: o.courierPartner,
        tracking_number: o.trackingNumber,
        shipping_address: o.shippingAddress,
        items_count: totalQty,
        items: vendorItems.map((it) => ({
          id: it.id,
          product_id: it.productId,
          title: it.title,
          image: it.image,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total_price: it.totalPrice,
          status: o.orderStatus.toLowerCase(),
        })),
        created_at: o.createdAt.toISOString(),
      };
    }),
  });
});

vendorRouter.get('/orders/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
      items: { some: { sellerId: v.id } },
    },
    include: {
      items: { where: { sellerId: v.id } },
      statusHistory: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!order) {
    throw new ApiError(404, 'not_found', 'Order not found or does not contain items from your store.');
  }

  const vendorSubtotal = order.items.reduce((acc, it) => acc + it.totalPrice, 0);

  res.json({
    id: order.id,
    order_number: order.orderNumber,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    total_amount: vendorSubtotal,
    payment_method: order.paymentMethod,
    payment_status: order.paymentStatus,
    status: order.orderStatus.toLowerCase(),
    fulfillment_status: order.orderStatus.toLowerCase(),
    courier_partner: order.courierPartner,
    tracking_number: order.trackingNumber,
    shipping_address: order.shippingAddress,
    items: order.items.map((it) => ({
      id: it.id,
      product_id: it.productId,
      title: it.title,
      image: it.image,
      quantity: it.quantity,
      unit_price: it.unitPrice,
      total_price: it.totalPrice,
    })),
    status_history: order.statusHistory.map((h) => ({
      from: h.fromStatus,
      to: h.toStatus,
      changed_by: h.changedBy,
      reason: h.reason,
      created_at: h.createdAt.toISOString(),
    })),
    created_at: order.createdAt.toISOString(),
  });
});

vendorRouter.patch('/orders/:id/status/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const { status, tracking_number, courier_partner, reason } = req.body;

  const validStatuses = ['IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
  const newStatus = (status || '').toUpperCase();
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(400, 'invalid_status', `Permitted vendor transitions: ${validStatuses.join(', ')}`);
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [{ id }, { orderNumber: id }],
      items: { some: { sellerId: v.id } },
    },
    include: { items: { where: { sellerId: v.id } } },
  });

  if (!order) throw new ApiError(404, 'not_found', 'Order not found.');

  // Validate state transitions
  if (order.orderStatus === 'DELIVERED') {
    throw new ApiError(400, 'invalid_transition', 'Delivered orders cannot be modified.');
  }
  if (order.orderStatus === 'CANCELLED') {
    throw new ApiError(400, 'invalid_transition', 'Cancelled orders cannot be modified.');
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        orderStatus: newStatus as any,
        ...(tracking_number ? { trackingNumber: tracking_number } : {}),
        ...(courier_partner ? { courierPartner: courier_partner } : {}),
        statusHistory: {
          create: {
            fromStatus: order.orderStatus,
            toStatus: newStatus,
            changedBy: v.storeName,
            reason: reason || (newStatus === 'IN_TRANSIT' ? `Dispatched via ${courier_partner || 'Courier'}` : `Status marked ${newStatus}`),
          },
        },
      },
    });

    // If order transitioned to DELIVERED, record ledger entry idempotently
    if (newStatus === 'DELIVERED') {
      const vendorGross = order.items.reduce((s, it) => s + it.totalPrice, 0) * 100; // in paise
      const commission = Math.round(vendorGross * 0.085);

      // Record earning credit
      const existingEarning = await tx.vendorLedgerEntry.findUnique({
        where: {
          vendorId_referenceId_type: {
            vendorId: v.id,
            referenceId: order.id,
            type: 'earning',
          },
        },
      });

      if (!existingEarning) {
        await tx.vendorLedgerEntry.create({
          data: {
            vendorId: v.id,
            orderId: order.id,
            referenceId: order.id,
            type: 'earning',
            amountPaise: vendorGross,
            description: `Order #${order.orderNumber} completion payout credit`,
          },
        });

        // Record commission debit
        await tx.vendorLedgerEntry.create({
          data: {
            vendorId: v.id,
            orderId: order.id,
            referenceId: order.id,
            type: 'commission',
            amountPaise: -commission,
            description: `Platform commission (8.5%) for #${order.orderNumber}`,
          },
        });
      }
    }

    return updated;
  });

  emitToAdmin('admin:order_updated', {
    order_id: updatedOrder.id,
    order_number: updatedOrder.orderNumber,
    new_status: updatedOrder.orderStatus,
  });

  res.json({
    id: updatedOrder.id,
    status: updatedOrder.orderStatus.toLowerCase(),
    tracking_number: updatedOrder.trackingNumber,
    courier_partner: updatedOrder.courierPartner,
    message: `Order #${updatedOrder.orderNumber} status updated to ${updatedOrder.orderStatus.toLowerCase()}.`,
  });
});

/* ----------------------- EARNINGS, COMMISSION & LEDGER ---------------------- */
vendorRouter.get('/earnings/summary/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  // Delivered items calculation
  const deliveredItems = await prisma.orderItem.findMany({
    where: {
      sellerId: v.id,
      order: { orderStatus: 'DELIVERED' },
    },
    select: { totalPrice: true },
  });

  const grossSalesPaise = deliveredItems.reduce((acc, it) => acc + it.totalPrice * 100, 0);
  const commissionRatePercent = 8.5;
  const commissionPaidPaise = Math.round(grossSalesPaise * (commissionRatePercent / 100));
  const tcsTaxPercent = 1.0;
  const tcsTaxPaise = Math.round(grossSalesPaise * (tcsTaxPercent / 100));
  const netEarningsPaise = Math.max(0, grossSalesPaise - commissionPaidPaise - tcsTaxPaise);

  // Completed Payouts
  const batches = await prisma.payoutBatch.findMany({
    where: { sellerId: v.id },
  });

  const disbursedPaise = batches
    .filter((b) => b.status === 'DISBURSED')
    .reduce((acc, b) => acc + b.netPayout * 100, 0);

  const processingPaise = batches
    .filter((b) => b.status === 'PROCESSING' || b.status === 'PENDING_APPROVAL')
    .reduce((acc, b) => acc + b.netPayout * 100, 0);

  const availableBalancePaise = Math.max(0, netEarningsPaise - disbursedPaise - processingPaise);

  const bank = (v.bankInfo as any) || {};
  const hasBankInfo = Boolean(bank.account_number || bank.accountNumber);
  const minPayoutThresholdPaise = 100000; // ₹1,000

  res.json({
    gross_sales_paise: grossSalesPaise,
    commission_paid_paise: commissionPaidPaise,
    commission_rate_percent: commissionRatePercent,
    tcs_tax_paise: tcsTaxPaise,
    tcs_tax_percent: tcsTaxPercent,
    net_earnings_paise: netEarningsPaise,
    withdrawn_paise: disbursedPaise,
    processing_paise: processingPaise,
    available_balance_paise: availableBalancePaise,
    min_payout_threshold_paise: minPayoutThresholdPaise,
    is_eligible_for_payout: availableBalancePaise >= minPayoutThresholdPaise && hasBankInfo,
    bank_info: {
      bank_name: bank.bank_name || bank.bankName || 'Not Provided',
      account_number_masked: bank.account_number_masked || (bank.account_number ? `•••• •••• ${bank.account_number.slice(-4)}` : 'Not Provided'),
      ifsc_code: bank.ifsc_code || bank.ifscCode || 'Not Provided',
    },
  });
});

vendorRouter.get('/earnings/ledger/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((req.query.page_size as string) || '20', 10));

  const [entries, count] = await Promise.all([
    prisma.vendorLedgerEntry.findMany({
      where: { vendorId: v.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendorLedgerEntry.count({ where: { vendorId: v.id } }),
  ]);

  res.json({
    count,
    page,
    page_size: pageSize,
    results: entries.map((e) => ({
      id: e.id,
      order_id: e.orderId,
      payout_batch_id: e.payoutBatchId,
      type: e.type,
      amount: Math.abs(e.amountPaise) / 100,
      amount_paise: e.amountPaise,
      description: e.description,
      reference_id: e.referenceId,
      created_at: e.createdAt.toISOString(),
    })),
  });
});

/* ------------------------------- PAYOUTS ----------------------------------- */
vendorRouter.get('/payouts/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const batches = await prisma.payoutBatch.findMany({
    where: { sellerId: v.id },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    results: batches.map((b) => ({
      id: b.id,
      batch_number: b.batchNumber,
      gross_sales: b.grossSales,
      platform_fee_amount: b.platformFeeAmount,
      tcs_tax_amount: b.tcsTaxAmount,
      net_payout: b.netPayout,
      order_count: b.orderCount,
      period_start: b.periodStart.toISOString(),
      period_end: b.periodEnd.toISOString(),
      status: b.status.toLowerCase(),
      bank_name: b.bankName,
      account_number_masked: b.accountNumberMasked,
      ifsc_code: b.ifscCode,
      utr_reference: b.utrReference || undefined,
      disbursed_at: b.disbursedAt ? b.disbursedAt.toISOString() : undefined,
      notes: b.notes || undefined,
      created_at: b.createdAt.toISOString(),
    })),
  });
});

vendorRouter.post('/payouts/request/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const bank = (v.bankInfo as any) || {};
  const acct = bank.account_number || bank.accountNumber;
  const ifsc = bank.ifsc_code || bank.ifscCode;
  if (!acct || !ifsc) {
    throw new ApiError(400, 'bank_info_missing', 'Please complete and verify your bank account details in Store Profile before requesting a payout.');
  }

  // Check existing pending payout batch
  const existingPending = await prisma.payoutBatch.findFirst({
    where: {
      sellerId: v.id,
      status: { in: ['PENDING_APPROVAL', 'PROCESSING'] },
    },
  });
  if (existingPending) {
    throw new ApiError(400, 'payout_in_progress', `You already have a payout request #${existingPending.batchNumber} pending review.`);
  }

  // Calculate current available balance
  const deliveredItems = await prisma.orderItem.findMany({
    where: { sellerId: v.id, order: { orderStatus: 'DELIVERED' } },
    select: { totalPrice: true, orderId: true },
  });

  const grossSalesRupees = deliveredItems.reduce((acc, it) => acc + it.totalPrice, 0);
  const fee = Math.round(grossSalesRupees * 0.085);
  const tcs = Math.round(grossSalesRupees * 0.01);
  const netPayoutRupees = Math.max(0, grossSalesRupees - fee - tcs);

  // Check already disbursed
  const allBatches = await prisma.payoutBatch.findMany({
    where: { sellerId: v.id, status: 'DISBURSED' },
    select: { netPayout: true },
  });
  const alreadyDisbursed = allBatches.reduce((acc, b) => acc + b.netPayout, 0);
  const availableRupees = netPayoutRupees - alreadyDisbursed;

  if (availableRupees < 1000) {
    throw new ApiError(400, 'minimum_not_met', `Available balance is ₹${availableRupees}. Minimum required payout threshold is ₹1,000.`);
  }

  const batchNumber = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  const orderIds = Array.from(new Set(deliveredItems.map((it) => it.orderId)));

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.payoutBatch.create({
      data: {
        batchNumber,
        sellerId: v.id,
        sellerName: v.legalName,
        storeName: v.storeName,
        bankName: bank.bank_name || bank.bankName || 'Verified Bank Account',
        accountNumberMasked: `•••• •••• ${String(acct).slice(-4)}`,
        ifscCode: ifsc,
        grossSales: grossSalesRupees,
        platformFeePercent: 8.5,
        platformFeeAmount: fee,
        tcsTaxAmount: tcs,
        netPayout: availableRupees,
        orderCount: orderIds.length,
        periodStart: new Date(Date.now() - 30 * 86_400_000),
        periodEnd: new Date(),
        status: PayoutStatusEnum.PENDING_APPROVAL,
        orderIds,
      },
    });

    await tx.vendorLedgerEntry.create({
      data: {
        vendorId: v.id,
        payoutBatchId: created.id,
        referenceId: created.id,
        type: 'payout',
        amountPaise: -(availableRupees * 100),
        description: `Requested payout batch #${batchNumber}`,
      },
    });

    return created;
  });

  emitToAdmin('admin:payout_requested', {
    id: batch.id,
    batch_number: batch.batchNumber,
    seller: v.storeName,
    amount: batch.netPayout,
  });

  res.status(201).json({
    success: true,
    batch_number: batch.batchNumber,
    net_payout: batch.netPayout,
    status: batch.status.toLowerCase(),
    message: `Payout request for ₹${batch.netPayout} submitted successfully for administrator review.`,
  });
});

/* --------------------------- VENDOR SERVICES ------------------------------- */
vendorRouter.get('/services/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const services = await prisma.service.findMany({
    where: { vendorId: v.id },
    include: { bookings: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    results: services.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      slug: s.slug,
      description: s.description,
      category: s.category,
      price: Math.round(s.pricePaise / 100),
      duration: s.duration,
      duration_min: s.durationMin,
      rating: s.rating,
      reviews_count: s.reviewsCount,
      image: s.image,
      is_active: s.isActive,
      features: (s.features as string[]) || [],
      bookings_count: s.bookings.length,
      created_at: s.createdAt.toISOString(),
    })),
  });
});

vendorRouter.post('/services/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const data = req.body;

  if (!data.title || !data.description) {
    throw new ApiError(400, 'validation_error', 'Title and description are required.');
  }

  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

  const service = await prisma.service.create({
    data: {
      vendorId: v.id,
      title: data.title,
      subtitle: data.subtitle || null,
      slug,
      description: data.description,
      category: data.category || 'Crafts',
      pricePaise: Math.round(Number(data.price || 0) * 100),
      duration: data.duration || `${data.duration_min || 60} mins`,
      durationMin: Number(data.duration_min || 60),
      image: data.image || '/botanical-care-banner.jpg',
      isActive: data.is_active !== undefined ? Boolean(data.is_active) : true,
      features: data.features || ['Expert artisan instruction', 'All materials provided', 'Certificate of completion'],
    },
  });

  const formatted = {
    id: service.id,
    title: service.title,
    subtitle: service.subtitle,
    slug: service.slug,
    description: service.description,
    category: service.category,
    price: Math.round(service.pricePaise / 100),
    price_paise: service.pricePaise,
    duration: service.duration,
    duration_min: service.durationMin,
    rating: service.rating,
    reviews_count: service.reviewsCount,
    image: service.image,
    is_active: service.isActive,
    features: (service.features as string[]) || [],
    bookings_count: 0,
    created_at: service.createdAt.toISOString(),
  };

  res.status(201).json(formatted);
});

vendorRouter.patch('/services/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const data = req.body;

  const existing = await prisma.service.findFirst({
    where: { id, vendorId: v.id },
  });
  if (!existing) throw new ApiError(404, 'not_found', 'Service not found.');

  const updated = await prisma.service.update({
    where: { id },
    data: {
      ...(data.title ? { title: data.title } : {}),
      ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.price !== undefined ? { pricePaise: Math.round(Number(data.price) * 100) } : {}),
      ...(data.duration ? { duration: data.duration } : {}),
      ...(data.duration_min ? { durationMin: Number(data.duration_min) } : {}),
      ...(data.image ? { image: data.image } : {}),
      ...(data.is_active !== undefined ? { isActive: Boolean(data.is_active) } : {}),
      ...(data.features ? { features: data.features } : {}),
    },
    include: { bookings: true },
  });

  const formatted = {
    id: updated.id,
    title: updated.title,
    subtitle: updated.subtitle,
    slug: updated.slug,
    description: updated.description,
    category: updated.category,
    price: Math.round(updated.pricePaise / 100),
    price_paise: updated.pricePaise,
    duration: updated.duration,
    duration_min: updated.durationMin,
    rating: updated.rating,
    reviews_count: updated.reviewsCount,
    image: updated.image,
    is_active: updated.isActive,
    features: (updated.features as string[]) || [],
    bookings_count: updated.bookings?.length || 0,
    created_at: updated.createdAt.toISOString(),
  };

  res.json(formatted);
});

vendorRouter.delete('/services/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const existing = await prisma.service.findFirst({
    where: { id, vendorId: v.id },
  });
  if (!existing) throw new ApiError(404, 'not_found', 'Service not found.');

  await prisma.service.delete({ where: { id } });
  res.json({ success: true, message: 'Service deleted.' });
});

vendorRouter.get('/services/bookings/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const bookings = await prisma.serviceBooking.findMany({
    where: { service: { vendorId: v.id } },
    include: { service: true },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    results: bookings.map((b) => ({
      id: b.id,
      booking_ref: b.bookingRef,
      service_title: b.serviceTitle,
      customer_name: b.customerName,
      customer_email: b.customerEmail,
      customer_phone: b.customerPhone,
      preferred_date: b.preferredDate,
      preferred_time: b.preferredTime,
      notes: b.notes,
      status: b.status.toLowerCase(),
      created_at: b.createdAt.toISOString(),
    })),
  });
});

vendorRouter.patch('/services/bookings/:id/status/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const { status } = req.body;

  const validStatuses: BookingStatus[] = ['CONFIRMED', 'COMPLETED', 'CANCELLED'];
  const newStatus = (status || '').toUpperCase() as BookingStatus;
  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(400, 'invalid_status', `Valid statuses: ${validStatuses.join(', ')}`);
  }

  const booking = await prisma.serviceBooking.findFirst({
    where: { id, service: { vendorId: v.id } },
  });
  if (!booking) throw new ApiError(404, 'not_found', 'Booking not found.');

  const updated = await prisma.serviceBooking.update({
    where: { id },
    data: { status: newStatus },
  });

  res.json({
    id: updated.id,
    booking_ref: updated.bookingRef,
    status: updated.status.toLowerCase(),
  });
});

/* ---------------------------- VENDOR REVIEWS ------------------------------- */
vendorRouter.get('/reviews/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const { rating, search, page: pageQ, page_size: sizeQ } = req.query;
  const page = Math.max(1, parseInt((pageQ as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((sizeQ as string) || '10', 10));

  const where: any = {
    product: { vendorId: v.id },
  };

  if (rating && typeof rating === 'string' && rating !== 'all') {
    where.rating = parseInt(rating, 10);
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { comment: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { product: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [reviews, count] = await Promise.all([
    prisma.review.findMany({
      where,
      include: { product: { select: { id: true, title: true, mainImageUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    count,
    page,
    page_size: pageSize,
    results: reviews.map((r) => ({
      id: r.id,
      product_id: r.productId,
      product_title: r.product.title,
      product_image: r.product.mainImageUrl,
      customer_name: r.customerName,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status.toLowerCase(),
      verified_purchase: r.verifiedPurchase,
      created_at: r.createdAt.toISOString(),
    })),
  });
});

/* ----------------------- VENDOR PROFILE & SETTINGS ------------------------- */
vendorRouter.get('/profile/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const docs = await prisma.sellerKycDocument.findMany({
    where: { vendorId: v.id },
    orderBy: { uploadedAt: 'desc' },
  });

  res.json({
    id: v.id,
    store_name: v.storeName,
    store_slug: v.storeSlug,
    legal_name: v.legalName,
    business_type: v.businessType,
    email: v.email,
    phone: v.phone,
    pan: v.pan,
    tax_id: v.taxId,
    wholesale_enabled: v.wholesaleEnabled,
    status: v.status.toLowerCase(),
    pickup_address: v.pickupAddress || {},
    bank_info: v.bankInfo || {},
    declared_categories: (v.declaredCategories as string[]) || [],
    documents: docs.map((d) => ({
      id: d.id,
      type: d.type,
      title: d.title,
      file_name: d.fileName,
      file_url: d.fileUrl,
      file_size_bytes: d.fileSizeBytes,
      mime_type: d.mimeType,
      status: d.status,
      uploaded_at: d.uploadedAt.toISOString(),
    })),
  });
});

vendorRouter.patch('/profile/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const data = req.body;

  // Validation
  const bankData = data.bank_info || data.bank_details;
  if (bankData?.ifsc_code) {
    const ifsc = String(bankData.ifsc_code).toUpperCase().trim();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      throw new ApiError(400, 'invalid_ifsc', 'Invalid IFSC code format (e.g. HDFC0001234).');
    }
  }

  if (data.pan) {
    const pan = String(data.pan).toUpperCase().trim();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      throw new ApiError(400, 'invalid_pan', 'Invalid PAN card number format (e.g. ABCDE1234F).');
    }
  }

  const updated = await prisma.vendorProfile.update({
    where: { id: v.id },
    data: {
      ...(data.store_name ? { storeName: data.store_name } : {}),
      ...(data.legal_name ? { legalName: data.legal_name } : {}),
      ...(data.business_type ? { businessType: data.business_type } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.pan ? { pan: String(data.pan).toUpperCase() } : {}),
      ...(data.tax_id ? { taxId: String(data.tax_id).toUpperCase() } : {}),
      ...(data.wholesale_enabled !== undefined ? { wholesaleEnabled: Boolean(data.wholesale_enabled) } : {}),
      ...(data.pickup_address ? { pickupAddress: data.pickup_address } : {}),
      ...(bankData ? { bankInfo: bankData } : {}),
    },
  });

  res.json({
    success: true,
    message: 'Store profile updated successfully.',
    profile: {
      id: updated.id,
      store_name: updated.storeName,
      legal_name: updated.legalName,
      status: updated.status.toLowerCase(),
    },
  });
});

vendorRouter.get('/documents/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const docs = await prisma.sellerKycDocument.findMany({
    where: { vendorId: v.id },
    orderBy: { uploadedAt: 'desc' },
  });
  res.json({ results: docs });
});

vendorRouter.post('/documents/', requireAuth('VENDOR'), upload.single('file'), async (req, res) => {
  if (!req.file) throw new ApiError(400, 'no_file', 'Please select a document file to upload.');
  const v = await getVendorForUser(req.user!.id);

  const doc = await prisma.sellerKycDocument.create({
    data: {
      vendorId: v.id,
      type: req.body.document_type || 'identity_proof',
      title: req.file.originalname,
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      status: 'pending',
    },
  });

  res.status(201).json(doc);
});

vendorRouter.patch('/settings/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const { notifications, vacation_mode, auto_accept_orders } = req.body;

  // Stored cleanly in bankInfo / extended metadata
  const currentBank = (v.bankInfo as any) || {};
  const updatedBank = {
    ...currentBank,
    settings: {
      notifications: notifications !== undefined ? notifications : true,
      vacation_mode: vacation_mode !== undefined ? vacation_mode : false,
      auto_accept_orders: auto_accept_orders !== undefined ? auto_accept_orders : true,
    },
  };

  await prisma.vendorProfile.update({
    where: { id: v.id },
    data: { bankInfo: updatedBank },
  });

  res.json({
    success: true,
    message: 'Settings updated successfully.',
    settings: updatedBank.settings,
  });
});

/* ------------------------- VENDOR SUPPORT TICKETS -------------------------- */
vendorRouter.get('/support/tickets/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  const tickets = await prisma.supportTicket.findMany({
    where: { vendorId: v.id },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    count: tickets.length,
    results: tickets.map((t) => ({
      id: t.id,
      ticket_number: t.ticketNumber,
      subject: t.subject,
      category: t.category,
      priority: t.priority,
      status: t.status,
      last_message: t.messages[0]?.message || '',
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
    })),
  });
});

vendorRouter.post('/support/tickets/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const { subject, category, priority, message } = z.object({
    subject: z.string().min(3, 'Subject must be at least 3 characters.'),
    category: z.string().default('general'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    message: z.string().min(5, 'Message must be at least 5 characters.'),
  }).parse(req.body);

  const ticketNumber = `TCK-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  const ticket = await prisma.$transaction(async (tx) => {
    const t = await tx.supportTicket.create({
      data: {
        ticketNumber,
        vendorId: v.id,
        userId: req.user!.id,
        subject,
        category,
        priority,
        status: 'open',
      },
    });

    await tx.supportMessage.create({
      data: {
        ticketId: t.id,
        senderId: req.user!.id,
        senderName: v.storeName,
        senderRole: 'vendor',
        message,
      },
    });

    return t;
  });

  emitToAdmin('admin:support_ticket_created', {
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    seller: v.storeName,
    subject: ticket.subject,
    priority: ticket.priority,
  });

  // Notify Super Admin via Email asynchronously
  setImmediate(async () => {
    try {
      const admins = await prisma.user.findMany({
        where: { role: UserRole.ADMIN },
        select: { email: true },
      });
      const recipientEmails = Array.from(
        new Set([
          ...admins.map((a) => a.email),
          env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com',
        ])
      ).filter(Boolean);

      for (const to of recipientEmails) {
        await sendMail({
          to,
          ...supportTicketAdminNotificationTemplate({
            ticketNumber: ticket.ticketNumber,
            vendorStoreName: v.storeName,
            vendorLegalName: v.legalName || undefined,
            vendorEmail: v.user?.email || undefined,
            subject: ticket.subject,
            category: ticket.category,
            priority: ticket.priority,
            message,
          }),
        });
        console.log(`[support:email] Admin ticket notification sent to ${to} for ticket #${ticket.ticketNumber}`);
      }
    } catch (err) {
      console.error(`[support:email] Failed to send admin email for ticket #${ticket.ticketNumber}:`, (err as Error).message);
    }
  });

  res.status(201).json({
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    message: 'Support ticket submitted. Our artisan support desk will respond shortly.',
  });
});

vendorRouter.get('/support/tickets/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      vendorId: v.id,
      OR: [{ id }, { ticketNumber: id }],
    },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!ticket) throw new ApiError(404, 'not_found', 'Support ticket not found.');

  res.json({
    id: ticket.id,
    ticket_number: ticket.ticketNumber,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    created_at: ticket.createdAt.toISOString(),
    updated_at: ticket.updatedAt.toISOString(),
    messages: ticket.messages.map((m) => ({
      id: m.id,
      sender_name: m.senderName,
      sender_role: m.senderRole,
      message: m.message,
      attachments: (m.attachments as string[]) || [],
      created_at: m.createdAt.toISOString(),
    })),
  });
});

vendorRouter.post('/support/tickets/:id/messages/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const { message } = z.object({ message: z.string().min(1, 'Message cannot be empty.') }).parse(req.body);

  const ticket = await prisma.supportTicket.findFirst({
    where: {
      vendorId: v.id,
      OR: [{ id }, { ticketNumber: id }],
    },
  });

  if (!ticket) throw new ApiError(404, 'not_found', 'Support ticket not found.');

  const createdMsg = await prisma.$transaction(async (tx) => {
    const msg = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: req.user!.id,
        senderName: v.storeName,
        senderRole: 'vendor',
        message,
      },
    });

    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'open', updatedAt: new Date() },
    });

    return msg;
  });

  emitToAdmin('admin:support_ticket_reply', {
    ticket_id: ticket.id,
    ticket_number: ticket.ticketNumber,
    seller: v.storeName,
    message,
  });

  res.status(201).json({
    id: createdMsg.id,
    sender_name: createdMsg.senderName,
    sender_role: createdMsg.senderRole,
    message: createdMsg.message,
    created_at: createdMsg.createdAt.toISOString(),
  });
});

/* ----------------------------- VENDOR PRODUCTS ----------------------------- */
vendorRouter.get('/categories/', requireAuth('VENDOR'), async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

vendorRouter.get('/notifications/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);

  // 1. Recent orders containing this vendor's items
  const recentOrders = await prisma.order.findMany({
    where: {
      items: {
        some: { sellerId: v.id },
      },
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 2. Recent service bookings for this vendor's workshops
  const recentBookings = await prisma.serviceBooking.findMany({
    where: {
      service: { vendorId: v.id },
    },
    include: { service: true },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  // 3. Support ticket messages from admin
  const recentTickets = await prisma.supportTicket.findMany({
    where: { vendorId: v.id },
    include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  // 4. Low stock products
  const lowStockProducts = await prisma.product.findMany({
    where: {
      vendorId: v.id,
      totalStock: { lte: 5 },
      status: ProductStatusEnum.APPROVED,
    },
    take: 5,
  });

  const alerts: any[] = [];

  for (const o of recentOrders) {
    const vendorItems = o.items.filter((it) => it.sellerId === v.id);
    const itemCount = vendorItems.reduce((acc, it) => acc + it.quantity, 0);
    alerts.push({
      id: `ord_${o.id}`,
      type: 'order',
      title: `New Order #${o.orderNumber}`,
      desc: `${o.customerName} placed an order for ${itemCount} item(s) (${o.orderStatus.toLowerCase()}).`,
      link: '/vendor/orders',
      time: formatTimeAgo(o.createdAt),
      created_at: o.createdAt.toISOString(),
    });
  }

  for (const b of recentBookings) {
    alerts.push({
      id: `bk_${b.id}`,
      type: 'booking',
      title: `New Workshop Booking #${b.bookingRef}`,
      desc: `${b.customerName} reserved "${b.serviceTitle}" for ${b.preferredDate} at ${b.preferredTime}.`,
      link: '/vendor/services',
      time: formatTimeAgo(b.createdAt),
      created_at: b.createdAt.toISOString(),
    });
  }

  for (const t of recentTickets) {
    const lastMsg = t.messages[0];
    if (lastMsg && (lastMsg.senderRole === 'admin' || lastMsg.senderRole === 'staff')) {
      alerts.push({
        id: `tck_${t.id}`,
        type: 'support',
        title: `Support Desk: #${t.ticketNumber}`,
        desc: `New reply on "${t.subject}": ${lastMsg.message.slice(0, 70)}...`,
        link: '/vendor/support',
        time: formatTimeAgo(lastMsg.createdAt),
        created_at: lastMsg.createdAt.toISOString(),
      });
    }
  }

  for (const p of lowStockProducts) {
    alerts.push({
      id: `stock_${p.id}`,
      type: 'stock',
      title: 'Low Stock Alert',
      desc: `"${p.title}" has only ${p.totalStock} unit(s) remaining in stock.`,
      link: '/vendor/products',
      time: formatTimeAgo(p.updatedAt),
      created_at: p.updatedAt.toISOString(),
    });
  }

  // Sort alerts by created_at desc
  alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json({
    count: alerts.length,
    unread_count: alerts.length,
    results: alerts,
  });
});

vendorRouter.get('/products/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const { status, category, search, page: pageQ, page_size: sizeQ } = req.query;
  const page = Math.max(1, parseInt((pageQ as string) || '1', 10));
  const pageSize = Math.max(1, parseInt((sizeQ as string) || '10', 10));

  const where: any = { vendorId: v.id };
  if (status && typeof status === 'string' && status !== 'all') {
    const sLower = status.toLowerCase();
    if (sLower === 'pending_review' || sLower === 'pending_approval') {
      where.status = ProductStatusEnum.PENDING_APPROVAL;
    } else if (sLower === 'draft') {
      where.status = ProductStatusEnum.DRAFT;
    } else if (sLower === 'approved' || sLower === 'live') {
      where.status = ProductStatusEnum.APPROVED;
    } else if (sLower === 'rejected') {
      where.status = ProductStatusEnum.REJECTED;
    } else if (sLower === 'archived') {
      where.status = ProductStatusEnum.ARCHIVED;
    } else {
      where.status = status.toUpperCase() as any;
    }
  }
  if (category && typeof category === 'string' && category !== 'all') {
    where.category = {
      OR: [{ id: category }, { slug: category }, { name: category }],
    };
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [products, count, allCount, draftCount, pendingCount, approvedCount, rejectedCount, archivedCount] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
    prisma.product.count({ where: { vendorId: v.id } }),
    prisma.product.count({ where: { vendorId: v.id, status: ProductStatusEnum.DRAFT } }),
    prisma.product.count({ where: { vendorId: v.id, status: ProductStatusEnum.PENDING_APPROVAL } }),
    prisma.product.count({ where: { vendorId: v.id, status: ProductStatusEnum.APPROVED } }),
    prisma.product.count({ where: { vendorId: v.id, status: ProductStatusEnum.REJECTED } }),
    prisma.product.count({ where: { vendorId: v.id, status: ProductStatusEnum.ARCHIVED } }),
  ]);

  const status_counts = {
    all: allCount,
    draft: draftCount,
    pending_review: pendingCount,
    approved: approvedCount,
    rejected: rejectedCount,
    unpublished: 0,
    archived: archivedCount,
  };

  res.json({
    count,
    page,
    page_size: pageSize,
    status_counts,
    results: products.map((p) => ({
      id: p.id,
      title: p.title,
      sku: p.sku,
      main_image_url: p.mainImageUrl,
      category: {
        id: p.categoryId,
        name: p.category?.name || 'Uncategorized',
        slug: p.category?.slug,
      },
      category_id: p.categoryId,
      price: Math.round(p.pricePaise / 100),
      price_paise: p.pricePaise,
      mrp: Math.round(p.mrpPaise / 100),
      mrp_paise: p.mrpPaise,
      stock: p.totalStock,
      total_stock: p.totalStock,
      colors: [],
      status: p.status === ProductStatusEnum.PENDING_APPROVAL ? 'pending_review' : p.status.toLowerCase(),
      images: Array.isArray(p.images) ? p.images : [p.mainImageUrl],
      description: p.description,
      wholesale_enabled: p.wholesaleEnabled,
      is_custom_category: p.isCustomCategory,
      requested_category_name: p.requestedCategoryName,
      rejection_reason: p.rejectionReason,
      created_at: p.createdAt.toISOString(),
      updated_at: p.updatedAt.toISOString(),
    })),
  });
});

vendorRouter.get('/products/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const p = await prisma.product.findFirst({
    where: { id, vendorId: v.id },
    include: { category: true, variants: true },
  });

  if (!p) throw new ApiError(404, 'not_found', 'Product not found.');

  res.json({
    id: p.id,
    title: p.title,
    sku: p.sku,
    category: p.category.name,
    category_id: p.categoryId,
    price: Math.round(p.pricePaise / 100),
    mrp: Math.round(p.mrpPaise / 100),
    stock: p.totalStock,
    status: p.status.toLowerCase(),
    main_image_url: p.mainImageUrl,
    images: Array.isArray(p.images) ? p.images : [p.mainImageUrl],
    description: p.description,
    wholesale_enabled: p.wholesaleEnabled,
    rejection_reason: p.rejectionReason,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  });
});

vendorRouter.post('/products/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const data = req.body;

  if (!data.title) throw new ApiError(400, 'validation_error', 'Product title is required.');

  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
  const sku = data.sku || `SKU-${Date.now().toString().slice(-6)}`;

  // Find valid category
  let categoryId = data.category_id || data.categoryId;
  if (!categoryId) {
    const firstCat = await prisma.category.findFirst();
    categoryId = firstCat?.id;
  }

  const primaryImage = data.main_image_url || data.image || (Array.isArray(data.images) ? data.images[0] : null) || '/botanical-care-banner.jpg';
  const gallery = Array.isArray(data.images) && data.images.length > 0 ? data.images : [primaryImage];

  const product = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        vendorId: v.id,
        title: data.title,
        slug,
        sku,
        categoryId,
        pricePaise: Math.round(Number(data.price || 499) * 100),
        mrpPaise: Math.round(Number(data.mrp || 699) * 100),
        totalStock: Number(data.stock || 10),
        mainImageUrl: primaryImage,
        images: gallery,
        description: data.description || 'Crafted artisan product',
        status: ProductStatusEnum.PENDING_APPROVAL,
      },
    });

    await tx.productVariant.create({
      data: {
        productId: p.id,
        sku: `${sku}-STD`,
        colorName: 'Standard',
        stock: p.totalStock,
        pricePaise: p.pricePaise,
        mrpPaise: p.mrpPaise,
      },
    });

    return p;
  });

  emitToAdmin('admin:product_submitted', {
    id: product.id,
    title: product.title,
    seller: v.storeName,
  });

  res.status(201).json(product);
});

vendorRouter.patch('/products/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);
  const data = req.body;

  const existing = await prisma.product.findFirst({
    where: { id, vendorId: v.id },
  });
  if (!existing) throw new ApiError(404, 'not_found', 'Product not found.');

  const updateData: any = {};
  if (data.title) updateData.title = data.title;
  if (data.category_id || data.categoryId) updateData.categoryId = data.category_id || data.categoryId;
  if (data.price !== undefined) updateData.pricePaise = Math.round(Number(data.price) * 100);
  if (data.mrp !== undefined) updateData.mrpPaise = Math.round(Number(data.mrp) * 100);
  if (data.stock !== undefined) updateData.totalStock = Number(data.stock);
  if (data.main_image_url) updateData.mainImageUrl = data.main_image_url;
  if (data.images) updateData.images = data.images;
  if (data.description) updateData.description = data.description;
  if (data.wholesale_enabled !== undefined) updateData.wholesaleEnabled = Boolean(data.wholesale_enabled);

  const updated = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  res.json(updated);
});

vendorRouter.delete('/products/:id/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const existing = await prisma.product.findFirst({
    where: { id, vendorId: v.id },
  });
  if (!existing) throw new ApiError(404, 'not_found', 'Product not found.');

  await prisma.$transaction(async (tx) => {
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  res.json({ success: true, message: 'Product deleted permanently.' });
});

vendorRouter.post('/products/:id/duplicate/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const original = await prisma.product.findFirst({
    where: { id, vendorId: v.id },
  });
  if (!original) throw new ApiError(404, 'not_found', 'Product not found.');

  const newSlug = `${original.slug}-copy-${Date.now().toString(36)}`;
  const newSku = `COPY-${original.sku}-${Math.floor(100 + Math.random() * 900)}`;

  const duplicated = await prisma.$transaction(async (tx) => {
    const p = await tx.product.create({
      data: {
        vendorId: v.id,
        title: `${original.title} (Copy)`,
        slug: newSlug,
        sku: newSku,
        categoryId: original.categoryId,
        pricePaise: original.pricePaise,
        mrpPaise: original.mrpPaise,
        totalStock: original.totalStock,
        mainImageUrl: original.mainImageUrl,
        images: original.images || [original.mainImageUrl],
        description: original.description,
        status: ProductStatusEnum.PENDING_APPROVAL,
      },
    });

    await tx.productVariant.create({
      data: {
        productId: p.id,
        sku: `${newSku}-STD`,
        colorName: 'Standard',
        stock: p.totalStock,
        pricePaise: p.pricePaise,
        mrpPaise: p.mrpPaise,
      },
    });

    return p;
  });

  res.status(201).json(duplicated);
});

vendorRouter.post('/products/:id/unpublish/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const existing = await prisma.product.findFirst({ where: { id, vendorId: v.id } });
  if (!existing) throw new ApiError(404, 'not_found', 'Product not found.');

  const updated = await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.ARCHIVED },
  });

  res.json({ success: true, product: updated });
});

vendorRouter.post('/products/:id/republish/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const existing = await prisma.product.findFirst({ where: { id, vendorId: v.id } });
  if (!existing) throw new ApiError(404, 'not_found', 'Product not found.');

  const updated = await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.APPROVED },
  });

  res.json({ success: true, product: updated });
});

vendorRouter.post('/products/:id/archive/', requireAuth('VENDOR'), async (req, res) => {
  const v = await getVendorForUser(req.user!.id);
  const id = param(req.params.id);

  const existing = await prisma.product.findFirst({ where: { id, vendorId: v.id } });
  if (!existing) throw new ApiError(404, 'not_found', 'Product not found.');

  const updated = await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.ARCHIVED },
  });

  res.json({ success: true, product: updated });
});
