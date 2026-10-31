import { Router } from 'express';
import { z } from 'zod';
import { ProductStatusEnum } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitBroadcast, emitToAdmin } from '../../socket.js';
import { param } from '../../lib/params.js';

export const adminProductsRouter = Router();

function formatAdminProduct(p: any) {
  const seller = p.vendor
    ? {
        seller_id: p.vendor.id,
        store_name: p.vendor.storeName,
        seller_name: p.vendor.legalName,
        email: p.vendor.email,
        mobile_masked: p.vendor.phone ? `${p.vendor.phone.slice(0, 3)}****${p.vendor.phone.slice(-3)}` : '',
        seller_status: p.vendor.status.toLowerCase(),
      }
    : {
        seller_id: 'first_party',
        store_name: 'ChillyFlakes Direct',
        seller_name: 'Marketplace Operations',
        email: 'support@chillyflakes.in',
        mobile_masked: '+91 98*** ***10',
        seller_status: 'approved',
      };

  const variants = (p.variants || []).map((v: any) => ({
    sku: v.sku,
    color_name: v.colorName,
    size: v.size || undefined,
    stock: v.stock,
    price_paise: v.pricePaise,
  }));

  const reviewHistory = (p.reviewLogs || []).map((r: any) => ({
    id: r.id,
    reviewed_by: r.reviewedBy,
    decision: r.decision,
    reason_code: r.reasonCode || undefined,
    reason: r.reason || undefined,
    created_at: r.createdAt.toISOString(),
  }));

  return {
    id: p.id,
    title: p.title,
    title_i18n: p.titleI18n || { en: p.title },
    sku: p.sku,
    main_image_url: p.mainImageUrl,
    category: {
      id: p.category.id,
      name: p.category.name,
      slug: p.category.slug,
    },
    price_paise: p.pricePaise,
    mrp_paise: p.mrpPaise,
    gst_rate_percent: p.gstRatePercent,
    total_stock: p.totalStock,
    status: p.status.toLowerCase(),
    rejection_reason: p.rejectionReason || undefined,
    wholesale_enabled: p.wholesaleEnabled,
    wholesale_tiers: p.wholesaleTiers || [],
    shipping_weight_grams: p.shippingWeightGrams,
    shipping_dimensions: p.shippingDimensions || { length_cm: 10, width_cm: 10, height_cm: 10 },
    attributes: p.attributes || {},
    tags: p.tags || [],
    description_i18n: p.descriptionI18n || { en: p.description },
    images: Array.isArray(p.images) ? p.images : [p.mainImageUrl],
    variants,
    seller,
    review_history: reviewHistory,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

adminProductsRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:view'), async (req, res) => {
  const { status, category_id, category, search, page = '1', limit, page_size, ordering } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSizeParam = page_size || limit || '50';
  const limitNum = Math.min(100, Math.max(1, parseInt(pageSizeParam as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status && typeof status === 'string' && status !== 'all') {
    const s = status.toUpperCase();
    if (s === 'PENDING_REVIEW' || s === 'PENDING') {
      where.status = ProductStatusEnum.PENDING_APPROVAL;
    } else if (Object.values(ProductStatusEnum).includes(s as ProductStatusEnum)) {
      where.status = s as ProductStatusEnum;
    }
  }

  const cat = (category_id || category) as string | undefined;
  if (cat && cat !== 'all') {
    where.OR = [
      { categoryId: cat },
      { category: { slug: cat } },
      { category: { name: { equals: cat, mode: 'insensitive' } } },
    ];
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = {};
  if (ordering === 'submitted_asc') {
    orderBy.createdAt = 'asc';
  } else if (ordering === 'price_asc') {
    orderBy.pricePaise = 'asc';
  } else if (ordering === 'price_desc') {
    orderBy.pricePaise = 'desc';
  } else {
    orderBy.createdAt = 'desc';
  }

  const [
    total,
    allCount,
    pendingReviewCount,
    approvedCount,
    rejectedCount,
    products,
  ] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.count(),
    prisma.product.count({ where: { status: ProductStatusEnum.PENDING_APPROVAL } }),
    prisma.product.count({ where: { status: ProductStatusEnum.APPROVED } }),
    prisma.product.count({ where: { status: ProductStatusEnum.REJECTED } }),
    prisma.product.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        category: true,
        vendor: true,
        variants: true,
        reviewLogs: { orderBy: { createdAt: 'desc' } },
      },
    }),
  ]);

  res.json({
    count: total,
    total,
    results: products.map(formatAdminProduct),
    status_counts: {
      all: allCount,
      pending_review: pendingReviewCount,
      approved: approvedCount,
      rejected: rejectedCount,
    },
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum) || 1,
  });
});

adminProductsRouter.get('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:view'), async (req, res) => {
  const id = param(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      vendor: true,
      variants: true,
      reviewLogs: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!product) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  res.json(formatAdminProduct(product));
});

const approveSchema = z.object({
  category_id: z.string().optional(),
  subcategory_id: z.string().optional(),
  commission_rate_percent: z.number().optional(),
  notes: z.string().optional(),
});

