import { Router } from 'express';
import { z } from 'zod';
import { OrderStatusEnum } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { emitBroadcast, emitToAdmin, emitToUser, emitToOrder } from '../../socket.js';
import { param } from '../../lib/params.js';
import { sendMail } from '../../lib/mailer.js';
import { orderStatusChangedTemplate } from '../../emails/templates.js';

export const adminOrdersRouter = Router();

function formatAdminOrder(o: any) {
  const items = (o.items || []).map((it: any) => ({
    product_id: it.productId,
    title: it.title,
    image: it.image,
    quantity: it.quantity,
    unit_price: it.unitPrice,
    total_price: it.totalPrice,
    seller_id: it.sellerId || 'first_party',
    seller_name: it.sellerName || 'ChillyFlakes Direct',
  }));

  const shippingAddr = (typeof o.shippingAddress === 'object' && o.shippingAddress)
    ? o.shippingAddress
    : {
        name: o.customerName,
        street: 'Main Street',
        city: 'City',
        state: 'State',
        pincode: '000000',
        country: 'India',
      };

  return {
    id: o.id,
    order_number: o.orderNumber,
    customer_id: o.customerId || o.customerEmail,
    customer_name: o.customerName,
    customer_email: o.customerEmail,
    customer_phone: o.customerPhone,
    items,
    total_amount: o.totalAmount,
    shipping_fee: o.shippingFee,
    tax_amount: o.taxAmount,
    payment_method: o.paymentMethod.toLowerCase() as any,
    payment_status: o.paymentStatus.toLowerCase() as any,
    order_status: o.orderStatus.toLowerCase() as any,
    delivery_speed: o.deliverySpeed as any,
    is_eco_delivery: o.isEcoDelivery,
    tracking_number: o.trackingNumber || undefined,
    courier_partner: o.courierPartner || undefined,
    shipping_address: shippingAddr,
    return_reason: o.returnReason || undefined,
    return_notes: o.returnNotes || undefined,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  };
}

adminOrdersRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('orders:view'), async (req, res) => {
  const { status, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status && typeof status === 'string' && status !== 'all') {
    where.orderStatus = status.toUpperCase() as OrderStatusEnum;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { customerPhone: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [
    total,
    allCount,
    pendingDispatchCount,
    inTransitCount,
    deliveredCount,
    returnRequestedCount,
    cancelledCount,
    orders,
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: 'PENDING_DISPATCH' } }),
    prisma.order.count({ where: { orderStatus: 'IN_TRANSIT' } }),
    prisma.order.count({ where: { orderStatus: 'DELIVERED' } }),
    prisma.order.count({ where: { orderStatus: 'RETURN_REQUESTED' } }),
    prisma.order.count({ where: { orderStatus: 'CANCELLED' } }),
    prisma.order.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    }),
  ]);

  res.json({
    count: total,
    next: pageNum * limitNum < total ? `/api/v1/admin/orders/?page=${pageNum + 1}&limit=${limitNum}` : null,
    previous: pageNum > 1 ? `/api/v1/admin/orders/?page=${pageNum - 1}&limit=${limitNum}` : null,
    results: orders.map(formatAdminOrder),
    tab_counts: {
      all: allCount,
      pending_dispatch: pendingDispatchCount,
      in_transit: inTransitCount,
      delivered: deliveredCount,
      return_requested: returnRequestedCount,
      cancelled: cancelledCount,
    },
  });
});

adminOrdersRouter.get('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('orders:view'), async (req, res) => {
  const id = param(req.params.id);
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, statusHistory: true },
  });

  if (!order) {
    throw new ApiError(404, 'not_found', 'Order not found.');
  }

  res.json(formatAdminOrder(order));
});

