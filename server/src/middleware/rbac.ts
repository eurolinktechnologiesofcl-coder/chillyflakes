import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export function requirePermission(permissionKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, 'not_authenticated', 'Please sign in to access administration.');
    }

    if (user.role === 'ADMIN') {
      return next(); // Super admin has full root access
    }

    if (user.role !== 'STAFF') {
      throw new ApiError(403, 'forbidden', 'Only staff and administrative users can perform this operation.');
    }

    const staffProfile = await prisma.staffProfile.findUnique({
      where: { userId: user.id },
      include: { role: true },
    });

    if (!staffProfile || !staffProfile.role) {
      throw new ApiError(403, 'permission_denied', 'No administrative role assigned to this account.');
    }

    const permissions = (staffProfile.role.permissions as string[]) || [];
    const [module, action] = permissionKey.split(':');

    const hasPermission =
      permissions.includes(permissionKey) ||
      permissions.includes(`${module}:*`) ||
      permissions.includes('*');

    if (!hasPermission) {
      throw new ApiError(
        403,
        'permission_denied',
        `You do not have permission to perform '${action}' on '${module}'.`
      );
    }

    next();
  };
}