adminProductsRouter.post('/:id/approve/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:decide'), async (req, res) => {
  const id = param(req.params.id);
  const data = approveSchema.parse(req.body || {});

  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!product) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  const updated = await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        status: ProductStatusEnum.APPROVED,
        rejectionReason: null,
        ...(data.category_id ? { categoryId: data.category_id } : {}),
      },
      include: {
        category: true,
        vendor: true,
        variants: true,
        reviewLogs: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.productReviewLog.create({
      data: {
        productId: id,
        reviewedBy: req.user!.name,
        decision: 'approved',
        reason: data.notes || 'Approved for marketplace catalog publication.',
      },
    }),
  ]);

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'APPROVE_PRODUCT',
    module: 'products',
    targetId: product.id,
    targetName: product.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: data.notes || 'Approved product for marketplace catalog.',
  });

  const formatted = formatAdminProduct(updated[0]);
  emitBroadcast('catalog:product_updated', formatted);
  emitToAdmin('admin:product_approved', formatted);
  res.json(formatted);
});

const rejectSchema = z.object({
  reason_code: z.string(),
  reason: z.string().min(5),
});

adminProductsRouter.post('/:id/reject/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:decide'), async (req, res) => {
  const id = param(req.params.id);
  const data = rejectSchema.parse(req.body);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  const updated = await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        status: ProductStatusEnum.REJECTED,
        rejectionReason: data.reason,
      },
      include: {
        category: true,
        vendor: true,
        variants: true,
        reviewLogs: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.productReviewLog.create({
      data: {
        productId: id,
        reviewedBy: req.user!.name,
        decision: 'rejected',
        reasonCode: data.reason_code,
        reason: data.reason,
      },
    }),
  ]);

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'REJECT_PRODUCT',
    module: 'products',
    targetId: product.id,
    targetName: product.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Rejected: ${data.reason}`,
  });

  const formatted = formatAdminProduct(updated[0]);
  emitBroadcast('catalog:product_updated', formatted);
  emitToAdmin('admin:product_rejected', formatted);
  res.json(formatted);
});

const productCreateSchema = z.object({
  title: z.string().min(2),
  category_id: z.string(),
  sku: z.string().min(2),
  price_paise: z.number().int().positive(),
  mrp_paise: z.number().int().positive(),
  stock: z.number().int().nonnegative().default(10),
  main_image_url: z.string().min(1),
  images: z.array(z.string()).optional(),
  description: z.string().min(5),
  tags: z.array(z.string()).optional(),
  variants: z.array(
    z.object({
      sku: z.string(),
      color_name: z.string().default('Standard'),
      size: z.string().optional(),
      stock: z.number().int().nonnegative(),
      price_paise: z.number().int().positive(),
      mrp_paise: z.number().int().optional(),
    })
  ).optional(),
});

adminProductsRouter.post('/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:create'), async (req, res) => {
  const data = productCreateSchema.parse(req.body);
  const slug = `${data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

  const totalStock = data.variants && data.variants.length > 0
    ? data.variants.reduce((acc, v) => acc + v.stock, 0)
    : data.stock;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        title: data.title,
        slug,
        sku: data.sku,
        categoryId: data.category_id,
        pricePaise: data.price_paise,
        mrpPaise: data.mrp_paise,
        totalStock,
        mainImageUrl: data.main_image_url,
        images: data.images || [data.main_image_url],
        description: data.description,
        tags: data.tags || [],
        status: ProductStatusEnum.APPROVED,
      },
    });

    if (data.variants && data.variants.length > 0) {
      for (const v of data.variants) {
        await tx.productVariant.create({
          data: {
            productId: created.id,
            sku: v.sku,
            colorName: v.color_name,
            size: v.size,
            stock: v.stock,
            pricePaise: v.price_paise,
            mrpPaise: v.mrp_paise || data.mrp_paise,
          },
        });
      }
    } else {
      await tx.productVariant.create({
        data: {
          productId: created.id,
          sku: `${data.sku}-STD`,
          colorName: 'Standard',
          stock: totalStock,
          pricePaise: data.price_paise,
          mrpPaise: data.mrp_paise,
        },
      });
    }

    await tx.inventoryMovement.create({
      data: {
        productId: created.id,
        changeQty: totalStock,
        previousStock: 0,
        newStock: totalStock,
        reason: 'Initial stock intake on product creation',
        referenceType: 'manual',
      },
    });

    return tx.product.findUnique({
      where: { id: created.id },
      include: {
        category: true,
        vendor: true,
        variants: true,
        reviewLogs: true,
      },
    });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_PRODUCT',
    module: 'products',
    targetId: product!.id,
    targetName: product!.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Created new product catalog item',
  });

  const formatted = formatAdminProduct(product);
  emitBroadcast('catalog:product_created', formatted);
  res.status(201).json(formatted);
});

