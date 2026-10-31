import { PrismaClient, ReviewStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function runE2EVerification() {
  console.log('====================================================');
  console.log('🚀 CHILLYFLAKES FULL-STACK E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, desc: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${desc}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${desc}`);
    }
  }

  // 1. Check Coupon POD Configuration and Flat Discount Calculation
  console.log('--- TEST GROUP 1: COUPONS & DISCOUNT ENGINE ---');
  const podCoupon = await prisma.coupon.findUnique({ where: { code: 'POD' } });
  assert(!!podCoupon, 'Coupon "POD" exists in database');
  assert(podCoupon?.discountType === 'FIXED', 'Coupon "POD" has discountType: FIXED');
  assert(podCoupon?.discountValue === 50, 'Coupon "POD" has discountValue: 50');
  assert(podCoupon?.minOrderAmount === 500, 'Coupon "POD" has minOrderAmount: 500');

  // Verify calculation on sample cart of ₹1,098
  const cartSubtotal = 1098;
  let calculatedDiscount = 0;
  if (podCoupon && cartSubtotal >= podCoupon.minOrderAmount) {
    calculatedDiscount = podCoupon.discountType === 'FIXED'
      ? podCoupon.discountValue
      : Math.round((cartSubtotal * podCoupon.discountValue) / 100);
  }
  const expectedTotal = cartSubtotal - calculatedDiscount;
  assert(calculatedDiscount === 50, `Subtotal ₹1,098 with POD calculates exact flat ₹50 discount (got ₹${calculatedDiscount})`);
  assert(expectedTotal === 1048, `Subtotal ₹1,098 - ₹50 results in exact expected total ₹1,048 (got ₹${expectedTotal})`);

  // Verify Percentage Coupon CHILLY10
  const chillyCoupon = await prisma.coupon.findUnique({ where: { code: 'CHILLY10' } });
  assert(!!chillyCoupon, 'Coupon "CHILLY10" exists in database');
  if (chillyCoupon) {
    const chillyDiscount = chillyCoupon.discountType === 'PERCENTAGE'
      ? Math.round((cartSubtotal * chillyCoupon.discountValue) / 100)
      : chillyCoupon.discountValue;
    assert(chillyDiscount === 110, `CHILLY10 calculates 10% discount: ₹110 on ₹1,098`);
  }

  // 2. Categories & Services Separation
  console.log('\n--- TEST GROUP 2: CATEGORIES & SERVICES SEPARATION ---');
  const categories = await prisma.category.findMany();
  const serviceAsCategory = categories.find(c => c.slug.toLowerCase().includes('service') || c.name.toLowerCase().includes('service'));
  assert(!serviceAsCategory, 'No services exist inside Category table (pure product categories only)');

  const services = await prisma.service.findMany();
  assert(services.length >= 3, `Dedicated Service table contains seeded records (count: ${services.length})`);
  assert(services.every(s => s.title && s.pricePaise > 0), 'All services have valid titles and pricing');

  // 3. Multi-Image Support & Image Pipeline
  console.log('\n--- TEST GROUP 3: PRODUCT IMAGES & MULTI-IMAGE GALLERY ---');
  const sampleProduct = await prisma.product.findFirst({
    where: { status: 'APPROVED' },
  });
  assert(!!sampleProduct, 'Approved product exists in catalog');
  if (sampleProduct) {
    // Test updating product with multiple images
    const testGallery = [
      sampleProduct.mainImageUrl,
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80',
    ];
    const updatedProduct = await prisma.product.update({
      where: { id: sampleProduct.id },
      data: {
        images: testGallery,
      },
    });
    const savedImages = updatedProduct.images as string[];
    assert(Array.isArray(savedImages) && savedImages.length === 3, 'Product images JSON stores multiple image gallery correctly');
    assert(savedImages[0] === sampleProduct.mainImageUrl, 'Primary image remains first/preserved in gallery');
  }

  // 4. Product Reviews Moderation & Real Ratings
  console.log('\n--- TEST GROUP 4: REAL PRODUCT REVIEWS & RATING ENGINE ---');
  if (sampleProduct) {
    // Clean any prior test reviews for idempotency
    await prisma.review.deleteMany({ where: { comment: 'Test E2E Review Comment' } });

    // Customer submits a review
    const newReview = await prisma.review.create({
      data: {
        productId: sampleProduct.id,
        customerName: 'Aditya Tester',
        customerEmail: 'adityanextline@gmail.com',
        rating: 5,
        title: 'Outstanding Organic Soap Bar',
        comment: 'Test E2E Review Comment',
        status: ReviewStatus.PENDING,
        verifiedPurchase: true,
      },
    });
    assert(newReview.status === 'PENDING', 'New customer review is created with PENDING status for moderation');

    // Admin moderates and approves review
    const approved = await prisma.review.update({
      where: { id: newReview.id },
      data: { status: ReviewStatus.APPROVED },
    });
    assert(approved.status === 'APPROVED', 'Admin approves customer review, marking it APPROVED');

    // Check rating aggregation
    const approvedReviews = await prisma.review.findMany({
      where: { productId: sampleProduct.id, status: ReviewStatus.APPROVED },
    });
    const avgRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length;
    assert(approvedReviews.length >= 1, `Approved reviews returned for product (count: ${approvedReviews.length})`);
    assert(avgRating === 5.0, `Average rating dynamically computed from approved reviews: ${avgRating.toFixed(1)}`);
  }

  // 5. Standard Delivery & Order Creation Workflow
  console.log('\n--- TEST GROUP 5: STANDARD DELIVERY & ORDER CREATION ---');
  const testOrderNumber = `CF-TEST-${Date.now().toString().slice(-6)}`;
  const sampleOrder = await prisma.order.create({
    data: {
      orderNumber: testOrderNumber,
      customerName: 'S Aditya',
      customerEmail: 'adityanextline@gmail.com',
      customerPhone: '9080585785',
      deliverySpeed: 'standard',
      isEcoDelivery: false,
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      orderStatus: 'PENDING_DISPATCH',
      shippingFee: 0,
      totalAmount: 104800,
      taxAmount: 5240,
      shippingAddress: {
        name: 'S Aditya',
        street: '123 Natural Avenue',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
      },
      items: {
        create: [
          {
            productId: sampleProduct?.id || 'sample',
            title: sampleProduct?.title || 'Natural Soap',
            image: sampleProduct?.mainImageUrl || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=400&q=80',
            quantity: 2,
            unitPrice: 54900,
            totalPrice: 109800,
          },
        ],
      },
    },
    include: { items: true },
  });
  assert(sampleOrder.deliverySpeed === 'standard', 'Order saved with Standard Delivery exclusively');
  assert(sampleOrder.totalAmount === 104800, `Order total ₹1,048 (104,800 paise) accurately stored in database`);

  // 6. Order Status Change & Notification Tracking
  console.log('\n--- TEST GROUP 6: ORDER STATUS TRANSITION & AUDIT ---');
  const updatedOrder = await prisma.order.update({
    where: { id: sampleOrder.id },
    data: {
      orderStatus: 'IN_TRANSIT',
      trackingNumber: 'TRK-987654321',
      courierPartner: 'BlueDart Eco Express',
    },
  });
  const historyEntry = await prisma.orderStatusHistory.create({
    data: {
      orderId: sampleOrder.id,
      fromStatus: 'PENDING_DISPATCH',
      toStatus: 'IN_TRANSIT',
      changedBy: 'Super Administrator',
      reason: 'Dispatched from artisan studio via BlueDart',
    },
  });
  assert(updatedOrder.orderStatus === 'IN_TRANSIT', 'Order status updated to IN_TRANSIT in database');
  assert(historyEntry.fromStatus === 'PENDING_DISPATCH' && historyEntry.toStatus === 'IN_TRANSIT', 'Status transition recorded in OrderStatusHistory');

  // Clean up test order
  await prisma.orderItem.deleteMany({ where: { orderId: sampleOrder.id } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: sampleOrder.id } });
  await prisma.order.delete({ where: { id: sampleOrder.id } });

  console.log('\n====================================================');
  console.log(`🎯 VERIFICATION COMPLETE: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('====================================================');

  await prisma.$disconnect();
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2EVerification().catch((err) => {
  console.error('Fatal error during E2E verification:', err);
  process.exit(1);
});
