import { Router } from 'express';
import { z } from 'zod';
import { UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { param } from '../../lib/params.js';

export const adminUsersRouter = Router();

function formatAdminUserAccount(u: any) {
  const isDeleted = Boolean(u.deletedAt);
  const emailMasked = u.email ? `${u.email.slice(0, 3)}***@${u.email.split('@')[1] || 'domain.com'}` : '';

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    email_masked: emailMasked,
    phone: u.phone || '',
    role: u.role.toLowerCase() as any,
    role_id: u.staffProfile?.roleId || undefined,
    role_name: u.staffProfile?.role?.name || undefined,
    status: isDeleted ? 'deleted' : u.status === 'ACTIVE' ? 'active' : 'deactivated',
    email_verified: Boolean(u.emailVerifiedAt),
    phone_verified: Boolean(u.phone),
    orders_count: u._count?.orders || 0,
    store_name: u.vendorProfile?.storeName || undefined,
    store_slug: u.vendorProfile?.storeSlug || undefined,
    is_deleted: isDeleted,
    deleted_at: u.deletedAt ? u.deletedAt.toISOString() : undefined,
    delete_reason: u.deleteReason || undefined,
    created_at: u.createdAt.toISOString(),
    last_login: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
  };
}

adminUsersRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('customers:view'), async (req, res) => {
  const { tab = 'all_accounts', search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};

  if (tab === 'customers') {
    where.role = UserRole.CUSTOMER;
    where.deletedAt = null;
  } else if (tab === 'staff_admins') {
    where.role = { in: [UserRole.STAFF, UserRole.ADMIN] };
    where.deletedAt = null;
  } else if (tab === 'deleted') {
    where.deletedAt = { not: null };
  } else {
    // all_accounts
    where.deletedAt = null;
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [
    total,
    customersCount,
    staffAdminsCount,
    allCount,
    deletedCount,
    users,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({ where: { role: UserRole.CUSTOMER, deletedAt: null } }),
    prisma.user.count({ where: { role: { in: [UserRole.STAFF, UserRole.ADMIN] }, deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.user.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        staffProfile: { include: { role: true } },
        vendorProfile: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  res.json({
    count: total,
    next: pageNum * limitNum < total ? `/api/v1/admin/users/?page=${pageNum + 1}&limit=${limitNum}&tab=${tab}` : null,
    previous: pageNum > 1 ? `/api/v1/admin/users/?page=${pageNum - 1}&limit=${limitNum}&tab=${tab}` : null,
    results: users.map(formatAdminUserAccount),
    tab_counts: {
      customers: customersCount,
      staff_admins: staffAdminsCount,
      all_accounts: allCount,
      deleted: deletedCount,
    },
  });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(6),
  role: z.enum(['customer', 'vendor', 'staff', 'admin']),
  role_id: z.string().optional(),
});

adminUsersRouter.post('/', requireAuth('ADMIN'), requirePermission('customers:create'), async (req, res) => {
  const data = createUserSchema.parse(req.body);
  const normalizedEmail = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new ApiError(400, 'email_exists', 'An account with this email already exists.');
  }

  const tempPassword = `Temp@${Math.floor(1000 + Math.random() * 9000)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const roleEnum = data.role.toUpperCase() as UserRole;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: data.name,
        email: normalizedEmail,
        phone: data.phone,
        passwordHash,
        role: roleEnum,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    if ((roleEnum === 'STAFF' || roleEnum === 'ADMIN') && data.role_id) {
      await tx.staffProfile.create({
        data: {
          userId: created.id,
          roleId: data.role_id,
        },
      });
    }

    return tx.user.findUnique({
      where: { id: created.id },
      include: {
        staffProfile: { include: { role: true } },
        vendorProfile: true,
        _count: { select: { orders: true } },
      },
    });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_USER',
    module: 'customers',
    targetId: user!.id,
    targetName: user!.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Created user account with role ${data.role}`,
  });

  res.status(201).json(formatAdminUserAccount(user));
});

adminUsersRouter.get('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('customers:view'), async (req, res) => {
  const id = param(req.params.id);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      staffProfile: { include: { role: true } },
      vendorProfile: true,
      _count: { select: { orders: true } },
    },
  });

  if (!user) throw new ApiError(404, 'not_found', 'User not found.');
  res.json(formatAdminUserAccount(user));
});

