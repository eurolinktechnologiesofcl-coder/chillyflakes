import { PrismaClient, ProductStatusEnum, BookingStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();
const API_BASE = 'http://localhost:4000/api/v1';

interface TestResult {
  id: string;
  category: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'BLOCKED';
  durationMs: number;
  details?: string;
  severity?: 'P0' | 'P1' | 'P2' | 'P3';
}

const results: TestResult[] = [];

async function test(
  id: string,
  category: string,
  description: string,
  fn: () => Promise<void>,
  severity: 'P0' | 'P1' | 'P2' | 'P3' = 'P1'
) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ id, category, description, status: 'PASS', durationMs });
    console.log(`✅ [${id}] ${description} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ id, category, description, status: 'FAIL', durationMs, details: err.message, severity });
    console.error(`❌ [${id}] ${description} (${durationMs}ms) — Error: ${err.message}`);
  }
}

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('  CHILLYFLAKES COMPREHENSIVE FULL-STACK AUDIT & TEST SUITE');
  console.log('================================================================\n');

  // Admin login helper
  let adminToken = '';
  await test('AUTH-01', 'Authentication', 'Super Admin Login & Token Generation', async () => {
    let res = await fetch(`${API_BASE}/admin/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.com', password: 'Test@123' }),
    });
    if (!res.ok) {
      // Fallback to admin@chillyflakes.in
      res = await fetch(`${API_BASE}/admin/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@chillyflakes.in', password: 'Password@123' }),
      });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.token) throw new Error('No token returned');
    adminToken = data.token;
  }, 'P0');

  // Category tests
  await test('CAT-01', 'Catalog', 'Verify Pure Product Categories (Services Excluded)', async () => {
    const res = await fetch(`${API_BASE}/categories/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const cats = await res.json();
    if (!Array.isArray(cats) || cats.length < 7) throw new Error(`Expected >= 7 categories, got ${cats.length}`);
    const hasService = cats.some((c: any) => c.name.toLowerCase().includes('service'));
    if (hasService) throw new Error('Found service in product categories table');
  }, 'P2');

  // Services tests
  await test('SRV-01', 'Services', 'Verify Dedicated Services Catalog & Active Offerings', async () => {
    const res = await fetch(`${API_BASE}/services/`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const services = await res.json();
    if (!Array.isArray(services) || services.length < 3) throw new Error(`Expected >= 3 services, got ${services.length}`);
    if (!services.every((s: any) => s.title && s.price > 0)) throw new Error('Invalid service price or title');
  }, 'P1');

  // Contact form test
  let testTicketId = '';
  await test('CONT-01', 'Contact', 'Instant Contact Form Submission & Ticket Generation', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/contact/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Audit Tester',
        email: 'audit.tester@example.com',
        phone: '9876543210',
        state: 'Karnataka',
        inquiryType: 'customer-support',
        message: 'This is an automated full audit verification message.',
      }),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.ticketId) throw new Error('No ticketId returned');
    testTicketId = data.ticketId;
    if (elapsed > 1000) throw new Error(`Response too slow: ${elapsed}ms (expected < 1000ms)`);
  }, 'P1');

  // Service booking test (with both DB id and slug)
  let testBookingId = '';
  let testBookingRef = '';
  await test('BOOK-01', 'Service Bookings', 'Client Service Booking with Slug ID and Instant Response', async () => {
    const start = Date.now();
    const res = await fetch(`${API_BASE}/services/bookings/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: 'srv-ayurvedic-massage',
        serviceTitle: 'Ayurvedic Abhyanga Massage',
        userName: 'Audit Client',
        userContact: 'audit.client@example.com',
        preferredDate: '2026-11-10',
        preferredTime: 'Morning (09:00 AM - 12:00 PM)',
        notes: 'Testing audit booking flow.',
      }),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.bookingRef || !data.id) throw new Error('Missing bookingRef or id');
    testBookingId = data.id;
    testBookingRef = data.bookingRef;
    if (elapsed > 1000) throw new Error(`Booking submission response too slow: ${elapsed}ms`);
  }, 'P0');

  // Service booking status update to CONFIRMED
  await test('BOOK-02', 'Service Bookings', 'Admin Confirms Booking & Client Email Trigger', async () => {
    const res = await fetch(`${API_BASE}/admin/services/bookings/${testBookingId}/status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'CONFIRMED',
        notes: 'Confirmed by audit automation.',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'CONFIRMED') throw new Error(`Expected CONFIRMED, got ${data.status}`);

    // Verify in database
    const dbBooking = await prisma.serviceBooking.findUnique({ where: { id: testBookingId } });
    if (dbBooking?.status !== BookingStatus.CONFIRMED) throw new Error('DB booking status not updated');
  }, 'P1');

  // Service booking status update to CANCELLED
  await test('BOOK-03', 'Service Bookings', 'Admin Cancels Booking & Client Email Trigger', async () => {
    const res = await fetch(`${API_BASE}/admin/services/bookings/${testBookingId}/status/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        status: 'CANCELLED',
        notes: 'Cancelled due to audit testing.',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.status !== 'CANCELLED') throw new Error(`Expected CANCELLED, got ${data.status}`);

    const dbBooking = await prisma.serviceBooking.findUnique({ where: { id: testBookingId } });
    if (dbBooking?.status !== BookingStatus.CANCELLED) throw new Error('DB booking status not updated');
  }, 'P1');

  // Product Archive & Unarchive Flow
  let testProductId = '';
  await test('PROD-01', 'Products', 'Admin Creates Test Product', async () => {
    const cat = await prisma.category.findFirst();
    if (!cat) throw new Error('No category available');
    const sku = `AUDIT-${Date.now().toString().slice(-6)}`;

    const res = await fetch(`${API_BASE}/admin/products/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'Audit Test Handcrafted Oil',
        category_id: cat.id,
        sku,
        price_paise: 49900,
        mrp_paise: 69900,
        stock: 30,
        main_image_url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
        description: 'Audit test description for product lifecycle.',
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const prod = await res.json();
    testProductId = prod.id;
    if (!testProductId) throw new Error('No product ID returned');
  }, 'P1');

  await test('PROD-02', 'Products', 'Admin Archives Product (Sets status to ARCHIVED)', async () => {
    const res = await fetch(`${API_BASE}/admin/products/${testProductId}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const dbProd = await prisma.product.findUnique({ where: { id: testProductId } });
    if (dbProd?.status !== ProductStatusEnum.ARCHIVED) {
      throw new Error(`Expected ARCHIVED, got ${dbProd?.status}`);
    }
  }, 'P1');

  await test('PROD-03', 'Products', 'Admin Unarchives Product (Restores status to APPROVED)', async () => {
    const res = await fetch(`${API_BASE}/admin/products/${testProductId}/unarchive/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Unarchive response reported failure');

    const dbProd = await prisma.product.findUnique({ where: { id: testProductId } });
    if (dbProd?.status !== ProductStatusEnum.APPROVED) {
      throw new Error(`Expected APPROVED after unarchive, got ${dbProd?.status}`);
    }
  }, 'P1');

  // Coupon Engine & Discount Calculation Verification
  await test('COUP-01', 'Coupons', 'Flat Discount Calculation (POD Coupon on ₹1,098 Cart)', async () => {
    const res = await fetch(`${API_BASE}/coupons/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'POD', amount: 1098 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.valid) throw new Error(`POD coupon was reported invalid: ${data.message}`);
    if (data.discountAmount !== 50) throw new Error(`Expected flat discount ₹50, got ₹${data.discountAmount}`);
  }, 'P0');

  await test('COUP-02', 'Coupons', 'Percentage Discount Calculation (CHILLY10 Coupon on ₹1,098 Cart)', async () => {
    const res = await fetch(`${API_BASE}/coupons/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'CHILLY10', amount: 1098 }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.valid) throw new Error(`CHILLY10 coupon was reported invalid: ${data.message}`);
    if (data.discountAmount !== 110) throw new Error(`Expected 10% discount ₹110, got ₹${data.discountAmount}`);
  }, 'P0');

  await test('COUP-03', 'Coupons', 'Rejection of Sub-Minimum Order Coupon', async () => {
    const res = await fetch(`${API_BASE}/coupons/validate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'POD', amount: 100 }), // Min is 500
    });
    const data = await res.json();
    if (data.valid) throw new Error('Coupon should not be valid for subtotal < minOrderAmount');
  }, 'P1');

  // Order Placement & Atomic Stock Decrement
  let createdOrderId = '';
  let initialStock = 0;
  await test('ORD-01', 'Orders', 'Order Checkout with Atomic Stock Decrement & Standard Delivery', async () => {
    // Get product stock before order
    const prodBefore = await prisma.product.findUnique({ where: { id: testProductId } });
    if (!prodBefore) throw new Error('Product not found');
    initialStock = prodBefore.totalStock;

    const orderPayload = {
      items: [
        {
          productId: testProductId,
          name: 'Audit Test Handcrafted Oil',
          price: 499,
          quantity: 2,
        },
      ],
      totalAmount: 948,
      deliveryCharge: 0,
      discountAmount: 50,
      customerName: 'Audit Shopper',
      customerEmail: 'audit.shopper@example.com',
      customerPhone: '9876543210',
      shippingAddress: {
        fullName: 'Audit Shopper',
        streetAddress: '123 Artisan Lane',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        phone: '9876543210',
      },
      paymentMethod: 'cod',
      deliverySpeed: 'standard',
      couponCode: 'POD',
    };

    const res = await fetch(`${API_BASE}/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const orderData = await res.json();
    if (!orderData.orderNumber) throw new Error('No orderNumber returned');
    createdOrderId = orderData.orderId;

    // Verify atomic stock decrement
    const prodAfter = await prisma.product.findUnique({ where: { id: testProductId } });
    if (!prodAfter) throw new Error('Product disappeared');
    const expectedStock = initialStock - 2;
    if (prodAfter.totalStock !== expectedStock) {
      throw new Error(`Atomic stock decrement failed: was ${initialStock}, expected ${expectedStock}, got ${prodAfter.totalStock}`);
    }
  }, 'P0');

  // Test ORD-02: Buyer Order Cancellation & Stock Restoration
  await test('ORD-02', 'Orders', 'Buyer Order Cancellation & Atomic Stock Restoration', async () => {
      const cancelRes = await fetch(`${API_BASE}/orders/${createdOrderId}/cancel/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'audit.shopper@example.com',
          reason: 'Cancelled by audit automated test',
        }),
      });
      if (!cancelRes.ok) throw new Error(`HTTP ${cancelRes.status}`);
      const cancelData = await cancelRes.json();
      if (!cancelData.success || cancelData.status !== 'cancelled') {
        throw new Error('Order cancellation failed');
      }

      // Check stock restored
      const prodRestored = await prisma.product.findUnique({ where: { id: testProductId } });
      if (prodRestored?.totalStock !== initialStock) {
        throw new Error(`Stock not restored: expected ${initialStock}, got ${prodRestored?.totalStock}`);
      }
    }, 'P0');

  // Security: IDOR Order Isolation
  await test('SEC-01', 'Security', 'Buyer Orders IDOR Protection (Cannot view other buyer orders)', async () => {
    // Register temporary buyer
    const buyerEmail = `temp.buyer.${Date.now()}@example.com`;
    const regRes = await fetch(`${API_BASE}/buyer/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temp Buyer',
        email: buyerEmail,
        phone: `9${String(Date.now()).slice(-9)}`,
        password: 'Password@123',
      }),
    });
    const regData = await regRes.json();
    const buyerCode = regData.dev_code;

    // Verify buyer
    const verRes = await fetch(`${API_BASE}/buyer/auth/verify-email/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, code: buyerCode }),
    });
    const verData = await verRes.json();
    const buyerToken = verData.token;

    // Attempt to query someone else's email
    const idorRes = await fetch(`${API_BASE}/orders/?email=admin@test.com`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (idorRes.status !== 403) {
      throw new Error(`Expected 403 IDOR rejection when requesting another user's orders, got ${idorRes.status}`);
    }
  }, 'P0');

  // Security: RBAC Protection
  await test('SEC-02', 'Security', 'Unauthenticated Admin Access Rejection (401)', async () => {
    const res = await fetch(`${API_BASE}/admin/products/`);
    if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  }, 'P0');

  await test('SEC-03', 'Security', 'Buyer Token Access to Admin Route Rejection (403)', async () => {
    const buyerEmail = `temp.buyer.rbac.${Date.now()}@example.com`;
    const regRes = await fetch(`${API_BASE}/buyer/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Temp Buyer RBAC',
        email: buyerEmail,
        phone: `9${String(Date.now()).slice(-9)}`,
        password: 'Password@123',
      }),
    });
    const regData = await regRes.json();
    const buyerCode = regData.dev_code;

    const verRes = await fetch(`${API_BASE}/buyer/auth/verify-email/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: buyerEmail, code: buyerCode }),
    });
    const verData = await verRes.json();
    const buyerToken = verData.token;

    // Try accessing admin route with buyer token
    const adminRes = await fetch(`${API_BASE}/admin/products/`, {
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    if (adminRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for buyer accessing admin, got ${adminRes.status}`);
    }
  }, 'P0');

  // Vendor Workflow Verification
  await test('VEND-01', 'Vendor', 'Vendor Account Availability Check & Real-time Validation', async () => {
    const freshEmail = `fresh.artisan.${Date.now()}@example.com`;
    const res = await fetch(`${API_BASE}/vendor/auth/check-availability/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: freshEmail, mobile: `9${String(Date.now()).slice(-9)}` }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.email_available === false) throw new Error('Email should be available');
    if (data.available !== true) throw new Error('Expected availability to be true');
  }, 'P1');

  // Cleanup test product
  await prisma.orderItem.deleteMany({ where: { productId: testProductId } });
  await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
  await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});

  // Print Summary Table
  console.log('\n================================================================');
  console.log('                 AUDIT SUITE EXECUTION SUMMARY');
  console.log('================================================================');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`Total Automated Tests Executed: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit()
  .catch((err) => {
    console.error('Fatal audit failure:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
