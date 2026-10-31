/**
 * End-to-end smoke verification for the ChillyFlakes Super Admin and Marketplace API.
 * Run with: node scripts/smoke-admin.mjs
 */

const BASE = process.env.API_URL || 'http://localhost:4000';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function run() {
  console.log('🚀 Starting Super Admin End-to-End Smoke Verification...');
  console.log(`   Target: ${BASE}\n`);

  // 1. Health
  console.log('1. System Health');
  const healthRes = await fetch(`${BASE}/health`);
  const health = await healthRes.json();
  assert(healthRes.status === 200, 'Health endpoint returns 200');
  assert(health.status === 'ok' && health.db === 'up', 'PostgreSQL database is UP');

  // 2. Coupon Validation
  console.log('\n2. Public Coupon Validation');
  const couponRes = await fetch(`${BASE}/api/v1/coupons/validate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: 'CHILLY10' }),
  });
  const couponData = await couponRes.json();
  assert(couponRes.status === 200, 'Coupon validation returns 200');
  assert(couponData.valid === true && couponData.discountPercent === 10, 'CHILLY10 coupon is valid with 10% discount');

  // 3. Super Admin Authentication
  console.log('\n3. Super Admin Authentication');
  const loginRes = await fetch(`${BASE}/api/v1/admin/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@test.com', password: 'Test@123' }),
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200, 'Super Admin login returns 200');
  assert(loginData.user && loginData.user.role === 'admin', 'User has admin role');
  assert(Array.isArray(loginData.user.permissions) && loginData.user.permissions.length > 20, 'User has full RBAC permissions');
  assert(Boolean(loginData.token), 'Session bearer token issued');

  const adminToken = loginData.token;
  const authHeader = { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

  // 4. Session Me
  console.log('\n4. Admin Session /me');
  const meRes = await fetch(`${BASE}/api/v1/admin/auth/me/`, { headers: authHeader });
  const meData = await meRes.json();
  assert(meRes.status === 200, 'Admin /me returns 200');
  assert(meData.email === 'admin@test.com', 'Admin email verified');

  // 5. Overview Metrics
  console.log('\n5. Admin Overview Metrics');
  const overviewRes = await fetch(`${BASE}/api/v1/admin/overview/`, { headers: authHeader });
  const overview = await overviewRes.json();
  assert(overviewRes.status === 200, 'Overview returns 200');
  assert(overview.metrics && overview.metrics.catalog_products.total >= 30, 'Metrics show real catalog count (>= 30 products)');

  // 6. Products List
  console.log('\n6. Products Management');
  const prodsRes = await fetch(`${BASE}/api/v1/admin/products/`, { headers: authHeader });
  const prodsData = await prodsRes.json();
  assert(prodsRes.status === 200, 'Admin products list returns 200');
  assert(Array.isArray(prodsData.results) && prodsData.results.length > 0, 'Products returned with real catalog items');

  // 7. Categories
  console.log('\n7. Categories Management');
  const catsRes = await fetch(`${BASE}/api/v1/admin/categories/`, { headers: authHeader });
  const catsData = await catsRes.json();
  assert(catsRes.status === 200, 'Admin categories returns 200');
  assert(catsData.length >= 7, '7+ real marketplace categories seeded');

  // 8. Create Product
  console.log('\n8. Create Product with Stock & Variant');
  const newSku = `SMOKE-${Date.now().toString().slice(-6)}`;
  const createProdRes = await fetch(`${BASE}/api/v1/admin/products/`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      title: 'Smoke Test Artisanal Honey',
      category_id: catsData[0].id,
      sku: newSku,
      price_paise: 35000,
      mrp_paise: 45000,
      stock: 40,
      main_image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80',
      description: 'Pure organic wild forest honey harvested by local tribal artisans.',
    }),
  });
  const createdProd = await createProdRes.json();
  assert(createProdRes.status === 201, 'Created new product with 201');
  assert(createdProd.sku === newSku && createdProd.total_stock === 40, 'Stock and SKU saved properly');

  // 9. Patch Product Stock
  console.log('\n9. Update Product Details & Stock');
  const updateProdRes = await fetch(`${BASE}/api/v1/admin/products/${createdProd.id}/`, {
    method: 'PATCH',
    headers: authHeader,
    body: JSON.stringify({ stock: 55 }),
  });
  const updatedProd = await updateProdRes.json();
  assert(updateProdRes.status === 200, 'Product stock updated with 200');
  assert(updatedProd.total_stock === 55, 'Stock updated to 55 in DB');

  // 10. Place Order & Atomic Stock Decrement
  console.log('\n10. Place Order at Checkout & Decrement Stock');
  const orderRes = await fetch(`${BASE}/api/v1/orders/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [
        {
          productId: createdProd.id,
          name: createdProd.title,
          price: 350,
          quantity: 5,
        },
      ],
      totalAmount: 1750,
      customerName: 'Aarav Patel',
      customerEmail: 'aarav.patel@example.com',
      customerPhone: '+91 98111 22233',
    }),
  });
  const orderData = await orderRes.json();
  assert(orderRes.status === 201, 'Order placed successfully (201)');
  assert(Boolean(orderData.orderNumber), `Order number generated: ${orderData.orderNumber}`);

  // Verify stock decremented from 55 to 50
  const verifyStockRes = await fetch(`${BASE}/api/v1/admin/products/${createdProd.id}/`, { headers: authHeader });
  const verifyStockData = await verifyStockRes.json();
  assert(verifyStockData.total_stock === 50, 'Atomic stock decremented: 55 - 5 = 50 in DB');

  // 11. Admin Orders List
  console.log('\n11. Admin Order Management');
  const ordersListRes = await fetch(`${BASE}/api/v1/admin/orders/`, { headers: authHeader });
  const ordersList = await ordersListRes.json();
  assert(ordersListRes.status === 200, 'Admin orders list returns 200');
  const foundOrder = ordersList.results.find((o) => o.order_number === orderData.orderNumber);
  assert(Boolean(foundOrder), 'Placed order immediately visible in admin order queue');

  // 12. Update Order Status
  console.log('\n12. Update Order Status');
  const updateStatusRes = await fetch(`${BASE}/api/v1/admin/orders/${foundOrder.id}/status/`, {
    method: 'PATCH',
    headers: authHeader,
    body: JSON.stringify({
      status: 'in_transit',
      courier_partner: 'BlueDart Express',
      tracking_number: 'BD-88990011',
    }),
  });
  const updatedStatusData = await updateStatusRes.json();
  assert(updateStatusRes.status === 200, 'Order status transitioned to in_transit');
  assert(updatedStatusData.order_status === 'in_transit', 'Status updated in DB');

  // 13. Create Promotional Coupon
  console.log('\n13. Admin Coupon Management');
  const testCouponCode = `TEST${Math.floor(100 + Math.random() * 900)}`;
  const createCouponRes = await fetch(`${BASE}/api/v1/admin/coupons/`, {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      code: testCouponCode,
      description: 'Exclusive 15% discount for smoke test',
      discount_type: 'PERCENTAGE',
      discount_value: 15,
      min_order_amount: 500,
      max_discount_amount: 300,
    }),
  });
  assert(createCouponRes.status === 201, `Created coupon ${testCouponCode} with 201`);

  // 14. Validate Newly Created Coupon
  console.log('\n14. Validate Live Created Coupon');
  const testValRes = await fetch(`${BASE}/api/v1/coupons/validate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: testCouponCode }),
  });
  const testValData = await testValRes.json();
  assert(testValData.valid === true && testValData.discountPercent === 15, 'Newly created coupon validated live at 15%');

  // 15. User Management & Tab Counts
  console.log('\n15. Customer & Staff Account Management');
  const usersRes = await fetch(`${BASE}/api/v1/admin/users/`, { headers: authHeader });
  const usersData = await usersRes.json();
  assert(usersRes.status === 200, 'Admin users list returns 200');
  assert(usersData.tab_counts && typeof usersData.tab_counts.all_accounts === 'number', 'Tab counts calculated from DB');

  // 16. Audit Log
  console.log('\n16. Audit Log Tracking');
  const auditRes = await fetch(`${BASE}/api/v1/admin/audit-log/`, { headers: authHeader });
  const auditData = await auditRes.json();
  assert(auditRes.status === 200, 'Audit log endpoint returns 200');
  assert(auditData.results.length > 0, `Recorded ${auditData.results.length} sensitive actions in AuditLog table`);

  // 17. Finance Summary
  console.log('\n17. Finance & Settlement');
  const financeRes = await fetch(`${BASE}/api/v1/admin/finance/`, { headers: authHeader });
  const financeData = await financeRes.json();
  assert(financeRes.status === 200, 'Admin finance returns 200');
  assert(typeof financeData.summary.gmv === 'number', 'GMV and marketplace fee calculated');

  // 18. Platform Settings
  console.log('\n18. Platform Settings');
  const settingsRes = await fetch(`${BASE}/api/v1/admin/settings/`, { headers: authHeader });
  const settingsData = await settingsRes.json();
  assert(settingsRes.status === 200, 'Settings retrieved with 200');
  assert(Boolean(settingsData.compliance?.legal_entity_name), 'Compliance legal entity retrieved');

  // 19. RBAC Protection
  console.log('\n19. RBAC Security Check');
  const unauthRes = await fetch(`${BASE}/api/v1/admin/overview/`);
  assert(unauthRes.status === 401, 'Unauthenticated request to admin overview rejected with 401');

  // Clean up smoke test product
  await fetch(`${BASE}/api/v1/admin/products/${createdProd.id}/`, {
    method: 'DELETE',
    headers: authHeader,
  });

  console.log(`\n==================================================`);
  console.log(`  Tests Passed: ${passed}`);
  console.log(`  Tests Failed: ${failed}`);
  console.log(`==================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
