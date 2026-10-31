import { Router } from 'express';
import { z } from 'zod';
import { ReviewStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { param } from '../../lib/params.js';
import { emitToAdmin, emitBroadcast } from '../../socket.js';

export const publicReviewsRouter = Router({ mergeParams: true });
export const adminReviewsRouter = Router();

/* ----------------------------- PUBLIC REVIEWS ------------------------------ */

// GET /api/v1/products/:productId/reviews/
publicReviewsRouter.get('/', async (req, res) => {
  const { productId } = req.params as { productId: string };

  // Find product by id or slug
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }] },
    select: { id: true, title: true },
  });

  if (!product) {
    res.json({ results: [], totalCount: 0, averageRating: 0 });
    return;
  }

  const reviews = await prisma.review.findMany({
    where: {
      productId: product.id,
      status: ReviewStatus.APPROVED,
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalCount = reviews.length;
  const averageRating = totalCount > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalCount).toFixed(1))
    : 0;

  res.json({
    results: reviews.map((r) => ({
      id: r.id,
      productId: r.productId,
      userName: r.customerName,
      rating: r.rating,
      title: r.title || 'Verified Customer Review',
      comment: r.comment,
      verifiedPurchase: r.verifiedPurchase,
      createdAt: r.createdAt.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    })),
    totalCount,
    averageRating,
  });
});

const submitReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(2),
  comment: z.string().min(5),
  customerName: z.string().min(2),
  customerEmail: z.string().email().optional(),
});

// POST /api/v1/products/:productId/reviews/
publicReviewsRouter.post('/', async (req, res) => {
  const { productId } = req.params as { productId: string };
  const data = submitReviewSchema.parse(req.body);

  const product = await prisma.product.findFirst({
    where: { OR: [{ id: productId }, { slug: productId }] },
  });

  if (!product) {
    throw new ApiError(404, 'product_not_found', 'Product not found.');
  }

  // Check verified purchase if email provided
  let verifiedPurchase = false;
  let userId: string | null = null;

  if (data.customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: data.customerEmail.toLowerCase().trim() },
    });
    if (user) {
      userId = user.id;
    }

    const pastOrder = await prisma.order.findFirst({
      where: {
        customerEmail: data.customerEmail.toLowerCase().trim(),
        orderStatus: { in: ['DELIVERED', 'PENDING_DISPATCH', 'IN_TRANSIT'] },
        items: {
          some: { productId: product.id },
        },
      },
    });
    if (pastOrder) {
      verifiedPurchase = true;
    }
  }

  // Create review in PENDING status for moderation
  const review = await prisma.review.create({
    data: {
      productId: product.id,
      userId,
      customerName: data.customerName.trim(),
      customerEmail: data.customerEmail?.toLowerCase().trim() || null,
      rating: data.rating,
      title: data.title.trim(),
      comment: data.comment.trim(),
      status: ReviewStatus.PENDING,
      verifiedPurchase,
    },
  });

  emitToAdmin('admin:review_submitted', {
    id: review.id,
    productTitle: product.title,
    rating: review.rating,
    customerName: review.customerName,
  });

  res.status(201).json({
    message: 'Thank you! Your review is important to us and has been submitted successfully. It will be reviewed by admin for approval before being published.',
    review: {
      id: review.id,
      status: review.status.toLowerCase(),
      rating: review.rating,
      customerName: review.customerName,
      title: review.title,
      comment: review.comment,
    },
  });
});

/* ------------------------------ ADMIN REVIEWS ------------------------------ */

adminReviewsRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:view'), async (req, res) => {
  const { status = 'all', search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status && status !== 'all') {
    const s = String(status).toUpperCase();
    if (['PENDING', 'APPROVED', 'REJECTED'].includes(s)) {
      where.status = s as ReviewStatus;
    }
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
      { comment: { contains: q, mode: 'insensitive' } },
      { product: { title: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [
    total,
    allCount,
    pendingCount,
    approvedCount,
    rejectedCount,
    reviews,
  ] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.count(),
    prisma.review.count({ where: { status: ReviewStatus.PENDING } }),
    prisma.review.count({ where: { status: ReviewStatus.APPROVED } }),
    prisma.review.count({ where: { status: ReviewStatus.REJECTED } }),
    prisma.review.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, title: true, mainImageUrl: true, sku: true } },
      },
    }),
  ]);

  res.json({
    count: total,
    results: reviews.map((r) => ({
      id: r.id,
      product_id: r.productId,
      product_title: r.product.title,
      product_sku: r.product.sku,
      product_image: r.product.mainImageUrl,
      user_name: r.customerName,
      user_email: r.customerEmail || '',
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status.toLowerCase(),
      verified_purchase: r.verifiedPurchase,
      created_at: r.createdAt.toISOString(),
    })),
    status_counts: {
      all: allCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum) || 1,
  });
});

adminReviewsRouter.patch('/:id/status/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:edit'), async (req, res) => {
  const id = param(req.params.id);
  const { status } = z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
  }).parse(req.body);

  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: true },
  });

  if (!review) {
    throw new ApiError(404, 'not_found', 'Review not found.');
  }

  const updated = await prisma.review.update({
    where: { id },
    data: { status: status.toUpperCase() as ReviewStatus },
    include: { product: true },
  });

  emitBroadcast('catalog:review_updated', {
    productId: updated.productId,
    reviewId: updated.id,
    status: updated.status,
  });

  res.json({
    id: updated.id,
    status: updated.status.toLowerCase(),
    message: `Review marked as ${status}.`,
  });
});

adminReviewsRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('products:delete'), async (req, res) => {
  const id = param(req.params.id);
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new ApiError(404, 'not_found', 'Review not found.');
  }

  await prisma.review.delete({ where: { id } });
  emitBroadcast('catalog:review_deleted', { productId: review.productId, reviewId: review.id });
  res.json({ message: 'Review deleted successfully.' });
});
