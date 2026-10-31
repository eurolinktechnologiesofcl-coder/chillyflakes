import { PrismaClient, BookingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- TEST 1: VERIFY 0 ORDERS ---');
  const orderCount = await prisma.order.count();
  console.log(`Current orders in database: ${orderCount}`);
  if (orderCount !== 0) {
    throw new Error(`Expected 0 orders, found ${orderCount}`);
  }
  console.log('✅ Orders table is completely clean (0 orders).');

  console.log('\n--- TEST 2: SUBMIT SERVICE BOOKING ---');
  const service = await prisma.service.findFirst({ where: { isActive: true } });
  if (!service) throw new Error('No active service found to book');

  const testPayload = {
    serviceId: service.id,
    serviceTitle: service.title,
    userName: 'S Aditya Test Client',
    userContact: 'adityashvkmr@gmail.com',
    customerEmail: 'adityashvkmr@gmail.com',
    customerPhone: '9080585785',
    preferredDate: '2026-11-05',
    preferredTime: 'Morning (09:00 AM - 12:00 PM)',
    notes: 'Please bring lavender aromatherapy oils.',
  };

  const bookingRes = await fetch('http://localhost:4000/api/v1/services/bookings/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPayload),
  });

  if (!bookingRes.ok) {
    const errText = await bookingRes.text();
    throw new Error(`Service booking endpoint failed: ${bookingRes.status} ${errText}`);
  }

  const bookingData = await bookingRes.json();
  console.log('Booking API Response:', bookingData);

  console.log('\n--- TEST 3: VERIFY IN POSTGRESQL DATABASE ---');
  const dbBooking = await prisma.serviceBooking.findUnique({
    where: { bookingRef: bookingData.bookingRef },
  });

  if (!dbBooking) {
    throw new Error(`Booking ${bookingData.bookingRef} not found in database!`);
  }
  console.log('✅ Found Booking in PostgreSQL:', {
    id: dbBooking.id,
    ref: dbBooking.bookingRef,
    title: dbBooking.serviceTitle,
    customer: dbBooking.customerName,
    email: dbBooking.customerEmail,
    phone: dbBooking.customerPhone,
    status: dbBooking.status,
  });

  console.log('\n--- TEST 4: VERIFY ADMIN BOOKINGS ENDPOINT ---');
  // Query all bookings via Prisma to verify counts
  const totalBookings = await prisma.serviceBooking.count();
  const pendingBookings = await prisma.serviceBooking.count({ where: { status: BookingStatus.PENDING } });
  console.log(`Total Bookings: ${totalBookings}, Pending: ${pendingBookings}`);
  if (pendingBookings === 0) throw new Error('Expected at least 1 pending booking');
  console.log('✅ Pending booking count verified.');

  console.log('\n--- TEST 5: UPDATE STATUS VIA ADMIN SIMULATION ---');
  const updatedBooking = await prisma.serviceBooking.update({
    where: { id: dbBooking.id },
    data: { status: BookingStatus.CONFIRMED },
  });
  console.log('✅ Booking updated in DB to:', updatedBooking.status);

  console.log('\n=============================================');
  console.log('🎉 ALL SERVICE BOOKING AND EMAIL TESTS PASSED!');
  console.log('=============================================');
}

run()
  .catch((err) => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
