import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';
import { requireAuth, optionalAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { recordAuditLog } from '../../lib/audit.js';
import { param } from '../../lib/params.js';
import { emitBroadcast, emitToAdmin, emitToVendor } from '../../socket.js';
import { sendMail } from '../../lib/mailer.js';
import {
  serviceBookingCustomerTemplate,
  serviceBookingAdminTemplate,
  serviceBookingVendorTemplate,
  serviceBookingStatusUpdateCustomerTemplate,
  serviceBookingCancellationAdminTemplate,
} from '../../emails/templates.js';
import { env } from '../../config/env.js';
import { BookingStatus } from '@prisma/client';

export const publicServicesRouter = Router();
export const adminServicesRouter = Router();

function formatService(s: any) {
  const priceNum = s.pricePaise > 0 ? Math.round(s.pricePaise / 100) : 499;
  const priceDisplay = priceNum > 0 ? `From ₹${priceNum.toLocaleString('en-IN')}` : 'From ₹499';
  const durationDisplay = s.durationMin ? `${s.durationMin} mins` : (s.duration || '60 mins');

  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle || (s.category ? `${s.category} Care` : 'Professional Service'),
    slug: s.slug,
    description: s.description,
    category: s.category || 'Wellness',
    price: priceNum,
    price_display: priceDisplay,
    price_num: priceNum,
    price_paise: s.pricePaise,
    duration: durationDisplay,
    duration_min: s.durationMin || 60,
    rating: typeof s.rating === 'number' ? s.rating : 5.0,
    reviewsCount: typeof s.reviewsCount === 'number' ? s.reviewsCount : 25,
    image: s.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
    is_active: s.isActive,
    features: (s.features as string[]) || [],
    vendor_id: s.vendorId || null,
    vendor_name: s.vendor?.storeName || s.vendor?.legalName || null,
    is_vendor_created: Boolean(s.vendorId),
    created_at: s.createdAt.toISOString(),
    updated_at: s.updatedAt.toISOString(),
  };
}

/* ----------------------------- PUBLIC SERVICES ----------------------------- */

publicServicesRouter.get('/', async (req, res) => {
  const { category, search } = req.query;

  const where: any = { isActive: true };
  if (category && typeof category === 'string' && category !== 'All') {
    where.category = { equals: category, mode: 'insensitive' };
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { subtitle: { contains: q, mode: 'insensitive' } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });

  res.json(services.map(formatService));
});

publicServicesRouter.get('/bookings/', optionalAuth, async (req, res) => {
  // If authenticated as a customer, restrict to customer's own bookings
  if (req.user && req.user.role === 'CUSTOMER') {
    const requestedEmail = (req.query.email as string)?.toLowerCase();
    if (requestedEmail && requestedEmail !== req.user.email.toLowerCase()) {
      throw new ApiError(403, 'forbidden', 'You cannot view bookings belonging to other customers.');
    }
    const targetEmail = req.user.email.toLowerCase();
    const bookings = await prisma.serviceBooking.findMany({
      where: {
        customerEmail: { equals: targetEmail, mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: { id: true, title: true, pricePaise: true, image: true },
        },
      },
    });

    const statusMap: Record<string, 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled'> = {
      PENDING: 'Requested',
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };

    res.json(
      bookings.map((b) => ({
        id: b.bookingRef || b.id,
        serverBookingId: b.id,
        bookingRef: b.bookingRef,
        serviceId: b.serviceId || '',
        serviceTitle: b.serviceTitle,
        userName: b.customerName,
        userContact: b.customerEmail,
        customerEmail: b.customerEmail,
        userPhone: b.customerPhone || undefined,
        preferredDate: b.preferredDate,
        preferredTime: b.preferredTime,
        status: statusMap[b.status] || 'Requested',
        createdAt: b.createdAt.toISOString(),
        price: b.service?.pricePaise ? `From ₹${Math.round(b.service.pricePaise / 100)}` : 'On Request',
        notes: b.notes,
      }))
    );
    return;
  }

  const email = (req.query.email as string)?.toLowerCase() || req.user?.email?.toLowerCase();
  if (!email) {
    res.json([]);
    return;
  }

  const bookings = await prisma.serviceBooking.findMany({
    where: {
      customerEmail: { equals: email, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      service: {
        select: { id: true, title: true, pricePaise: true, image: true },
      },
    },
  });

  const statusMap: Record<string, 'Requested' | 'Confirmed' | 'Completed' | 'Cancelled'> = {
    PENDING: 'Requested',
    CONFIRMED: 'Confirmed',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  res.json(
    bookings.map((b) => ({
      id: b.bookingRef || b.id,
      serverBookingId: b.id,
      bookingRef: b.bookingRef,
      serviceId: b.serviceId || '',
      serviceTitle: b.serviceTitle,
      userName: b.customerName,
      userContact: b.customerEmail,
      customerEmail: b.customerEmail,
      userPhone: b.customerPhone || undefined,
      preferredDate: b.preferredDate,
      preferredTime: b.preferredTime,
      status: statusMap[b.status] || 'Requested',
      createdAt: b.createdAt.toISOString(),
      price: b.service?.pricePaise ? `From ₹${Math.round(b.service.pricePaise / 100)}` : 'On Request',
      notes: b.notes,
    }))
  );
});

publicServicesRouter.get('/:slug/', async (req, res) => {
  const { slug } = req.params;
  const service = await prisma.service.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      isActive: true,
    },
  });

  if (!service) {
    throw new ApiError(404, 'not_found', 'Service not found.');
  }

  res.json(formatService(service));
});

