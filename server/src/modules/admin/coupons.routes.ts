import { Router } from 'express';
import { z } from 'zod';
import { DiscountType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { param } from '../../lib/params.js';

export const adminCouponsRouter = Router();
export const publicCouponsRouter = Router();

/* ----------------------------- PUBLIC VALIDATE ----------------------------- */
publicCouponsRouter.post('/validate/', async (req, res) => {
  const { code, order_amount, orderAmount, amount: bodyAmount } = z.object({
    code: z.string().min(1),
    order_amount: z.number().optional(),
    orderAmount: z.number().optional(),
    amount: z.number().optional(),
  }).parse(req.body);

  const clean = code.trim().toUpperCase();
  const amount = order_amount ?? orderAmount ?? bodyAmount;

  const coupon = await prisma.coupon.findUnique({ where: { code: clean } });

  if (!coupon || !coupon.isActive) {
    res.json({
      valid: false,
      code: clean,
      discountType: 'PERCENTAGE',
      discountValue: 0,
      discountPercent: 0,
      discountAmount: 0,
      message: 'Invalid or inactive coupon code.',
    });
    return;
  }

  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) {
    res.json({
      valid: false,
      code: clean,
      discountType: coupon.discountType,
      discountValue: 0,
      discountPercent: 0,
      discountAmount: 0,
      message: 'This coupon promotion has not started yet.',
    });
    return;
  }

  if (coupon.expiresAt && coupon.expiresAt < now) {
    res.json({
      valid: false,
      code: clean,
      discountType: coupon.discountType,
      discountValue: 0,
      discountPercent: 0,
      discountAmount: 0,
      message: 'This coupon code has expired.',
    });
    return;
  }

  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    res.json({
      valid: false,
      code: clean,
      discountType: coupon.discountType,
      discountValue: 0,
      discountPercent: 0,
      discountAmount: 0,
      message: 'This coupon has reached its total usage limit.',
    });
    return;
  }

  if (amount !== undefined && coupon.minOrderAmount > 0 && amount < coupon.minOrderAmount) {
    res.json({
      valid: false,
      code: clean,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountPercent: coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0,
      discountAmount: 0,
      minOrderAmount: coupon.minOrderAmount,
      message: `Minimum order amount of ₹${coupon.minOrderAmount} required for coupon ${clean}.`,
    });
    return;
  }

  let calculatedDiscount = 0;
  if (coupon.discountType === 'FIXED') {
    calculatedDiscount = coupon.discountValue;
  } else {
    calculatedDiscount = amount !== undefined ? Math.round((amount * coupon.discountValue) / 100) : 0;
    if (coupon.maxDiscountAmount && calculatedDiscount > coupon.maxDiscountAmount) {
      calculatedDiscount = coupon.maxDiscountAmount;
    }
  }

  if (amount !== undefined && calculatedDiscount > amount) {
    calculatedDiscount = amount;
  }

  const defaultMsg = coupon.discountType === 'FIXED'
    ? `Flat ₹${coupon.discountValue} OFF applied!`
    : `${coupon.discountValue}% OFF applied!`;

  res.json({
    valid: true,
    code: clean,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountPercent: coupon.discountType === 'PERCENTAGE' ? coupon.discountValue : 0,
    discountAmount: calculatedDiscount,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount || undefined,
    message: coupon.description || defaultMsg,
  });
});

/* ------------------------------- ADMIN CRUD -------------------------------- */
const couponSchema = z.object({
  code: z.string().min(2),
  description: z.string().optional(),
  discount_type: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  discount_value: z.number().int().positive(),
  min_order_amount: z.number().int().nonnegative().default(0),
  max_discount_amount: z.number().int().positive().optional(),
  usage_limit: z.number().int().positive().optional(),
  per_user_limit: z.number().int().positive().default(1),
  is_active: z.boolean().default(true),
  expires_at: z.string().optional(),
});

adminCouponsRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('settings:view'), async (_req, res) => {
  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const formatted = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description || '',
    discount_type: c.discountType,
    discount_value: c.discountValue,
    min_order_amount: c.minOrderAmount,
    max_discount_amount: c.maxDiscountAmount || undefined,
    usage_limit: c.usageLimit || undefined,
    usage_count: c.usageCount,
    per_user_limit: c.perUserLimit,
    is_active: c.isActive,
    starts_at: c.startsAt ? c.startsAt.toISOString() : undefined,
    expires_at: c.expiresAt ? c.expiresAt.toISOString() : undefined,
    created_at: c.createdAt.toISOString(),
  }));

  res.json(formatted);
});

adminCouponsRouter.post('/', requireAuth('ADMIN', 'STAFF'), requirePermission('settings:edit'), async (req, res) => {
  const data = couponSchema.parse(req.body);
  const cleanCode = data.code.trim().toUpperCase();

  const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
  if (existing) {
    throw new ApiError(400, 'coupon_exists', 'A coupon with this code already exists.');
  }

  const created = await prisma.coupon.create({
    data: {
      code: cleanCode,
      description: data.description,
      discountType: data.discount_type as DiscountType,
      discountValue: data.discount_value,
      minOrderAmount: data.min_order_amount,
      maxDiscountAmount: data.max_discount_amount,
      usageLimit: data.usage_limit,
      perUserLimit: data.per_user_limit,
      isActive: data.is_active,
      expiresAt: data.expires_at ? new Date(data.expires_at) : null,
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_COUPON',
    module: 'settings',
    targetId: created.id,
    targetName: created.code,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Created coupon ${created.code}`,
  });

  res.status(201).json(created);
});

adminCouponsRouter.patch('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('settings:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = couponSchema.partial().parse(req.body);

  const updated = await prisma.coupon.update({
    where: { id },
    data: {
      ...(data.code ? { code: data.code.trim().toUpperCase() } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.discount_type ? { discountType: data.discount_type as DiscountType } : {}),
      ...(data.discount_value !== undefined ? { discountValue: data.discount_value } : {}),
      ...(data.min_order_amount !== undefined ? { minOrderAmount: data.min_order_amount } : {}),
      ...(data.max_discount_amount !== undefined ? { maxDiscountAmount: data.max_discount_amount } : {}),
      ...(data.usage_limit !== undefined ? { usageLimit: data.usage_limit } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
      ...(data.expires_at !== undefined ? { expiresAt: data.expires_at ? new Date(data.expires_at) : null } : {}),
    },
  });

  res.json(updated);
});

adminCouponsRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('settings:edit'), async (req, res) => {
  const id = param(req.params.id);
  await prisma.coupon.delete({ where: { id } });
  res.json({ success: true, message: 'Coupon deleted successfully.' });
});
