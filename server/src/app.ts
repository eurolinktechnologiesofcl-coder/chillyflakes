import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { randomToken } from './lib/crypto.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { apiLimiter } from './middleware/rateLimit.js';

// Routers
import { buyerAuthRouter } from './modules/auth/buyer.routes.js';
import { adminAuthRouter } from './modules/admin/admin.auth.routes.js';
import { overviewRouter } from './modules/admin/overview.routes.js';
import { adminProductsRouter } from './modules/admin/products.routes.js';
import { adminCategoriesRouter } from './modules/admin/categories.routes.js';
import { adminOrdersRouter } from './modules/admin/orders.routes.js';
import { adminUsersRouter } from './modules/admin/users.routes.js';
import { adminSellersRouter } from './modules/admin/sellers.routes.js';
import { adminRolesRouter } from './modules/admin/roles.routes.js';
import { adminStaffRouter } from './modules/admin/staff.routes.js';
import { adminFinanceRouter } from './modules/admin/finance.routes.js';
import { adminSettingsRouter } from './modules/admin/settings.routes.js';
import { adminAuditRouter } from './modules/admin/audit.routes.js';
import { adminCouponsRouter, publicCouponsRouter } from './modules/admin/coupons.routes.js';
import { ordersRouter } from './modules/orders/orders.routes.js';
import { publicCatalogRouter } from './modules/catalog/public.routes.js';
import { uploadRouter } from './modules/upload.routes.js';
import { vendorRouter } from './modules/vendor/vendor.routes.js';
import { publicReviewsRouter, adminReviewsRouter } from './modules/reviews/reviews.routes.js';
import { publicServicesRouter, adminServicesRouter } from './modules/services/services.routes.js';
import { adminSupportRouter } from './modules/admin/support.routes.js';
import { contactRouter } from './modules/contact/contact.routes.js';

export function createApp() {
  const app = express();

  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'Accept', 'Idempotency-Key'],
      exposedHeaders: ['X-CSRFToken', 'Retry-After'],
      maxAge: 86_400,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  // Static uploads serving
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[uploads] Could not create uploads directory:', (err as Error).message);
  }
  app.use('/uploads', express.static(uploadsDir));

  /* ------------------------------ system ------------------------------- */
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  const api = express.Router();
  api.use(apiLimiter);

  // CSRF token header for frontend client
  api.get('/v1/csrf/', (_req, res) => {
    res.setHeader('X-CSRFToken', randomToken(24));
    res.json({ detail: 'ok' });
  });

  // Buyer Auth
  api.use('/v1/buyer/auth', buyerAuthRouter);

  // Super Admin Endpoints
  api.use('/v1/admin/auth', adminAuthRouter);
  api.use('/v1/admin/overview', overviewRouter);
  api.use('/v1/admin/products', adminProductsRouter);
  api.use('/v1/admin/categories', adminCategoriesRouter);
  api.use('/v1/admin/orders', adminOrdersRouter);
  api.use('/v1/admin/users', adminUsersRouter);
  api.use('/v1/admin/sellers', adminSellersRouter);
  api.use('/v1/admin/roles', adminRolesRouter);
  api.use('/v1/admin/staff', adminStaffRouter);
  api.use('/v1/admin/finance', adminFinanceRouter);
  api.use('/v1/admin/settings', adminSettingsRouter);
  api.use('/v1/admin/audit-log', adminAuditRouter);
  api.use('/v1/admin/coupons', adminCouponsRouter);
  api.use('/v1/admin/reviews', adminReviewsRouter);
  api.use('/admin/reviews', adminReviewsRouter);
  api.use('/v1/admin/services', adminServicesRouter);
  api.use('/admin/services', adminServicesRouter);
  api.use('/v1/admin/support', adminSupportRouter);
  api.use('/admin/support', adminSupportRouter);

  // Vendor Portal
  api.use('/v1/vendor', vendorRouter);
  api.use('/vendor', vendorRouter);

  // Public Marketplace Endpoints (available on /v1/ and legacy /)
  api.use('/v1/coupons', publicCouponsRouter);
  api.use('/coupons', publicCouponsRouter);
  api.use('/v1/orders', ordersRouter);
  api.use('/orders', ordersRouter);
  api.use('/v1/upload', uploadRouter);
  api.use('/v1/products/:productId/reviews', publicReviewsRouter);
  api.use('/products/:productId/reviews', publicReviewsRouter);
  api.use('/v1/services', publicServicesRouter);
  api.use('/services', publicServicesRouter);
  api.use('/v1/contact', contactRouter);
  api.use('/contact', contactRouter);
  api.use('/v1', publicCatalogRouter);
  api.use('/', publicCatalogRouter);

  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