const createBookingSchema = z.object({
  serviceId: z.string().optional(),
  serviceTitle: z.string().min(2),
  userName: z.string().min(2),
  userContact: z.string().min(3),
  customerEmail: z.string().optional(),
  customerPhone: z.string().optional(),
  preferredDate: z.string().min(1),
  preferredTime: z.string().min(1),
  notes: z.string().optional(),
});

publicServicesRouter.post('/bookings/', async (req, res) => {
  const data = createBookingSchema.parse(req.body);

  // Determine customer email
  let customerEmail = data.customerEmail?.trim();
  if (!customerEmail && data.userContact.includes('@')) {
    customerEmail = data.userContact.trim();
  }
  if (!customerEmail && (req as any).user?.email) {
    customerEmail = (req as any).user.email;
  }

  // Determine customer phone
  let customerPhone = data.customerPhone?.trim();
  if (!customerPhone && !data.userContact.includes('@')) {
    customerPhone = data.userContact.trim();
  }

  const bookingRef = `CF-SRV-${Math.floor(100000 + Math.random() * 900000)}`;

  // Safely resolve foreign key serviceId (may be a slug or custom ID from catalogue)
  let validServiceId: string | null = null;
  let serviceOwnerVendor: any = null;
  if (data.serviceId) {
    const existing = await prisma.service.findFirst({
      where: {
        OR: [{ id: data.serviceId }, { slug: data.serviceId }],
      },
      include: {
        vendor: {
          include: { user: true },
        },
      },
    });
    if (existing) {
      validServiceId = existing.id;
      serviceOwnerVendor = existing.vendor;
    }
  }

  const booking = await prisma.serviceBooking.create({
    data: {
      bookingRef,
      serviceId: validServiceId,
      serviceTitle: data.serviceTitle,
      customerName: data.userName,
      customerEmail: customerEmail || 'guest@chillyflakes.local',
      customerPhone: customerPhone || null,
      preferredDate: data.preferredDate,
      preferredTime: data.preferredTime,
      notes: data.notes || null,
      status: BookingStatus.PENDING,
    },
  });

  const formattedBooking = {
    id: booking.id,
    bookingRef: booking.bookingRef,
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    preferredDate: booking.preferredDate,
    preferredTime: booking.preferredTime,
    notes: booking.notes,
    status: booking.status,
    createdAt: booking.createdAt.toISOString(),
  };

  // Broadcast to Admin real-time
  emitToAdmin('admin:service_booked', formattedBooking);
  emitBroadcast('catalog:services_updated', {});

  // Respond immediately with success to ensure fast UI response (<50ms)
  res.status(201).json({
    id: booking.id,
    bookingRef: booking.bookingRef,
    status: 'confirmed',
    message: 'Booking request registered successfully! A confirmation email has been dispatched.',
  });

  // Dispatch emails asynchronously in background without blocking the HTTP response
  setImmediate(async () => {
    // Send Confirmation Email to Customer
    if (customerEmail && customerEmail.includes('@') && !customerEmail.endsWith('.local')) {
      try {
        const customerTpl = serviceBookingCustomerTemplate(formattedBooking);
        await sendMail({ to: customerEmail, ...customerTpl });
        console.log(`[service:email] Booking confirmation sent to customer ${customerEmail} for #${booking.bookingRef}`);
      } catch (err) {
        console.error(`[service:email] Customer booking confirmation failed for #${booking.bookingRef}:`, (err as Error).message);
      }
    }

    // Send Alert Email to Super Admin
    try {
      const adminEmail = env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com';
      const adminTpl = serviceBookingAdminTemplate(formattedBooking);
      await sendMail({ to: adminEmail, ...adminTpl });
      console.log(`[service:email] Admin notification sent to ${adminEmail} for service booking #${booking.bookingRef}`);
    } catch (err) {
      console.error(`[service:email] Admin notification failed for service booking #${booking.bookingRef}:`, (err as Error).message);
    }

    // Send Notification Email to Artisan Vendor
    if (serviceOwnerVendor) {
      try {
        const vendorTargetEmail = serviceOwnerVendor.email || serviceOwnerVendor.user?.email;
        if (vendorTargetEmail) {
          const vendorTpl = serviceBookingVendorTemplate(formattedBooking, serviceOwnerVendor);
          await sendMail({ to: vendorTargetEmail, ...vendorTpl });
          console.log(`[service:email] Vendor notification sent to ${vendorTargetEmail} for booking #${booking.bookingRef}`);
        }
        emitToVendor(serviceOwnerVendor.id, 'vendor:service_booked', formattedBooking);
      } catch (err) {
        console.error(`[service:email] Vendor notification failed for #${booking.bookingRef}:`, (err as Error).message);
      }
    }
  });
});

