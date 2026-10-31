import { prisma } from '../src/lib/prisma.js';
import { DiscountType } from '@prisma/client';

async function main() {
  // 1. Delete or separate 'services' from Category
  const cat = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: 'services' },
        { name: { equals: 'Services', mode: 'insensitive' } },
        { name: { equals: 'Servicesv', mode: 'insensitive' } }
      ]
    }
  });

  if (cat) {
    console.log('Found category to remove from product categories:', cat.name, cat.slug);
    const fallbackCategory = await prisma.category.findFirst({
      where: { slug: { not: cat.slug } }
    });
    if (fallbackCategory) {
      await prisma.product.updateMany({
        where: { categoryId: cat.id },
        data: { categoryId: fallbackCategory.id }
      });
    }
    await prisma.category.delete({ where: { id: cat.id } });
    console.log('Removed Services from product categories.');
  }

  // 2. Ensure initial dedicated Services exist in Service table
  const count = await prisma.service.count();
  if (count === 0) {
    await prisma.service.createMany({
      data: [
        {
          title: 'Holistic Massage Therapy',
          slug: 'holistic-massage-therapy',
          description: 'Authentic Ayurvedic herbal oil massage conducted by certified therapists to relieve deep muscle stiffness and balance mind.',
          category: 'Wellness',
          pricePaise: 149900,
          durationMin: 60,
          image: '/botanical-care-banner.jpg',
          isActive: true,
          features: ['Pure cold-pressed herb oils', 'Steam bath included', 'Experienced practitioners']
        },
        {
          title: 'Herbal Beauty & Skincare Consultation',
          slug: 'herbal-beauty-skincare',
          description: 'Personalized organic facial routine, skin diagnostics, and handmade mask application customized to your dosha.',
          category: 'Beauty',
          pricePaise: 99900,
          durationMin: 45,
          image: '/hero-chilli.png',
          isActive: true,
          features: ['Zero synthetic chemicals', 'Personalized regimen guide', 'Take-home sample pack']
        },
        {
          title: 'Home Eco-Cleaning & Air Purification',
          slug: 'home-eco-cleaning',
          description: 'Comprehensive natural home sanitation using plant-based saponins, lemongrass extracts, and allergen reduction.',
          category: 'Home Care',
          pricePaise: 249900,
          durationMin: 180,
          image: '/spices-banner.jpg',
          isActive: true,
          features: ['Pet & baby safe formulations', 'Essential oil aroma diffusion', 'Complete dust-mite treatment']
        }
      ]
    });
    console.log('Seeded dedicated services.');
  }

  // 3. Ensure Coupon POD is created / configured with FLAT ₹50 discount
  const pod = await prisma.coupon.upsert({
    where: { code: 'POD' },
    update: {
      discountType: DiscountType.FIXED,
      discountValue: 50,
      minOrderAmount: 500,
      usageLimit: 1000,
      perUserLimit: 1,
      isActive: true,
      description: 'Flat ₹50 OFF on orders above ₹500',
    },
    create: {
      code: 'POD',
      discountType: DiscountType.FIXED,
      discountValue: 50,
      minOrderAmount: 500,
      usageLimit: 1000,
      perUserLimit: 1,
      isActive: true,
      description: 'Flat ₹50 OFF on orders above ₹500',
    }
  });
  console.log('Coupon POD seeded/updated:', pod.code, pod.discountType, pod.discountValue);

  // 4. Ensure CHILLY10 exists as PERCENTAGE 10%
  const chilly10 = await prisma.coupon.upsert({
    where: { code: 'CHILLY10' },
    update: {
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 0,
      isActive: true,
      description: '10% OFF on all handcrafted items',
    },
    create: {
      code: 'CHILLY10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      minOrderAmount: 0,
      isActive: true,
      description: '10% OFF on all handcrafted items',
    }
  });
  console.log('Coupon CHILLY10 seeded/updated:', chilly10.code, chilly10.discountType, chilly10.discountValue);
}

main().catch(console.error).finally(() => prisma.$disconnect());