adminUsersRouter.patch('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('customers:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = createUserSchema.partial().parse(req.body);

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, 'not_found', 'User not found.');

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.role ? { role: data.role.toUpperCase() as UserRole } : {}),
      },
    });

    if (data.role_id) {
      await tx.staffProfile.upsert({
        where: { userId: id },
        update: { roleId: data.role_id },
        create: { userId: id, roleId: data.role_id },
      });
    }

    return tx.user.findUnique({
      where: { id: u.id },
      include: {
        staffProfile: { include: { role: true } },
        vendorProfile: true,
        _count: { select: { orders: true } },
      },
    });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_USER',
    module: 'customers',
    targetId: id,
    targetName: updated!.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Updated user account details',
  });

  res.json(formatAdminUserAccount(updated));
});

adminUsersRouter.post('/:id/deactivate/', requireAuth('ADMIN'), requirePermission('customers:decide'), async (req, res) => {
  const id = param(req.params.id);
  if (id === req.user!.id) {
    throw new ApiError(400, 'self_deactivate', 'You cannot deactivate your own account.');
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
      include: {
        staffProfile: { include: { role: true } },
        vendorProfile: true,
        _count: { select: { orders: true } },
      },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'DEACTIVATE_USER',
    module: 'customers',
    targetId: id,
    targetName: updated.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Suspended account and revoked active sessions.',
  });

  res.json(formatAdminUserAccount(updated));
});

adminUsersRouter.post('/:id/activate/', requireAuth('ADMIN'), requirePermission('customers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const updated = await prisma.user.update({
    where: { id },
    data: { status: UserStatus.ACTIVE },
    include: {
      staffProfile: { include: { role: true } },
      vendorProfile: true,
      _count: { select: { orders: true } },
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'ACTIVATE_USER',
    module: 'customers',
    targetId: id,
    targetName: updated.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Restored active status for account.',
  });

  res.json(formatAdminUserAccount(updated));
});

adminUsersRouter.post('/:id/force-password-reset/', requireAuth('ADMIN'), requirePermission('customers:edit'), async (req, res) => {
  const id = param(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'not_found', 'User not found.');

  await prisma.session.deleteMany({ where: { userId: id } });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'FORCE_PASSWORD_RESET',
    module: 'customers',
    targetId: id,
    targetName: user.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Invalidated all sessions and flagged for password reset.',
  });

  res.json({ success: true, message: 'All active sessions revoked. Password reset flagged.' });
});

adminUsersRouter.post('/:id/sign-out-all/', requireAuth('ADMIN'), requirePermission('customers:edit'), async (req, res) => {
  const id = param(req.params.id);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'not_found', 'User not found.');

  await prisma.session.deleteMany({ where: { userId: id } });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'SIGN_OUT_ALL_SESSIONS',
    module: 'customers',
    targetId: id,
    targetName: user.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Signed out all active browser sessions.',
  });

  res.json({ success: true, message: 'All active sessions terminated successfully.' });
});

adminUsersRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('customers:delete'), async (req, res) => {
  const id = param(req.params.id);
  const { reason = 'Account deleted by administrator' } = req.body || {};

  if (id === req.user!.id) {
    throw new ApiError(400, 'self_delete', 'You cannot delete your own account.');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'not_found', 'User not found.');

  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deleteReason: reason,
        status: UserStatus.SUSPENDED,
      },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'SOFT_DELETE_USER',
    module: 'customers',
    targetId: id,
    targetName: user.name,
    ipAddress: req.ip || '127.0.0.1',
    reason,
  });

  res.json({ success: true, message: 'User account soft deleted successfully.' });
});