publicServicesRouter.post('/bookings/:id/cancel/', optionalAuth, async (req, res) => {
  const id = param(req.params.id);
  const reason = (req.body?.reason as string) || 'Client requested cancellation from account dashboard';
  const confirmationEmail = (req.body?.email as string)?.toLowerCase()?.trim();

  const booking = await prisma.serviceBooking.findFirst({
    where: {
      OR: [{ id }, { bookingRef: id }],
    },
  });

  if (!booking) {
    throw new ApiError(404, 'not_found', 'Service booking appointment not found.');
  }

  // Authorization check
  if (req.user && req.user.role === 'CUSTOMER') {
    const isOwner = booking.customerEmail.toLowerCase() === req.user.email.toLowerCase();
    if (!isOwner) {
      throw new ApiError(403, 'forbidden', 'You do not have permission to cancel this service booking.');
    }
  } else if (!req.user && confirmationEmail) {
    if (confirmationEmail !== booking.customerEmail.toLowerCase()) {
      throw new ApiError(403, 'forbidden', 'Email does not match this booking appointment.');
    }
  }

  if (booking.status === BookingStatus.CANCELLED) {
    res.json({
      success: true,
      message: 'Service booking is already cancelled.',
      bookingRef: booking.bookingRef,
      status: 'CANCELLED',
    });
    return;
  }

  if (booking.status === BookingStatus.COMPLETED) {
    throw new ApiError(400, 'cannot_cancel', 'Completed service appointments cannot be cancelled.');
  }

  const updated = await prisma.serviceBooking.update({
    where: { id: booking.id },
    data: {
      status: BookingStatus.CANCELLED,
      notes: booking.notes ? `${booking.notes} | Cancelled by client: ${reason}` : `Cancelled by client: ${reason}`,
    },
  });

  const formattedBooking = {
    id: updated.id,
    bookingRef: updated.bookingRef,
    serviceTitle: updated.serviceTitle,
    customerName: updated.customerName,
    customerEmail: updated.customerEmail,
    customerPhone: updated.customerPhone,
    preferredDate: updated.preferredDate,
    preferredTime: updated.preferredTime,
    notes: updated.notes,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };

  // Real-time notification for Admin and Clients
  emitToAdmin('admin:service_booked', formattedBooking);
  emitToAdmin('admin:service_booking_updated', formattedBooking);
  emitBroadcast('service:booking_status_updated', formattedBooking);
  emitBroadcast('cf_service_booked', formattedBooking);
  emitBroadcast('catalog:services_updated', {});

  // Send cancellation emails asynchronously
  setImmediate(async () => {
    // 1. Alert Super Admin
    try {
      const adminEmail = env.SUPPORT_EMAIL || 'adityashvkmr@gmail.com';
      const adminTpl = serviceBookingCancellationAdminTemplate(formattedBooking, reason);
      await sendMail({ to: adminEmail, ...adminTpl });
      console.log(`[service:cancel_email] Alert sent to admin (${adminEmail}) for booking #${updated.bookingRef}`);
    } catch (err) {
      console.error(`[service:cancel_email] Failed to send cancel email to admin for #${updated.bookingRef}:`, (err as Error).message);
    }

    // 2. Notify Customer
    if (updated.customerEmail && updated.customerEmail.includes('@') && !updated.customerEmail.endsWith('.local')) {
      try {
        const clientTpl = serviceBookingStatusUpdateCustomerTemplate(formattedBooking, BookingStatus.CANCELLED, reason);
        await sendMail({ to: updated.customerEmail, ...clientTpl });
        console.log(`[service:cancel_email] Cancellation notice sent to client ${updated.customerEmail} for #${updated.bookingRef}`);
      } catch (err) {
        console.error(`[service:cancel_email] Failed to send cancel email to client for #${updated.bookingRef}:`, (err as Error).message);
      }
    }
  });

  res.json({
    success: true,
    message: 'Service appointment has been successfully cancelled.',
    bookingRef: updated.bookingRef,
    status: 'CANCELLED',
  });
});

