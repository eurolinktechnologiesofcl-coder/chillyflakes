import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

export const adminAuditRouter = Router();

adminAuditRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('audit_log:view'), async (req, res) => {
  const { module, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (module && typeof module === 'string' && module !== 'all') {
    where.module = module;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { actorName: { contains: q, mode: 'insensitive' } },
      { actorEmail: { contains: q, mode: 'insensitive' } },
      { action: { contains: q, mode: 'insensitive' } },
      { targetName: { contains: q, mode: 'insensitive' } },
      { reason: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { timestamp: 'desc' },
    }),
  ]);

  const results = logs.map((l) => ({
    id: l.id,
    timestamp: l.timestamp.toISOString(),
    actor_name: l.actorName,
    actor_email: l.actorEmail,
    actorRole: l.actorRole,
    action: l.action,
    module: l.module as any,
    target_id: l.targetId,
    target_name: l.targetName,
    ip_address: l.ipAddress,
    reason: l.reason || undefined,
    metadata: (l.metadata as Record<string, unknown>) || undefined,
  }));

  res.json({
    count: total,
    next: pageNum * limitNum < total ? `/api/v1/admin/audit-log/?page=${pageNum + 1}&limit=${limitNum}` : null,
    previous: pageNum > 1 ? `/api/v1/admin/audit-log/?page=${pageNum - 1}&limit=${limitNum}` : null,
    results,
  });
});
