import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { checkPassword, createSession, burnTime } from '../auth/service.js';
import { bearerToken, requireAuth } from '../../middleware/auth.js';
import { sha256 } from '../../lib/crypto.js';
import { recordAuditLog } from '../../lib/audit.js';

export const adminAuthRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function formatAdminUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      staffProfile: {
        include: { role: true },
      },
    },
  });

  if (!user) return null;

  const isSuperAdmin = user.role === 'ADMIN';
  const roleName = isSuperAdmin
    ? 'Super Admin'
    : user.staffProfile?.role?.name || 'Staff Member';
  const roleId = isSuperAdmin
    ? 'role_super_admin'
    : user.staffProfile?.roleId || '';

  const permissions = isSuperAdmin
    ? [
        'overview:view', 'overview:export',
        'customers:view', 'customers:edit', 'customers:decide', 'customers:delete', 'customers:export',
        'sellers:view', 'sellers:edit', 'sellers:decide', 'sellers:delete', 'sellers:export',
        'products:view', 'products:create', 'products:edit', 'products:decide', 'products:delete', 'products:export',
        'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
        'orders:view', 'orders:edit', 'orders:decide', 'orders:export',
        'refunds:view', 'refunds:decide', 'refunds:export',
        'payouts:view', 'payouts:decide', 'payouts:export',
        'content:view', 'content:edit',
        'settings:view', 'settings:edit',
        'audit_log:view', 'audit_log:export',
        'staff_roles:view', 'staff_roles:create', 'staff_roles:edit', 'staff_roles:delete',
      ]
    : ((user.staffProfile?.role?.permissions as string[]) || []);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: (isSuperAdmin ? 'admin' : 'staff') as 'admin' | 'staff',
    role_id: roleId,
    role_name: roleName,
    permissions,
  };
}

adminAuthRouter.post('/login/', async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: {
      staffProfile: { include: { role: true } },
    },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF') || user.deletedAt) {
    await burnTime(password);
    throw new ApiError(401, 'invalid_credentials', 'Invalid admin email or password.');
  }

  if (user.status !== 'ACTIVE') {
    throw new ApiError(403, 'account_deactivated', 'This administrative account is not active.');
  }

  const valid = await checkPassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, 'invalid_credentials', 'Invalid admin email or password.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  const token = await createSession(user.id, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  const adminUser = await formatAdminUser(user.id);

  await recordAuditLog({
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    actorRole: user.role.toLowerCase(),
    action: 'ADMIN_LOGIN',
    module: 'overview',
    targetId: user.id,
    targetName: user.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Signed into Super Admin console.',
  });

  res.json({
    message: 'Admin login successful',
    user: adminUser,
    token,
  });
});

adminAuthRouter.post('/logout/', async (req, res) => {
  const token = bearerToken(req);
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } }).catch(() => undefined);
  }
  res.json({ message: 'Logged out successfully' });
});

adminAuthRouter.get('/me/', requireAuth('ADMIN', 'STAFF'), async (req, res) => {
  const user = await formatAdminUser(req.user!.id);
  if (!user) {
    throw new ApiError(401, 'unauthorized', 'Session expired.');
  }
  res.json(user);
});