/* ------------------------------ ADMIN SERVICES ----------------------------- */

const serviceSchema = z.object({
  title: z.string().min(2),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().min(5),
  category: z.string().optional(),
  price: z.union([z.number().nonnegative(), z.string()]).optional(),
  price_paise: z.number().int().nonnegative().optional(),
  duration: z.string().optional(),
  duration_min: z.number().int().positive().optional(),
  rating: z.number().optional(),
  reviewsCount: z.number().int().optional(),
  image: z.string().optional(),
  is_active: z.boolean().default(true),
  features: z.array(z.string()).optional(),
});

adminServicesRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:view'), async (req, res) => {
  const { search, category, status, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status === 'active') where.isActive = true;
  if (status === 'inactive') where.isActive = false;
  if (category && category !== 'all') where.category = String(category);

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { subtitle: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, services] = await Promise.all([
    prisma.service.count({ where }),
    prisma.service.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'asc' },
      include: {
        vendor: {
          select: { id: true, storeName: true, legalName: true, email: true },
        },
      },
    }),
  ]);

  res.json({
    count: total,
    total,
    results: services.map(formatService),
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum) || 1,
  });
});

adminServicesRouter.post('/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:create'), async (req, res) => {
  const data = serviceSchema.parse(req.body);

  const slug = (data.slug || data.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `service-${Date.now().toString(36)}`;

  let pricePaise = 0;
  if (data.price_paise !== undefined) {
    pricePaise = data.price_paise;
  } else if (typeof data.price === 'number') {
    pricePaise = Math.round(data.price * 100);
  } else if (typeof data.price === 'string') {
    const parsed = parseInt(data.price.replace(/[^\d]/g, ''), 10);
    pricePaise = isNaN(parsed) ? 0 : parsed * 100;
  }

  const service = await prisma.service.create({
    data: {
      title: data.title,
      subtitle: data.subtitle,
      slug: `${slug}-${Math.floor(100 + Math.random() * 900)}`,
      description: data.description,
      category: data.category || 'Wellness',
      pricePaise,
      duration: data.duration,
      durationMin: data.duration_min || 60,
      rating: data.rating ?? 5.0,
      reviewsCount: data.reviewsCount ?? 25,
      image: data.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
      isActive: data.is_active,
      features: data.features || [],
    },
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'CREATE_SERVICE',
    module: 'services',
    targetId: service.id,
    targetName: service.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Created new marketplace service listing',
  });

  emitBroadcast('catalog:services_updated', { id: service.id });
  res.status(201).json(formatService(service));
});

adminServicesRouter.patch('/:id/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:edit'), async (req, res) => {
  const id = param(req.params.id);
  const data = serviceSchema.partial().parse(req.body);

  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Service not found.');
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.duration_min !== undefined) {
    updateData.durationMin = data.duration_min;
    updateData.duration = `${data.duration_min} mins`;
  }
  if (data.duration !== undefined) updateData.duration = data.duration;
  if (data.rating !== undefined) updateData.rating = data.rating;
  if (data.reviewsCount !== undefined) updateData.reviewsCount = data.reviewsCount;
  if (data.image !== undefined) updateData.image = data.image;
  if (data.is_active !== undefined) updateData.isActive = data.is_active;
  if (data.features !== undefined) updateData.features = data.features;

  if (data.price_paise !== undefined) {
    updateData.pricePaise = data.price_paise;
  } else if (typeof data.price === 'number') {
    updateData.pricePaise = Math.round(data.price * 100);
  } else if (typeof data.price === 'string') {
    const parsed = parseInt(data.price.replace(/[^\d]/g, ''), 10);
    if (!isNaN(parsed)) updateData.pricePaise = parsed * 100;
  }

  const updated = await prisma.service.update({
    where: { id },
    data: updateData,
  });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'UPDATE_SERVICE',
    module: 'services',
    targetId: updated.id,
    targetName: updated.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Updated marketplace service',
  });

  emitBroadcast('catalog:services_updated', { id: updated.id });
  res.json(formatService(updated));
});

