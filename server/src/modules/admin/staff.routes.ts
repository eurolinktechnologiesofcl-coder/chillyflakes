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

export const adminStaffRouter = Router();

function formatStaffUser(u: any) {
  const role = u.staffProfile?.role;
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || undefined,
    role_id: role?.id || '',
    role_name: role?.name || 'Staff Member',
    status: (u.status === 'ACTIVE' ? 'active' : 'deactivated') as any,
    permissions: (role?.permissions as string[]) || [],
    last_login: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
    created_at: u.createdAt.toISOString(),
  };
}

adminStaffRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('staff_roles:view'), async (_req, res) => {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: [UserRole.STAFF, UserRole.ADMIN] },
      deletedAt: null,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      staffProfile: { include: { role: true } },
    },
  });

  res.json(staff.map(formatStaffUser));
});

const createStaffSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  role_id: z.string().min(1),
  password: z.string().min(6),
});

adminStaffRouter.post('/', requireAuth('ADMIN'), requirePermission('staff_roles:create'), async (req, res) => {
  const data = createStaffSchema.parse(req.body);
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ApiError(400, 'email_exists', 'An account with this email already exists.');

  const role = await prisma.role.findUnique({ where: { id: data.role_id } });
  if (!role) throw new ApiError(400, 'invalid_role', 'Selected role does not exist.');

  const passwordHash = await bcrypt.hash(data.password, 12);

  const staffUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone,
        passwordHash,
        role: role.id === 'role_super_admin' ? UserRole.ADMIN : UserRole.STAFF,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await tx.staffProfile.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: { staffProfile: { include: { role: true } } },
    });
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_STAFF_MEMBER',
    module: 'staff_roles',
    targetId: staffUser!.id,
    targetName: staffUser!.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Created staff member with role ${role.name}`,
  });

  res.status(201).json(formatStaffUser(staffUser));
});

adminStaffRouter.patch('/:id/role/', requireAuth('ADMIN'), requirePermission('staff_roles:edit'), async (req, res) => {
  const id = param(req.params.id);
  const { role_id } = z.object({ role_id: z.string() }).parse(req.body);

  const role = await prisma.role.findUnique({ where: { id: role_id } });
  if (!role) throw new ApiError(400, 'invalid_role', 'Selected role does not exist.');

  await prisma.staffProfile.upsert({
    where: { userId: id },
    update: { roleId: role_id },
    create: { userId: id, roleId: role_id },
  });

  if (role.id === 'role_super_admin') {
    await prisma.user.update({ where: { id }, data: { role: UserRole.ADMIN } });
  }

  const updated = await prisma.user.findUnique({
    where: { id },
    include: { staffProfile: { include: { role: true } } },
  });

  res.json(formatStaffUser(updated));
});

adminStaffRouter.patch('/:id/activate/', requireAuth('ADMIN'), requirePermission('staff_roles:edit'), async (req, res) => {
  const id = param(req.params.id);
  const { active } = z.object({ active: z.boolean() }).parse(req.body);

  const updated = await prisma.user.update({
    where: { id },
    data: { status: active ? UserStatus.ACTIVE : UserStatus.SUSPENDED },
    include: { staffProfile: { include: { role: true } } },
  });

  if (!active) {
    await prisma.session.deleteMany({ where: { userId: id } });
  }

  res.json(formatStaffUser(updated));
});

adminStaffRouter.post('/:id/reset-password/', requireAuth('ADMIN'), requirePermission('staff_roles:edit'), async (req, res) => {
  const id = param(req.params.id);
  const { password } = z.object({ password: z.string().min(6) }).parse(req.body);

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
  ]);

  res.json({ success: true, message: 'Password reset and sessions revoked.' });
});
