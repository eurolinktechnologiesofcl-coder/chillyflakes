import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';

export const overviewRouter = Router();

overviewRouter.get('/', requireAuth('ADMIN', 'STAFF'), requirePermission('overview:view'), async (_req, res) => {
  const [
    totalVendors,
    approvedVendors,
    pendingVendors,
    activeCustomers,
    totalProducts,
    approvedProducts,
    pendingProducts,
    totalOrders,
    pendingDispatchOrders,
    returnOrders,
    paidOrders,
    disbursedBatches,
  ] = await Promise.all([
    prisma.vendorProfile.count(),
    prisma.vendorProfile.count({ where: { status: 'APPROVED' } }),
    prisma.vendorProfile.count({ where: { status: { in: ['UNDER_REVIEW', 'ONBOARDING_INCOMPLETE', 'RESUBMISSION_REQUESTED'] } } }),
    prisma.user.count({ where: { role: 'CUSTOMER', status: 'ACTIVE', deletedAt: null } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'APPROVED' } }),
    prisma.product.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.order.count(),
    prisma.order.count({ where: { orderStatus: 'PENDING_DISPATCH' } }),
    prisma.order.count({ where: { orderStatus: 'RETURN_REQUESTED' } }),
    prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { totalAmount: true },
    }),
    prisma.payoutBatch.findMany({
      where: { status: 'DISBURSED' },
      select: { netPayout: true },
    }),
  ]);

  // Calculate platform revenue from paid orders (8.5% take rate by default)
  const gmv = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const platformRevenuePaise = Math.round(gmv * 100 * 0.085);
  const disbursedPayoutsPaise = disbursedBatches.reduce((sum, b) => sum + b.netPayout * 100, 0);

  const alerts = [];
  if (pendingVendors > 0) {
    alerts.push({
      id: 'alert_pending_sellers',
      type: 'seller_docs_delayed' as const,
      severity: 'warning' as const,
      title: 'Merchant KYC Verifications Pending',
      description: `${pendingVendors} seller account(s) are awaiting admin compliance verification.`,
      count: pendingVendors,
      target_url: '/admin/people/sellers',
      created_at: new Date().toISOString(),
    });
  }

  if (pendingProducts > 0) {
    alerts.push({
      id: 'alert_pending_products',
      type: 'product_review_delayed' as const,
      severity: 'info' as const,
      title: 'Product Review Queue',
      description: `${pendingProducts} product submission(s) awaiting catalog approval.`,
      count: pendingProducts,
      target_url: '/admin/product-reviews',
      created_at: new Date().toISOString(),
    });
  }

  res.json({
    metrics: {
      registered_vendors: {
        approved: approvedVendors,
        pending_review: pendingVendors,
        total: totalVendors,
      },
      active_customers: activeCustomers,
      catalog_products: {
        live: approvedProducts,
        pending_review: pendingProducts,
        total: totalProducts,
      },
      products_awaiting_review: pendingProducts,
      sellers_awaiting_review: pendingVendors,
      net_platform_revenue_paise: platformRevenuePaise,
      orders: {
        total: totalOrders,
        pending_dispatch: pendingDispatchOrders,
      },
      refund_return_requests: {
        pending: returnOrders,
        total: returnOrders,
      },
      disbursed_payouts_paise: disbursedPayoutsPaise,
      held_payments_paise: null,
    },
    alerts,
    updated_at: new Date().toISOString(),
  });
});
