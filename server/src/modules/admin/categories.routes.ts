import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitBroadcast } from '../../socket.js';
import { param } from '../../lib/params.js';

export const adminCategoriesRouter = Router();

const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  subcategories: z.array(z.string()).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  subcategories: z.array(z.string()).optional(),
});

adminCategoriesRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('categories:view'), async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  const formatted = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description || '',
    subcategories: (c.subcategories as string[]) || [],
    is_active: c.isActive,
    product_count: c._count.products,
    created_at: c.createdAt.toISOString(),
    created_by: c.createdBy || 'System',
  }));

  res.json(formatted);
});

adminCategoriesRouter.post('/', requireAuth('ADMIN', 'STAFF'), requirePermission('categories:create'), async (req, res) => {
  const data = createCategorySchema.parse(req.body);
  const slug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: data.name }, { slug }] },
  });
  if (existing) {
    throw new ApiError(400, 'category_exists', 'A category with this name or slug already exists.');
  }

  const created = await prisma.category.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      subcategories: data.subcategories || [],
      createdBy: req.user!.name,
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_CATEGORY',
    module: 'categories',
    targetId: created.id,
    targetName: created.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Created new marketplace category',
  });

  const responseCategory = {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description || '',
    subcategories: (created.subcategories as string[]) || [],
    is_active: created.isActive,
    product_count: 0,
    created_at: created.createdAt.toISOString(),
    created_by: created.createdBy || req.user!.name,
  };

  emitBroadcast('catalog:category_created', responseCategory);
  res.status(201).json(responseCategory);
});

adminCategoriesRouter.patch('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('categories:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = updateCategorySchema.parse(req.body);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, 'not_found', 'Category not found.');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.is_active !== undefined ? { isActive: data.is_active } : {}),
      ...(data.subcategories ? { subcategories: data.subcategories } : {}),
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_CATEGORY',
    module: 'categories',
    targetId: updated.id,
    targetName: updated.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Updated category metadata/status',
  });

  const responseCategory = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description || '',
    subcategories: (updated.subcategories as string[]) || [],
    is_active: updated.isActive,
    product_count: updated._count.products,
    created_at: updated.createdAt.toISOString(),
    created_by: updated.createdBy || 'System',
  };

  emitBroadcast('catalog:category_updated', responseCategory);
  res.json(responseCategory);
});

adminCategoriesRouter.post('/:id/subcategories/', requireAuth('ADMIN', 'STAFF'), requirePermission('categories:edit'), async (req, res) => {
  const id = param(req.params.id);
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(404, 'not_found', 'Category not found.');
  }

  const existing = (category.subcategories as string[]) || [];
  if (existing.includes(name)) {
    throw new ApiError(400, 'subcategory_exists', 'This subcategory already exists.');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      subcategories: [...existing, name],
    },
    include: {
      _count: { select: { products: true } },
    },
  });

  const responseCategory = {
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    description: updated.description || '',
    subcategories: (updated.subcategories as string[]) || [],
    is_active: updated.isActive,
    product_count: updated._count.products,
    created_at: updated.createdAt.toISOString(),
    created_by: updated.createdBy || 'System',
  };

  emitBroadcast('catalog:category_updated', responseCategory);
  res.json(responseCategory);
});

adminCategoriesRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('categories:delete'), async (req, res) => {
  const id = param(req.params.id);

  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });

  if (!category) {
    throw new ApiError(404, 'not_found', 'Category not found.');
  }

  if (category._count.products > 0) {
    throw new ApiError(
      400,
      'category_in_use',
      `Cannot delete category "${category.name}" because it still contains ${category._count.products} product(s). Please reassign or delete the products first.`
    );
  }

  await prisma.category.delete({ where: { id } });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'DELETE_CATEGORY',
    module: 'categories',
    targetId: category.id,
    targetName: category.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Super Admin deleted category "${category.name}"`,
  });

  emitBroadcast('catalog:category_deleted', { id: category.id, name: category.name });
  res.json({ success: true, message: `Category "${category.name}" deleted successfully.` });
});

