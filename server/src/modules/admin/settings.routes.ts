import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { ApiError } from '../../lib/errors.js';
import { UserRole } from '@prisma/client';

export const adminSettingsRouter = Router();

adminSettingsRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('settings:view'), async (_req, res) => {
  const row = await prisma.platformSetting.findUnique({ where: { id: 'default' } });
  if (!row) {
    res.json({
      marketplace: { platform_fee_percent: 8.5, tcs_tax_percent: 1.0, payout_frequency: 'weekly', minimum_payout_amount: 500 },
      shipping: { free_shipping_threshold: 999, standard_delivery_fee: 49, eco_packaging_fee: 15, estimated_delivery_days: 4 },
      compliance: { gstin: '32AAAAA0000A1Z5', legal_entity_name: 'ChillyFlakes Marketplace Private Limited', registered_office_address: 'Kochi, Kerala', support_email: 'support@chillyflakes.in', support_phone: '+91 98765 43210' },
      system_flags: { maintenance_mode: false, seller_registration_open: true, eco_delivery_enabled: true },
    });
    return;
  }
  res.json(row.settingsJson);
});

adminSettingsRouter.put('/', requireAuth('ADMIN'), requirePermission('settings:edit'), async (req, res) => {
  const payload = req.body;

  const existing = await prisma.platformSetting.findUnique({ where: { id: 'default' } });
  const current = (existing?.settingsJson as Record<string, any>) || {};

  const merged = {
    ...current,
    ...payload,
    marketplace: { ...(current.marketplace || {}), ...(payload.marketplace || {}) },
    shipping: { ...(current.shipping || {}), ...(payload.shipping || {}) },
    compliance: { ...(current.compliance || {}), ...(payload.compliance || {}) },
    system_flags: { ...(current.system_flags || {}), ...(payload.system_flags || {}) },
  };

  const updated = await prisma.platformSetting.upsert({
    where: { id: 'default' },
    update: { settingsJson: merged },
    create: { id: 'default', settingsJson: merged },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_PLATFORM_SETTINGS',
    module: 'settings',
    targetId: 'platform_settings',
    targetName: 'Platform Governance Settings',
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Updated fee, shipping, compliance, or system parameters',
  });

  res.json(updated.settingsJson);
});

/**
 * COMPLETE RESET (Super Admin only).
 *
 * Permanently removes all operational data:
 *   Orders & Returns · Finance & Payouts · Coupons & Promos · Audit Log ·
 *   Product Reviews & Moderation history · Vendor & Seller Hub · Customer Directory
 *   (+ data owned by those accounts: sessions, OTP codes, KYC docs, support tickets,
 *   service bookings).
 *
 * Deliberately KEPT: products, product variants, services, categories, staff/admin
 * accounts, roles and platform settings. Seller-owned products/services remain
 * listed and become first-party (vendorId is set to NULL by the FK rule).
 */
adminSettingsRouter.post('/reset-data/', requireAuth('ADMIN'), async (req, res) => {
  if (req.user!.role !== 'ADMIN') {
    throw new ApiError(403, 'forbidden', 'Only the Super Admin can reset platform data.');
  }
  if (req.body?.confirm !== 'RESET') {
    throw new ApiError(400, 'confirmation_required', 'Type RESET to confirm the complete data reset.');
  }

  const result = await prisma.$transaction(async (tx) => {
    // Coupons & Promos (redemptions first — they reference coupons without cascade)
    const couponRedemptions = await tx.couponRedemption.deleteMany({});

    // Orders & Returns (items + status history cascade)
    const orders = await tx.order.deleteMany({});
    const coupons = await tx.coupon.deleteMany({});

    // Finance & Payouts
    const payoutBatches = await tx.payoutBatch.deleteMany({});
    const ledgerEntries = await tx.vendorLedgerEntry.deleteMany({});

    // Product Reviews & Moderation (customer reviews + listing decision history)
    const reviews = await tx.review.deleteMany({});
    const moderationLogs = await tx.productReviewLog.deleteMany({});

    // Customer / seller owned operational records
    const supportTickets = await tx.supportTicket.deleteMany({});
    const serviceBookings = await tx.serviceBooking.deleteMany({});

    // Vendor & Seller Hub (KYC docs, review logs cascade; products/services → first-party)
    const vendorProfiles = await tx.vendorProfile.deleteMany({});
    const vendors = await tx.user.deleteMany({ where: { role: UserRole.VENDOR } });

    // Customer Directory (sessions + verification codes cascade)
    const customers = await tx.user.deleteMany({ where: { role: UserRole.CUSTOMER } });

    // Audit Log
    const auditLogs = await tx.auditLog.deleteMany({});

    return {
      orders: orders.count,
      coupons: coupons.count,
      coupon_redemptions: couponRedemptions.count,
      payout_batches: payoutBatches.count,
      ledger_entries: ledgerEntries.count,
      reviews: reviews.count,
      moderation_logs: moderationLogs.count,
      support_tickets: supportTickets.count,
      service_bookings: serviceBookings.count,
      sellers: Math.max(vendorProfiles.count, vendors.count),
      customers: customers.count,
      audit_logs: auditLogs.count,
    };
  });

  // Single post-reset trace so the wipe itself is accountable.
  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'COMPLETE_DATA_RESET',
    module: 'settings',
    targetId: 'platform',
    targetName: 'Complete Platform Data Reset',
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Super Admin wiped orders, finance, coupons, audit log, reviews, sellers and customers',
    metadata: result,
  });

  res.json({ success: true, deleted: result });
});