adminServicesRouter.delete('/:id/', requireAuth('ADMIN'), requirePermission('products:delete'), async (req, res) => {
  const id = param(req.params.id);
  const existing = await prisma.service.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Service not found.');
  }

  await prisma.service.delete({ where: { id } });

  await recordAuditLog({
    actorId: req.user!.id,
    actorName: req.user!.name,
    actorEmail: req.user!.email,
    actorRole: req.user!.role.toLowerCase(),
    action: 'DELETE_SERVICE',
    module: 'services',
    targetId: existing.id,
    targetName: existing.title,
    ipAddress: req.ip || '127.0.0.1',
    reason: 'Deleted marketplace service',
  });

  emitBroadcast('catalog:services_updated', { id });
  res.json({ message: 'Service deleted successfully.' });
});

/* ------------------------------ ADMIN SERVICE BOOKINGS ----------------------------- */

adminServicesRouter.get('/bookings/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:view'), async (req, res) => {
  const { status, search, page = '1', limit = '50' } = req.query;
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const where: any = {};
  if (status && status !== 'all') {
    where.status = status as BookingStatus;
  }
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { bookingRef: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { customerEmail: { contains: q, mode: 'insensitive' } },
      { serviceTitle: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, pendingCount, confirmedCount, completedCount, cancelledCount, bookings] = await Promise.all([
    prisma.serviceBooking.count({ where }),
    prisma.serviceBooking.count({ where: { status: BookingStatus.PENDING } }),
    prisma.serviceBooking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.serviceBooking.count({ where: { status: BookingStatus.COMPLETED } }),
    prisma.serviceBooking.count({ where: { status: BookingStatus.CANCELLED } }),
    prisma.serviceBooking.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        service: {
          select: {
            id: true,
            title: true,
            image: true,
            pricePaise: true,
            vendorId: true,
            vendor: {
              select: { id: true, storeName: true, legalName: true },
            },
          },
        },
      },
    }),
  ]);

  res.json({
    count: total,
    total,
    page: pageNum,
    limit: limitNum,
    total_pages: Math.ceil(total / limitNum) || 1,
    tab_counts: {
      all: total,
      pending: pendingCount,
      confirmed: confirmedCount,
      completed: completedCount,
      cancelled: cancelledCount,
    },
    results: bookings.map((b) => ({
      id: b.id,
      bookingRef: b.bookingRef,
      serviceId: b.serviceId,
      serviceTitle: b.serviceTitle,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      preferredDate: b.preferredDate,
      preferredTime: b.preferredTime,
      notes: b.notes,
      status: b.status,
      is_vendor_service: Boolean(b.service?.vendorId || b.service?.vendor),
      vendor_name: b.service?.vendor?.storeName || b.service?.vendor?.legalName || null,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      service: b.service,
    })),
  });
});

adminServicesRouter.patch('/bookings/:id/status/', requireAuth('ADMIN', 'STAFF'), requirePermission('products:edit'), async (req, res) => {
  const id = param(req.params.id);
  const statusSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
    notes: z.string().optional(),
  });
  const { status, notes } = statusSchema.parse(req.body);

  const existing = await prisma.serviceBooking.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, 'not_found', 'Service booking not found.');
  }

  const updated = await prisma.serviceBooking.update({
    where: { id },
    data: {
      status,
      notes: notes !== undefined ? notes : existing.notes,
    },
  });

  emitToAdmin('admin:service_booked', updated);
  emitToAdmin('admin:service_booking_updated', updated);
  emitBroadcast('service:booking_status_updated', updated);
  emitBroadcast('cf_service_booked', updated);
  emitBroadcast('catalog:services_updated', {});

  // Send email notification to client asynchronously in background
  if (updated.customerEmail && updated.customerEmail.includes('@') && !updated.customerEmail.endsWith('.local')) {
    setImmediate(async () => {
      try {
        const clientTpl = serviceBookingStatusUpdateCustomerTemplate(updated, status, notes);
        await sendMail({ to: updated.customerEmail, ...clientTpl });
        console.log(`[service:status_email] Sent ${status} notification to ${updated.customerEmail} for #${updated.bookingRef}`);
      } catch (err) {
        console.error(`[service:status_email] Failed to send ${status} email to ${updated.customerEmail}:`, (err as Error).message);
      }
    });
  }

  res.json({
    id: updated.id,
    bookingRef: updated.bookingRef,
    status: updated.status,
    notes: updated.notes,
    updatedAt: updated.updatedAt.toISOString(),
  });
});