adminProductsRouter.patch('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = productCreateSchema.partial().parse(req.body);

  const existing = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    let newTotalStock = existing.totalStock;

    if (data.variants && data.variants.length > 0) {
      newTotalStock = data.variants.reduce((acc, v) => acc + v.stock, 0);
      await tx.productVariant.deleteMany({ where: { productId: id } });
      for (const v of data.variants) {
        await tx.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            colorName: v.color_name,
            size: v.size,
            stock: v.stock,
            pricePaise: v.price_paise,
            mrpPaise: v.mrp_paise || (data.mrp_paise ?? existing.mrpPaise),
          },
        });
      }
    } else if (data.stock !== undefined) {
      newTotalStock = data.stock;
    }

    if (newTotalStock !== existing.totalStock) {
      await tx.inventoryMovement.create({
        data: {
          productId: id,
          changeQty: newTotalStock - existing.totalStock,
          previousStock: existing.totalStock,
          newStock: newTotalStock,
          reason: 'Admin updated stock quantity',
          referenceType: 'manual',
        },
      });
    }

    return tx.product.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.category_id ? { categoryId: data.category_id } : {}),
        ...(data.price_paise ? { pricePaise: data.price_paise } : {}),
        ...(data.mrp_paise ? { mrpPaise: data.mrp_paise } : {}),
        ...(data.main_image_url ? { mainImageUrl: data.main_image_url } : {}),
        ...(data.images ? { images: data.images } : {}),
        ...(data.description ? { description: data.description } : {}),
        ...(data.tags ? { tags: data.tags } : {}),
        totalStock: newTotalStock,
      },
      include: {
        category: true,
        vendor: true,
        variants: true,
        reviewLogs: { orderBy: { createdAt: 'desc' } },
      },
    });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_PRODUCT',
    module: 'products',
    targetId: updated.id,
    targetName: updated.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Updated product details / pricing / stock',
  });

  const formatted = formatAdminProduct(updated);
  emitBroadcast('catalog:product_updated', formatted);
  res.json(formatted);
});

adminProductsRouter.post('/:id/archive/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:delete'), async (req, res) => {
  const id = param(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.ARCHIVED },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'ARCHIVE_PRODUCT',
    module: 'products',
    targetId: existing.id,
    targetName: existing.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Archived product from catalog',
  });

  emitBroadcast('catalog:product_deleted', { id });
  res.json({ success: true, message: 'Product archived successfully' });
});

adminProductsRouter.delete('/:id/permanent/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:delete'), async (req, res) => {
  const id = param(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { productId: id } });
    await tx.productReviewLog.deleteMany({ where: { productId: id } });
    await tx.inventoryMovement.deleteMany({ where: { productId: id } });
    await tx.review.deleteMany({ where: { productId: id } });
    await tx.productVariant.deleteMany({ where: { productId: id } });
    await tx.product.delete({ where: { id } });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'DELETE_PRODUCT',
    module: 'products',
    targetId: existing.id,
    targetName: existing.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Permanently deleted product from catalog database',
  });

  emitBroadcast('catalog:product_deleted', { id });
  res.json({ success: true, message: 'Product deleted permanently from database.' });
});

adminProductsRouter.delete('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:delete'), async (req, res) => {
  const id = param(req.params.id);
  const isPermanent = req.query.permanent === 'true';

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  if (isPermanent) {
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { productId: id } });
      await tx.productReviewLog.deleteMany({ where: { productId: id } });
      await tx.inventoryMovement.deleteMany({ where: { productId: id } });
      await tx.review.deleteMany({ where: { productId: id } });
      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });
    });

    await recordAuditLog({
      actorId: req.user!.id,
      actorName: req.user!.name,
      actorEmail: req.user!.email,
      actorRole: req.user!.role.toLowerCase(),
      action: 'DELETE_PRODUCT',
      module: 'products',
      targetId: existing.id,
      targetName: existing.title,
      ipAddress: req.ip || '127.0.0.1',
      reason: 'Permanently deleted product from catalog database',
    });

    emitBroadcast('catalog:product_deleted', { id });
    return res.json({ success: true, message: 'Product deleted permanently from database.' });
  }

  await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.ARCHIVED },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'ARCHIVE_PRODUCT',
    module: 'products',
    targetId: existing.id,
    targetName: existing.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Archived product from catalog',
  });

  emitBroadcast('catalog:product_deleted', { id });
  res.json({ success: true, message: 'Product archived successfully' });
});

adminProductsRouter.post('/:id/unarchive/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:edit'), async (req, res) => {
  const id = param(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { status: ProductStatusEnum.APPROVED },
    include: {
      category: true,
      vendor: true,
      variants: true,
      reviewLogs: { orderBy: { createdAt: 'desc' } },
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UNARCHIVE_PRODUCT',
    module: 'products',
    targetId: existing.id,
    targetName: existing.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Unarchived product and restored to active catalog',
  });

  const formatted = formatAdminProduct(updated);
  emitBroadcast('catalog:product_updated', formatted);
  res.json({ success: true, message: 'Product unarchived successfully', product: formatted });
});