const updateStatusSchema = z.object({
  status: z.enum(['pending_dispatch', 'in_transit', 'delivered', 'cancelled', 'return_requested', 'refunded']).optional(),
  order_status: z.enum(['pending_dispatch', 'in_transit', 'delivered', 'cancelled', 'return_requested', 'refunded']).optional(),
  tracking_number: z.string().optional().nullable(),
  courier_partner: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

adminOrdersRouter.patch('/:id/status/', requireAuth('ADMIN', 'STAFF'), requirePermission('orders:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = updateStatusSchema.parse(req.body);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    throw new ApiError(404, 'not_found', 'Order not found.');
  }

  const rawStatus = data.order_status || data.status;
  const targetStatus = rawStatus ? (rawStatus.toUpperCase() as OrderStatusEnum) : order.orderStatus;
  const previousStatus = order.orderStatus;

  const statusChanged = previousStatus !== targetStatus;
  const courierChanged = data.courier_partner !== undefined && data.courier_partner !== order.courierPartner;
  const trackingChanged = data.tracking_number !== undefined && data.tracking_number !== order.trackingNumber;

  if (!statusChanged && !courierChanged && !trackingChanged) {
    res.json(formatAdminOrder(order));
    return;
  }

  // Handle stock restore if transitioning to CANCELLED
  const updated = await prisma.$transaction(async (tx) => {
    if (targetStatus === 'CANCELLED' && previousStatus !== 'CANCELLED' && previousStatus !== 'REFUNDED') {
      for (const it of order.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { totalStock: { increment: it.quantity } },
        });

        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          }).catch(() => undefined);
        }

        await tx.inventoryMovement.create({
          data: {
            productId: it.productId,
            variantId: it.variantId,
            changeQty: it.quantity,
            previousStock: 0,
            newStock: it.quantity,
            reason: `Restocked on order cancellation #${order.orderNumber}`,
            referenceType: 'cancel',
            referenceId: order.id,
          },
        });
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        orderStatus: targetStatus,
        ...(data.tracking_number !== undefined ? { trackingNumber: data.tracking_number || null } : {}),
        ...(data.courier_partner !== undefined ? { courierPartner: data.courier_partner || null } : {}),
        ...(targetStatus === 'DELIVERED' && order.paymentMethod === 'cod' ? { paymentStatus: 'paid' } : {}),
      },
      include: { items: true },
    });

    if (statusChanged) {
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: previousStatus,
          toStatus: targetStatus,
          changedBy: req.user!.name,
          reason: data.notes || `Status updated to ${rawStatus || targetStatus} by admin`,
        },
      });
    }

    return updatedOrder;
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_ORDER_STATUS',
    module: 'orders',
    targetId: order.id,
    targetName: order.orderNumber,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Changed order #${order.orderNumber} status from ${previousStatus} to ${targetStatus}`,
  });

  const formatted = formatAdminOrder(updated);
  emitToAdmin('admin:order_updated', formatted);
  emitToOrder(order.id, 'order:status_updated', formatted);
  if (order.orderNumber) {
    emitToOrder(order.orderNumber, 'order:status_updated', formatted);
  }
  emitBroadcast('order:status_updated', formatted);
  if (order.customerId) {
    emitToUser(order.customerId, 'order:status_updated', formatted);
  }
  if (targetStatus === 'CANCELLED') {
    emitBroadcast('catalog:stock_updated', { orderId: order.id });
  }

  // Trigger customer email notification asynchronously
  if (statusChanged || (trackingChanged && updated.trackingNumber)) {
    try {
      const tpl = orderStatusChangedTemplate(updated, targetStatus, data.notes || undefined);
      await sendMail({ to: updated.customerEmail, ...tpl });
      console.log(`[order:status_email] Sent ${targetStatus} notice to ${updated.customerEmail} for #${updated.orderNumber}`);
    } catch (err) {
      console.error(`[order:status_email] Failed to send notice for #${updated.orderNumber}:`, (err as Error).message);
    }
  }

  res.json(formatted);
});

const resolveReturnSchema = z.object({
  action: z.enum(['approve_refund', 'reject_return']).optional(),
  decision: z.enum(['approved', 'rejected']).optional(),
  reason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  refund_amount: z.number().optional(),
});

adminOrdersRouter.post('/:id/resolve-return/', requireAuth('ADMIN', 'STAFF'), requirePermission('refunds:decide'), async (req, res) => {
  const id = param(req.params.id);
  const data = resolveReturnSchema.parse(req.body);

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!order) {
    throw new ApiError(404, 'not_found', 'Order not found.');
  }

  const isApproved = data.action === 'approve_refund' || data.decision === 'approved';
  const newStatus: OrderStatusEnum = isApproved ? 'REFUNDED' : 'DELIVERED';
  const newPaymentStatus = isApproved ? 'refunded' : order.paymentStatus;
  const returnNotes = data.reason || data.notes || (isApproved ? 'Return approved by admin' : 'Return rejected by admin');

  const updated = await prisma.$transaction(async (tx) => {
    if (isApproved) {
      // Restock inventory for returned items
      for (const it of order.items) {
        await tx.product.update({
          where: { id: it.productId },
          data: { totalStock: { increment: it.quantity } },
        });

        if (it.variantId) {
          await tx.productVariant.update({
            where: { id: it.variantId },
            data: { stock: { increment: it.quantity } },
          }).catch(() => undefined);
        }

        await tx.inventoryMovement.create({
          data: {
            productId: it.productId,
            variantId: it.variantId,
            changeQty: it.quantity,
            previousStock: 0,
            newStock: it.quantity,
            reason: `Restocked on return approved #${order.orderNumber}`,
            referenceType: 'refund',
            referenceId: order.id,
          },
        });
      }
    }

    const updatedOrder = await tx.order.update({
      where: { id },
      data: {
        orderStatus: newStatus,
        paymentStatus: newPaymentStatus,
        returnNotes,
      },
      include: { items: true },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: order.orderStatus,
        toStatus: newStatus,
        changedBy: req.user!.name,
        reason: returnNotes,
      },
    });

    return updatedOrder;
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'RESOLVE_ORDER_RETURN',
    module: 'refunds',
    targetId: order.id,
    targetName: order.orderNumber,
    ipAddress: req.ip || '127.0.0.1',
    reason: `Return resolved as ${data.decision}`,
  });

  const formatted = formatAdminOrder(updated);
  emitToAdmin('admin:order_updated', formatted);
  emitToOrder(order.id, 'order:return_resolved', formatted);
  if (order.customerId) {
    emitToUser(order.customerId, 'order:return_resolved', formatted);
  }
  if (data.decision === 'approved') {
    emitBroadcast('catalog:stock_updated', { orderId: order.id });
  }

  // Trigger customer email notification for return resolution
  try {
    const tpl = orderStatusChangedTemplate(updated, newStatus, returnNotes || undefined);
    await sendMail({ to: updated.customerEmail, ...tpl });
    console.log(`[order:return_email] Sent ${newStatus} notice to ${updated.customerEmail} for #${updated.orderNumber}`);
  } catch (err) {
    console.error(`[order:return_email] Failed to send notice for #${updated.orderNumber}:`, (err as Error).message);
  }

  res.json(formatted);
});
