import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { param } from '../../lib/params.js';

export const adminRolesRouter = Router();

const roleSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  permissions: z.array(z.string()),
});

adminRolesRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('staff_roles:view'), async (_req, res) => {
  const roles = await prisma.role.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { staffProfiles: true } },
    },
  });

  const formatted = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    is_system: r.isSystem,
    user_count: r._count.staffProfiles,
    permissions: (r.permissions as string[]) || [],
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  }));

  res.json(formatted);
});

adminRolesRouter.post('/', requireAuth('ADMIN'), requirePermission('staff_roles:create'), async (req, res) => {
  const data = roleSchema.parse(req.body);

  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) {
    throw new ApiError(400, 'role_exists', 'A role with this name already exists.');
  }

  const role = await prisma.role.create({
    data: {
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      isSystem: false,
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_ROLE',
    module: 'staff_roles',
    targetId: role.id,
    targetName: role.name,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Created new RBAC role',
  });

  res.status(201).json({
    id: role.id,
    name: role.name,
    description: role.description,
    is_system: false,
    user_count: 0,
    permissions: (role.permissions as string[]) || [],
    created_at: role.createdAt.toISOString(),
    updated_at: role.updatedAt.toISOString(),
  });
});

adminRolesRouter.patch('/:id/', requireAuth('ADMIN'), requirePermission('staff_roles:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = roleSchema.partial().parse(req.body);

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) throw new ApiError(404, 'not_found', 'Role not found.');

  const updated = await prisma.role.update({
    where: { id },
    data: {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description ? { description: data.description } : {}),
      ...(data.permissions ? { permissions: data.permissions } : {}),
    },
    include: { _count: { select: { staffProfiles: true } } },
  });

  res.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    is_system: updated.isSystem,
    user_count: updated._count.staffProfiles,
    permissions: (updated.permissions as string[]) || [],
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
});

adminRolesRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('staff_roles:delete'), async (req, res) => {
  const id = param(req.params.id);
  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { staffProfiles: true } } },
  });

  if (!role) throw new ApiError(404, 'not_found', 'Role not found.');
  if (role.isSystem) throw new ApiError(400, 'system_role', 'System roles cannot be deleted.');
  if (role._count.staffProfiles > 0) {
    throw new ApiError(400, 'role_in_use', 'Cannot delete a role currently assigned to active staff members.');
  }

  await prisma.role.delete({ where: { id } });
  res.json({ success: true, message: 'Role deleted successfully.' });
});
