import { prisma } from './prisma.js';

export interface RecordAuditParams {
  actorId?: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  module: string;
  targetId: string;
  targetName: string;
  ipAddress?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(params: RecordAuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        module: params.module,
        targetId: params.targetId,
        targetName: params.targetName,
        ipAddress: params.ipAddress || '127.0.0.1',
        reason: params.reason,
        metadata: (params.metadata || {}) as any,
      },
    });
  } catch (err) {
    console.error('[audit_log] Failed to write audit record:', err);
  }
}
