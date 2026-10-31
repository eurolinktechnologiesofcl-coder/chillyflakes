import { Router } from 'express';
import { z } from 'zod';
import { SellerStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitToAdmin, emitToVendor } from '../../socket.js';
import { param } from '../../lib/params.js';
import { sendMail } from '../../lib/mailer.js';
import { env } from '../../config/env.js';

export const adminSellersRouter = Router();

/** Draft keys that reference uploaded docs → human-friendly titles for the reviewer. */
const DOC_KEY_TITLES: Array<[string, string, string]> = [
  ['step_1', 'logo_document_id', 'Store Logo'],
  ['step_1', 'banner_document_id', 'Store Banner'],
  ['step_3', 'pan_document_id', 'PAN Card'],
  ['step_3', 'identity_document_id', 'Identity Proof'],
  ['step_3', 'address_document_id', 'Address Proof'],
  ['step_3', 'artisan_card_document_id', 'Artisan Card'],
  ['step_4', 'cheque_document_id', 'Cancelled Cheque / Passbook'],
];

/** Only the documents currently attached in the onboarding draft (hides orphaned re-uploads). */
function activeDocs(v: any): Array<any & { friendlyTitle?: string }> {
  const all: any[] = v.documents || [];
  const draft = (v.onboardingDraft as any) || {};
  const titleById = new Map<string, string>();
  for (const [step, key, title] of DOC_KEY_TITLES) {
    const docId = draft?.[step]?.[key];
    if (typeof docId === 'string' && docId) titleById.set(docId, title);
  }
  if (titleById.size === 0) return all;
  return all
    .filter((d) => titleById.has(d.id))
    .map((d) => ({ ...d, friendlyTitle: titleById.get(d.id) }));
}

const STATUS_EMAIL: Record<string, { subject: string; heading: string; body: string; cta: string; path: string }> = {
  approved: {
    subject: 'Your seller account is approved 🎉',
    heading: 'Congratulations — you are approved!',
    body: 'Your KYC and store details have been verified. You can now list products and start selling.',
    cta: 'Go to Seller Dashboard',
    path: '/vendor/dashboard',
  },
  resubmission_requested: {
    subject: 'Action required: please update your seller application',
    heading: 'Changes requested on your application',
    body: 'Our compliance team reviewed your application and needs a few corrections before it can be approved.',
    cta: 'Fix my application',
    path: '/vendor/onboarding',
  },
  rejected: {
    subject: 'Update on your seller application',
    heading: 'Your application was not approved',
    body: 'Unfortunately we could not approve your seller application at this time.',
    cta: 'View application status',
    path: '/vendor/status',
  },
  suspended: {
    subject: 'Your seller account has been suspended',
    heading: 'Account suspended',
    body: 'Your seller account has been suspended by our compliance team. Your listings are hidden until this is resolved.',
    cta: 'View account status',
    path: '/vendor/status',
  },
};

const STEP_LABELS: Record<number, string> = { 1: 'Store Identity', 2: 'Pickup Address', 3: 'KYC Documents', 4: 'Bank Details' };

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

