import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitToVendor } from '../../socket.js';
import { param } from '../../lib/params.js';

export const adminSupportRouter = Router();

function formatTicket(t: any) {
  return {
    id: t.id,
    ticket_number: t.ticketNumber,
    ticketNumber: t.ticketNumber,
    vendor_id: t.vendorId,
    vendor_name: t.vendor?.storeName || t.user?.name || 'Artisan Seller',
    user_id: t.userId,
    user_email: t.user?.email || '',
    subject: t.subject,
    category: t.category,
    priority: (t.priority || 'medium').toUpperCase(),
    status: (t.status || 'open').toUpperCase(),
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    vendor: t.vendor,
    user: t.user,
    messages: (t.messages || []).map((m: any) => ({
      id: m.id,
      ticket_id: m.ticketId,
      sender_id: m.senderId,
      sender_name: m.senderName,
      sender_role: m.senderRole,
      senderRole: (m.senderRole || '').toUpperCase(),
      message: m.message,
      attachments: (m.attachments as string[]) || [],
      created_at: m.createdAt.toISOString(),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

// 1. List all tickets
adminSupportRouter.get(['/', '/tickets/'], requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:view'), async (req, res) => {
  const { status, category, search } = req.query;

  const where: any = {};
  if (status && typeof status === 'string' && status !== 'all') {
    where.status = { equals: status.toLowerCase(), mode: 'insensitive' };
  }
  if (category && typeof category === 'string' && category !== 'all') {
    where.category = category;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { ticketNumber: { contains: q, mode: 'insensitive' } },
      { subject: { contains: q, mode: 'insensitive' } },
      { vendor: { storeName: { contains: q, mode: 'insensitive' } } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      vendor: { select: { id: true, storeName: true, legalName: true } },
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({
    tickets: tickets.map(formatTicket),
    count: tickets.length,
  });
});

// 2. Get single ticket with message history
adminSupportRouter.get(['/:id/', '/tickets/:id/'], requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:view'), async (req, res) => {
  const id = param(req.params.id);

  const ticket = await prisma.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNumber: id }] },
    include: {
      vendor: { select: { id: true, storeName: true, legalName: true, phone: true, email: true } },
      user: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!ticket) throw new ApiError(404, 'not_found', 'Support ticket not found.');

  res.json(formatTicket(ticket));
});

// 3. Super Admin/Staff reply to ticket
adminSupportRouter.post(['/:id/messages/', '/tickets/:id/messages/'], requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const { message, attachments, set_status } = z.object({
    message: z.string().min(1, 'Message cannot be empty.'),
    attachments: z.array(z.string()).optional(),
    set_status: z.enum(['open', 'in_progress', 'waiting_vendor', 'resolved', 'closed']).optional(),
  }).parse(req.body);

  const ticket = await prisma.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNumber: id }] },
    include: { vendor: true },
  });

  if (!ticket) throw new ApiError(404, 'not_found', 'Support ticket not found.');

  const createdMessage = await prisma.$transaction(async (tx) => {
    const msg = await tx.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderId: req.user!.id,
        senderName: req.user!.name || 'Support Team',
        senderRole: req.user!.role.toLowerCase(),
        message,
        attachments: attachments || [],
      },
    });

    const nextStatus = set_status || 'waiting_vendor';
    await tx.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: nextStatus,
        updatedAt: new Date(),
      },
    });

    return msg;
  });

  if (ticket.vendorId) {
    emitToVendor(ticket.vendorId, 'support:new_reply', {
      ticket_id: ticket.id,
      ticket_number: ticket.ticketNumber,
      sender_name: req.user!.name,
      message,
    });
  }

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'REPLY_SUPPORT_TICKET',
    module: 'support',
    targetId: ticket.id,
    targetName: ticket.ticketNumber,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Staff replied to ticket #${ticket.ticketNumber}`,
  });

  res.status(201).json({
    id: createdMessage.id,
    ticket_id: ticket.id,
    sender_name: createdMessage.senderName,
    sender_role: createdMessage.senderRole,
    message: createdMessage.message,
    created_at: createdMessage.createdAt.toISOString(),
  });
});

// 4. Update ticket status
adminSupportRouter.patch(['/:id/status/', '/tickets/:id/status/'], requireAuth('ADMIN', 'STAFF'), requirePermission('sellers:decide'), async (req, res) => {
  const id = param(req.params.id);
  const status = String(req.body.status || '').toLowerCase() as any;
  const valid = ['open', 'in_progress', 'waiting_vendor', 'resolved', 'closed'];
  if (!valid.includes(status)) {
    throw new ApiError(400, 'invalid_status', `Valid statuses: ${valid.join(', ')}`);
  }

  const ticket = await prisma.supportTicket.findFirst({
    where: { OR: [{ id }, { ticketNumber: id }] },
  });

  if (!ticket) throw new ApiError(404, 'not_found', 'Support ticket not found.');

  const updated = await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status, updatedAt: new Date() },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_TICKET_STATUS',
    module: 'support',
    targetId: ticket.id,
    targetName: ticket.ticketNumber,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Changed ticket #${ticket.ticketNumber} status to ${status}`,
  });

  res.json({
    id: updated.id,
    ticket_number: updated.ticketNumber,
    status: updated.status,
    updated_at: updated.updatedAt.toISOString(),
  });
});