/** Fire-and-forget decision email to the vendor. Never blocks / fails the admin request. */
function notifyVendorByEmail(vendor: { email?: string | null; legalName?: string | null; storeName?: string | null }, status: string, reason?: string, flaggedSteps: number[] = []) {
  const tpl = STATUS_EMAIL[status];
  if (!tpl || !vendor?.email) return;
  const link = `${env.APP_URL}${tpl.path}`;
  const name = escapeHtml(vendor.legalName || vendor.storeName || 'Seller');
  const sections = flaggedSteps.map((n) => STEP_LABELS[n]).filter(Boolean);
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2d24">
    <h2 style="color:#24452f">${tpl.heading}</h2>
    <p>Hi ${name},</p>
    <p>${tpl.body}</p>
    ${reason ? `<div style="background:#fdf6ec;border-left:4px solid #c2410c;padding:12px 16px;margin:16px 0"><strong>Reviewer note:</strong><br/>${escapeHtml(String(reason))}</div>` : ''}
    ${sections.length ? `<p><strong>Sections to update:</strong> ${sections.join(', ')}</p>` : ''}
    <p style="margin:24px 0"><a href="${link}" style="background:#24452f;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">${tpl.cta}</a></p>
    <p style="font-size:12px;color:#6b7280">— ${escapeHtml(env.APP_NAME)} Seller Compliance Team</p>
  </div>`;
  const text = `${tpl.heading}\n\nHi ${vendor.legalName || 'Seller'},\n${tpl.body}\n${reason ? `\nReviewer note: ${reason}\n` : ''}${sections.length ? `\nSections to update: ${sections.join(', ')}\n` : ''}\n${tpl.cta}: ${link}`;
  sendMail({ to: vendor.email, subject: `${env.APP_NAME}: ${tpl.subject}`, html, text }).catch((err) =>
    console.error('[mail] vendor decision email failed', err?.message || err)
  );
}

function formatSellerListItem(v: any) {
  const listDocs = activeDocs(v);
  const verifiedCount = listDocs.filter((d: any) => d.status === 'verified').length;
  const totalDocs = listDocs.length;
  const daysInStatus = Math.floor((Date.now() - v.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: v.id,
    legal_name: v.legalName,
    store_name: v.storeName,
    store_slug: v.storeSlug,
    business_type: v.businessType as any,
    jurisdiction: 'India',
    tax_id_masked: v.taxId ? `${v.taxId.slice(0, 4)}****${v.taxId.slice(-3)}` : 'NOT_PROVIDED',
    pan_masked: v.pan ? `${v.pan.slice(0, 3)}****${v.pan.slice(-2)}` : 'NOT_PROVIDED',
    status: v.status.toLowerCase() as any,
    verified_docs_count: verifiedCount,
    total_required_docs_count: Math.max(totalDocs, 3),
    created_at: v.createdAt.toISOString(),
    submitted_at: v.reviewStartedAt ? v.reviewStartedAt.toISOString() : undefined,
    assigned_reviewer: v.assignedReviewerId || undefined,
    days_in_current_status: daysInStatus,
  };
}

function formatSellerDetail(v: any) {
  const daysInStatus = Math.floor((Date.now() - v.updatedAt.getTime()) / (1000 * 60 * 60 * 24));

  const docs = activeDocs(v).map((d: any) => ({
    id: d.id,
    type: d.type as any,
    title: d.friendlyTitle || d.title,
    file_name: d.title || d.fileName,
    file_url: d.fileUrl,
    file_size_bytes: d.fileSizeBytes,
    mime_type: d.mimeType,
    status: d.status as any,
    uploaded_at: d.uploadedAt.toISOString(),
    verified_at: d.verifiedAt ? d.verifiedAt.toISOString() : undefined,
    verified_by: d.verifiedBy || undefined,
    rejection_reason: d.rejectionReason || undefined,
    is_sensitive: d.isSensitive,
  }));

  const history = (v.reviewLogs || []).map((l: any) => ({
    id: l.id,
    reviewer_name: l.reviewerName,
    action: l.action as any,
    notes: l.notes || undefined,
    flagged_sections: l.flaggedSections || undefined,
    created_at: l.createdAt.toISOString(),
  }));

  const rawBank = (v.bankInfo as any) || {};
  const acct = rawBank.account_number || rawBank.accountNumber || rawBank.full_account_number;
  const holder = rawBank.account_holder_name || '';
  const bank = {
    account_holder_name: holder || 'Not provided',
    bank_name: rawBank.bank_name || rawBank.bankName || 'Not provided',
    branch: rawBank.branch_name || rawBank.branch || '—',
    ifsc_code: rawBank.ifsc_code || rawBank.ifscCode || 'Not provided',
    account_type: rawBank.account_type,
    account_number_masked: acct ? `•••• •••• ${String(acct).slice(-4)}` : 'Not provided',
    holder_matches_pan: Boolean(holder) && holder.trim().toLowerCase() === String(v.legalName || '').trim().toLowerCase(),
  };

  const rawPickup = (v.pickupAddress as any) || {};
  const pickup = {
    line1: rawPickup.address_line1 || rawPickup.line1 || rawPickup.street || 'Not provided',
    line2: rawPickup.address_line2 || rawPickup.line2 || undefined,
    city: rawPickup.city || '—',
    state: rawPickup.state || '—',
    pincode: rawPickup.pincode || '—',
    country: rawPickup.country || 'India',
    contact_person: rawPickup.contact_person,
    courier_mobile: rawPickup.courier_mobile,
  };

  return {
    id: v.id,
    legal_name: v.legalName,
    store_name: v.storeName,
    store_slug: v.storeSlug,
    business_type: v.businessType as any,
    tax_id_masked: v.taxId ? `${v.taxId.slice(0, 4)}****${v.taxId.slice(-3)}` : 'NOT_PROVIDED',
    pan_masked: v.pan ? `${v.pan.slice(0, 3)}****${v.pan.slice(-2)}` : 'NOT_PROVIDED',
    contact_person: v.contactPerson || v.legalName,
    email: v.email,
    phone: v.phone,
    pickup_address: pickup,
    declared_categories: (v.declaredCategories as string[]) || [],
    wholesale_enabled: v.wholesaleEnabled,
    status: v.status.toLowerCase() as any,
    assigned_reviewer: v.assignedReviewerId || undefined,
    review_started_at: v.reviewStartedAt ? v.reviewStartedAt.toISOString() : undefined,
    documents: docs,
    bank_info: bank,
    review_history: history,
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
    days_in_current_status: daysInStatus,
  };
}

adminSellersRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:view'), async (req, res) => {
  const { tab = 'all', search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (tab === 'under_review') {
    where.status = { in: ['UNDER_REVIEW', 'ONBOARDING_INCOMPLETE'] };
  } else if (tab === 'resubmission_requested') {
    where.status = 'RESUBMISSION_REQUESTED';
  } else if (tab === 'approved') {
    where.status = 'APPROVED';
  } else if (tab === 'rejected') {
    where.status = 'REJECTED';
  } else if (tab === 'suspended') {
    where.status = 'SUSPENDED';
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { legalName: { contains: q, mode: 'insensitive' } },
      { storeName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [
    total,
    underReviewCount,
    resubmitCount,
    approvedCount,
    rejectedCount,
    suspendedCount,
    allCount,
    sellers,
  ] = await Promise.all([
    prisma.vendorProfile.count({ where }),
    prisma.vendorProfile.count({ where: { status: { in: ['UNDER_REVIEW', 'ONBOARDING_INCOMPLETE'] } } }),
    prisma.vendorProfile.count({ where: { status: 'RESUBMISSION_REQUESTED' } }),
    prisma.vendorProfile.count({ where: { status: 'APPROVED' } }),
    prisma.vendorProfile.count({ where: { status: 'REJECTED' } }),
    prisma.vendorProfile.count({ where: { status: 'SUSPENDED' } }),
    prisma.vendorProfile.count(),
    prisma.vendorProfile.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: { documents: true },
    }),
  ]);

  res.json({
    count: total,
    next: pageNum * limitNum < total ? `/api/v1/admin/sellers/?page=${pageNum + 1}&limit=${limitNum}&tab=${tab}` : null,
    previous: pageNum > 1 ? `/api/v1/admin/sellers/?page=${pageNum - 1}&limit=${limitNum}&tab=${tab}` : null,
    results: sellers.map(formatSellerListItem),
    tab_counts: {
      under_review: underReviewCount,
      resubmission_requested: resubmitCount,
      approved: approvedCount,
      rejected: rejectedCount,
      suspended: suspendedCount,
      all: allCount,
    },
  });
});

adminSellersRouter.get('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:view'), async (req, res) => {
  const id = param(req.params.id);
  const seller = await prisma.vendorProfile.findUnique({
    where: { id },
    include: {
      documents: true,
      reviewLogs: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!seller) throw new ApiError(404, 'not_found', 'Seller merchant not found.');
  res.json(formatSellerDetail(seller));
});

adminSellersRouter.post('/:id/documents/:docId/verify/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const docId = param(req.params.docId);

  await prisma.sellerKycDocument.update({
    where: { id: docId },
    data: {
      status: 'verified',
      verifiedAt: new Date(),
      verifiedBy: req.user!.name,
      rejectionReason: null,
    },
  });

  await prisma.sellerReviewLog.create({
    data: {
      vendorId: id,
      reviewerName: req.user!.name,
      action: 'document_verified',
      notes: `Verified KYC document ${docId}`,
    },
  });

  const updated = await prisma.vendorProfile.findUnique({
    where: { id },
    include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
  });

  res.json(formatSellerDetail(updated));
});

adminSellersRouter.post('/:id/documents/:docId/reject/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const docId = param(req.params.docId);
  const { reason = 'Document rejected' } = req.body || {};

  await prisma.sellerKycDocument.update({
    where: { id: docId },
    data: {
      status: 'rejected',
      rejectionReason: reason,
    },
  });

  await prisma.sellerReviewLog.create({
    data: {
      vendorId: id,
      reviewerName: req.user!.name,
      action: 'document_rejected',
      notes: `Rejected document: ${reason}`,
    },
  });

  const updated = await prisma.vendorProfile.findUnique({
    where: { id },
    include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
  });

  res.json(formatSellerDetail(updated));
});

adminSellersRouter.post('/:id/review/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);

  const updated = await prisma.vendorProfile.update({
    where: { id },
    data: {
      status: SellerStatus.UNDER_REVIEW,
      assignedReviewerId: req.user!.name,
      reviewStartedAt: new Date(),
    },
    include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
  });

  res.json(formatSellerDetail(updated));
});

adminSellersRouter.post('/:id/approve/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { reason = 'All compliance and KYC requirements approved.' } = req.body || {};

  const updated = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id },
      data: { status: SellerStatus.APPROVED },
      include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.sellerReviewLog.create({
      data: {
        vendorId: id,
        reviewerName: req.user!.name,
        action: 'approved',
        notes: reason,
      },
    }),
  ]);

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'APPROVE_SELLER',
    module: 'sellers',
    targetId: id,
    targetName: updated[0].storeName,
    ipAddress: req.ip || '127.0.0.1',
    reason,
  });

  const detail = formatSellerDetail(updated[0]);
  emitToAdmin('admin:seller_approved', detail);
  emitToVendor(id, 'vendor:status_updated', { status: 'approved', reason });
  notifyVendorByEmail(updated[0], 'approved', reason);
  res.json(detail);
});

adminSellersRouter.post('/:id/request-resubmit/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { reason, flagged_sections = [] } = req.body || {};

  // Admin UI sends section names; the vendor onboarding wizard works with step numbers.
  const SECTION_TO_STEP: Record<string, number> = { store_details: 1, pickup_address: 2, kyc_documents: 3, bank_details: 4 };
  const flaggedSteps = Array.from(
    new Set(
      (Array.isArray(flagged_sections) ? flagged_sections : [])
        .map((s: unknown) => (typeof s === 'number' ? s : SECTION_TO_STEP[String(s)]))
        .filter((n: unknown): n is number => typeof n === 'number' && n >= 1 && n <= 5)
    )
  ).sort();

  const existing = await prisma.vendorProfile.findUnique({ where: { id }, select: { onboardingDraft: true } });
  if (!existing) throw new ApiError(404, 'not_found', 'Seller merchant not found.');
  const draft = { ...((existing.onboardingDraft as any) || {}), flagged_sections: flaggedSteps };

  const updated = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id },
      data: { status: SellerStatus.RESUBMISSION_REQUESTED, onboardingDraft: draft },
      include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.sellerReviewLog.create({
      data: {
        vendorId: id,
        reviewerName: req.user!.name,
        action: 'resubmission_requested',
        notes: reason,
        flaggedSections: flagged_sections,
      },
    }),
  ]);

  const detail = formatSellerDetail(updated[0]);
  emitToAdmin('admin:seller_updated', { id, status: 'resubmission_requested' });
  emitToVendor(id, 'vendor:status_updated', { status: 'resubmission_requested', reason, flagged_sections: flaggedSteps });
  notifyVendorByEmail(updated[0], 'resubmission_requested', reason, flaggedSteps);
  res.json(detail);
});

adminSellersRouter.post('/:id/reject/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);

  const updated = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id },
      data: { status: SellerStatus.REJECTED },
      include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.sellerReviewLog.create({
      data: {
        vendorId: id,
        reviewerName: req.user!.name,
        action: 'rejected',
        notes: reason,
      },
    }),
  ]);

  const detail = formatSellerDetail(updated[0]);
  emitToAdmin('admin:seller_updated', { id, status: 'rejected' });
  emitToVendor(id, 'vendor:status_updated', { status: 'rejected', reason });
  notifyVendorByEmail(updated[0], 'rejected', reason);
  res.json(detail);
});

adminSellersRouter.post('/:id/suspend/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { reason } = z.object({ reason: z.string().min(5) }).parse(req.body);

  const updated = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id },
      data: { status: SellerStatus.SUSPENDED },
      include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.sellerReviewLog.create({
      data: {
        vendorId: id,
        reviewerName: req.user!.name,
        action: 'suspended',
        notes: reason,
      },
    }),
  ]);

  const detail = formatSellerDetail(updated[0]);
  emitToAdmin('admin:seller_updated', { id, status: 'suspended' });
  emitToVendor(id, 'vendor:status_updated', { status: 'suspended', reason });
  notifyVendorByEmail(updated[0], 'suspended', reason);
  res.json(detail);
});

adminSellersRouter.post('/:id/reactivate/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { reason = 'Merchant reinstated.' } = req.body || {};

  const updated = await prisma.$transaction([
    prisma.vendorProfile.update({
      where: { id },
      data: { status: SellerStatus.APPROVED },
      include: { documents: true, reviewLogs: { orderBy: { createdAt: 'desc' } } },
    }),
    prisma.sellerReviewLog.create({
      data: {
        vendorId: id,
        reviewerName: req.user!.name,
        action: 'approved',
        notes: reason,
      },
    }),
  ]);

  emitToAdmin('admin:seller_updated', { id, status: 'approved' });
  emitToVendor(id, 'vendor:status_updated', { status: 'approved', reason });
  notifyVendorByEmail(updated[0], 'approved', reason);
  res.json(formatSellerDetail(updated[0]));
});

adminSellersRouter.post('/:id/reveal/', requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { field } = z.object({ field: z.enum(['tax_id', 'pan', 'bank_account']) }).parse(req.body);

  const seller = await prisma.vendorProfile.findUnique({ where: { id } });
  if (!seller) throw new ApiError(404, 'not_found', 'Seller not found.');

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'REVEAL_SENSITIVE_DATA',
    module: 'sellers',
    targetId: seller.id,
    targetName: seller.storeName,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Revealed sensitive field "${field}" for KYC review.`,
  });

  const bankInfo = (seller.bankInfo as any) || {};
  const full_tax_id = seller.taxId || 'NOT_PROVIDED';
  const full_pan = seller.pan || 'NOT_PROVIDED';
  const full_account_number = bankInfo.account_number || bankInfo.accountNumber || bankInfo.full_account_number || 'NOT_PROVIDED';
  const value = field === 'pan' ? full_pan : field === 'tax_id' ? full_tax_id : full_account_number;

  res.json({ field, value, full_tax_id, full_pan, full_account_number });
});
