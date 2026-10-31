import { PrismaClient, UserRole, UserStatus, ProductStatusEnum, DiscountType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ALL_PERMISSIONS = [
  'overview:view', 'overview:export',
  'customers:view', 'customers:edit', 'customers:decide', 'customers:delete', 'customers:export',
  'sellers:view', 'sellers:edit', 'sellers:decide', 'sellers:delete', 'sellers:export',
  'products:view', 'products:create', 'products:edit', 'products:decide', 'products:delete', 'products:export',
  'categories:view', 'categories:create', 'categories:edit', 'categories:delete',
  'orders:view', 'orders:edit', 'orders:decide', 'orders:export',
  'refunds:view', 'refunds:decide', 'refunds:export',
  'payouts:view', 'payouts:decide', 'payouts:export',
  'content:view', 'content:edit',
  'settings:view', 'settings:edit',
  'audit_log:view', 'audit_log:export',
  'staff_roles:view', 'staff_roles:create', 'staff_roles:edit', 'staff_roles:delete',
];

const ROLES_TO_SEED = [
  {
    id: 'role_super_admin',
    name: 'Super Admin',
    description: 'Unrestricted root access to all marketplace administration, governance, and financial operations.',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    id: 'role_ops_manager',
    name: 'Operations Manager',
    description: 'Manages catalog, orders, inventory fulfillment, returns, and merchant operations.',
    isSystem: true,
    permissions: [
      'overview:view',
      'products:view', 'products:create', 'products:edit', 'products:decide',
      'categories:view', 'categories:create', 'categories:edit',
      'orders:view', 'orders:edit', 'orders:decide', 'orders:export',
      'refunds:view', 'refunds:decide',
      'sellers:view',
      'customers:view',
    ],
  },
  {
    id: 'role_compliance',
    name: 'Compliance & KYC Officer',
    description: 'Verifies merchant KYC documents, PAN/GST legal checks, and handles merchant onboarding approval.',
    isSystem: true,
    permissions: [
      'overview:view',
      'sellers:view', 'sellers:edit', 'sellers:decide', 'sellers:export',
      'audit_log:view',
    ],
  },
  {
    id: 'role_catalog_lead',
    name: 'Catalog Lead',
    description: 'Reviews seller product submissions, categorizes catalog inventory, and manages tags and taxonomy.',
    isSystem: true,
    permissions: [
      'overview:view',
      'products:view', 'products:create', 'products:edit', 'products:decide',
      'categories:view', 'categories:create', 'categories:edit',
    ],
  },
  {
    id: 'role_support_agent',
    name: 'Support Agent',
    description: 'Handles buyer inquiries, order tracking, address corrections, and refund escalations.',
    isSystem: true,
    permissions: [
      'overview:view',
      'orders:view', 'orders:edit',
      'customers:view',
      'refunds:view',
    ],
  },
];

const CATEGORIES_TO_SEED = [
  {
    id: 'natural-products',
    name: 'Natural Products',
    slug: 'natural-products',
    iconName: 'Sparkles',
    productCount: 148,
    image: '/botanical-care-banner.jpg',
    description: '100% Organic face creams, botanical elixirs & essential oils',
    subcategories: ['Face Creams', 'Botanical Oils', 'Herbal Salves', 'Body Butters', 'Aromatherapy'],
  },
  {
    id: 'handmade-products',
    name: 'Handmade Products',
    slug: 'handmade-products',
    iconName: 'PackageOpen',
    productCount: 192,
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    description: 'Woven wicker baskets, hand-carved wood & artisanal soaps',
    subcategories: ['Woven Baskets', 'Artisan Soaps', 'Pottery & Ceramics', 'Carved Wood', 'Hand-Knitted Goods'],
  },
  {
    id: 'jewelry',
    name: 'Jewelry',
    slug: 'jewelry',
    iconName: 'Gem',
    productCount: 114,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=400&q=80',
    description: 'Handcrafted silver, moonstone necklaces & artisan rings',
    subcategories: ['Silver Necklaces', 'Gemstone Rings', 'Boho Earrings', 'Beaded Bracelets', 'Pendants'],
  },
  {
    id: 'clothes-fashion',
    name: 'Clothes & Fashion',
    slug: 'clothes-fashion',
    iconName: 'Shirt',
    productCount: 86,
    image: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=400&q=80',
    description: 'Eco-friendly breathable linen, summer dresses & organic cotton',
    subcategories: ['Summer Dresses', 'Organic Cotton Tops', 'Linen Trousers', 'Hand-dyed Scarves', 'Kimono Wraps'],
  },
  {
    id: 'home-living',
    name: 'Home & Living',
    slug: 'home-living',
    iconName: 'Home',
    productCount: 165,
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
    description: 'Macrame plant hangers, terracotta pottery & soy candles',
    subcategories: ['Macrame Planters', 'Terracotta Vases', 'Soy Wax Candles', 'Jute Rugs', 'Wooden Trays'],
  },
  {
    id: 'retail-products',
    name: 'Retail Products',
    slug: 'retail-products',
    iconName: 'ShoppingBag',
    productCount: 142,
    image: '/retail-products.jpg',
    description: 'Curated pantry goods, artisanal spices, natural oils & packaged grocery',
    subcategories: ['Artisan Pantry', 'Botanical Oils & Vinegar', 'Organic Teas & Granola', 'Specialty Spices', 'Everyday Essentials'],
  },
  {
    id: 'services',
    name: 'Services',
    slug: 'services',
    iconName: 'Briefcase',
    productCount: 34,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=400&q=80',
    description: 'Holistic wellness, relaxing massage, natural beauty & home care',
    subcategories: ['Massage Therapy', 'Beauty & Skincare', 'Academic Tutoring', 'Home Eco-Cleaning', 'Personal Care'],
  },
  {
    id: 'books',
    name: 'Books',
    slug: 'books',
    iconName: 'BookOpen',
    productCount: 52,
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80',
    description: 'Authentic literature, traditional wellness guides, art & regional books',
    subcategories: ['Indian Literature', 'Wellness & Yoga', 'Art & Craft Guides', 'Children Stories', 'Cookbooks'],
  },
];

const INITIAL_COUPONS = [
  {
    code: 'CHILLY10',
    description: 'Get 10% off your entire order up to ₹250',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderAmount: 499,
    maxDiscountAmount: 250,
    usageLimit: 1000,
    perUserLimit: 2,
    isActive: true,
  },
  {
    code: 'NATURAL10',
    description: 'Special 10% off on all organic and natural pantry crafts',
    discountType: DiscountType.PERCENTAGE,
    discountValue: 10,
    minOrderAmount: 399,
    maxDiscountAmount: 150,
    usageLimit: 500,
    perUserLimit: 1,
    isActive: true,
  },
  {
    code: 'FESTIVE50',
    description: 'Flat ₹50 instant rebate on orders above ₹699',
    discountType: DiscountType.FIXED,
    discountValue: 50,
    minOrderAmount: 699,
    maxDiscountAmount: 50,
    usageLimit: 2000,
    perUserLimit: 1,
    isActive: true,
  },
];

const DEFAULT_SETTINGS = {
  marketplace: {
    platform_fee_percent: 8.5,
    tcs_tax_percent: 1.0,
    payout_frequency: 'weekly',
    minimum_payout_amount: 500,
  },
  shipping: {
    free_shipping_threshold: 999,
    standard_delivery_fee: 49,
    eco_packaging_fee: 15,
    estimated_delivery_days: 4,
  },
  compliance: {
    gstin: '32AAAAA0000A1Z5',
    legal_entity_name: 'ChillyFlakes Marketplace Private Limited',
    registered_office_address: 'Plot 42, Green Earth Commerce Hub, Kochi, Kerala 682024',
    support_email: 'adityashvkmr@gmail.com',
    support_phone: '+91 98765 43210',
  },
  system_flags: {
    maintenance_mode: false,
    seller_registration_open: true,
    eco_delivery_enabled: true,
  },
};

async function main() {
  console.info('🌱 Starting ChillyFlakes database seed...');

  // 1. Seed Roles
  console.info('👉 Seeding RBAC Roles...');
  for (const r of ROLES_TO_SEED) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions,
      },
      create: {
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissions: r.permissions,
      },
    });
  }

  // 2. Super Admin User
  console.info('👉 Seeding Super Admin Account (admin@test.com / Test@123)...');
  const adminEmail = 'admin@test.com';
  const adminPasswordHash = await bcrypt.hash('Test@123', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      name: 'Super Administrator',
      phone: '+91 98000 00001',
      emailVerifiedAt: new Date(),
      passwordHash: adminPasswordHash,
    },
    create: {
      email: adminEmail,
      name: 'Super Administrator',
      phone: '+91 98000 00001',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.staffProfile.upsert({
    where: { userId: adminUser.id },
    update: { roleId: 'role_super_admin' },
    create: {
      userId: adminUser.id,
      roleId: 'role_super_admin',
    },
  });

  // 3. Seed Categories
  console.info('👉 Seeding Categories...');
  for (const c of CATEGORIES_TO_SEED) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: {
        name: c.name,
        slug: c.slug,
        iconName: c.iconName,
        productCount: c.productCount,
        image: c.image,
        description: c.description,
        subcategories: c.subcategories,
        isActive: true,
      },
      create: {
        id: c.id,
        name: c.name,
        slug: c.slug,
        iconName: c.iconName,
        productCount: c.productCount,
        image: c.image,
        description: c.description,
        subcategories: c.subcategories,
        isActive: true,
      },
    });
  }

  // 4. Seed Platform Settings
  console.info('👉 Seeding Platform Settings...');
  await prisma.platformSetting.upsert({
    where: { id: 'default' },
    update: { settingsJson: DEFAULT_SETTINGS },
    create: { id: 'default', settingsJson: DEFAULT_SETTINGS },
  });

  // 5. Seed Coupons
  console.info('👉 Seeding Active Promotional Coupons...');
  for (const cp of INITIAL_COUPONS) {
    await prisma.coupon.upsert({
      where: { code: cp.code },
      update: {
        description: cp.description,
        discountType: cp.discountType,
        discountValue: cp.discountValue,
        minOrderAmount: cp.minOrderAmount,
        maxDiscountAmount: cp.maxDiscountAmount,
        usageLimit: cp.usageLimit,
        perUserLimit: cp.perUserLimit,
        isActive: cp.isActive,
      },
      create: cp,
    });
  }

  // 6. Seed Products from frontend products data
  console.info('👉 Importing Products from catalog...');
  // Dynamic import of products
  const productsModule = await import('../../src/data/products.ts');
  const catalogProducts = productsModule.products || [];

  for (const p of catalogProducts) {
    // Determine category ID based on category name match
    const categoryMatch = CATEGORIES_TO_SEED.find(
      (c) => c.name.toLowerCase() === (p.category || '').toLowerCase()
    ) || CATEGORIES_TO_SEED[0];

    const sku = `SKU-${p.id.replace('prod-', '').toUpperCase()}`;
    const pricePaise = Math.round((p.price || 499) * 100);
    const mrpPaise = Math.round((p.originalPrice || p.price || 599) * 100);

    const productRecord = await prisma.product.upsert({
      where: { sku },
      update: {
        title: p.name,
        slug: p.id,
        pricePaise,
        mrpPaise,
        totalStock: p.stock || 20,
        status: ProductStatusEnum.APPROVED,
        categoryId: categoryMatch.id,
        mainImageUrl: p.image,
        images: p.additionalImages || [p.image],
        description: p.description || p.conditionDetails || 'High quality marketplace craft',
        tags: [p.category, p.condition || 'New'].filter(Boolean),
        attributes: {
          material: p.material || 'Organic / Sustainable',
          condition: p.condition || 'New',
          isFeatured: p.isFeatured ? 'true' : 'false',
        },
      },
      create: {
        title: p.name,
        slug: p.id,
        sku,
        pricePaise,
        mrpPaise,
        totalStock: p.stock || 20,
        status: ProductStatusEnum.APPROVED,
        categoryId: categoryMatch.id,
        mainImageUrl: p.image,
        images: p.additionalImages || [p.image],
        description: p.description || p.conditionDetails || 'High quality marketplace craft',
        tags: [p.category, p.condition || 'New'].filter(Boolean),
        attributes: {
          material: p.material || 'Organic / Sustainable',
          condition: p.condition || 'New',
          isFeatured: p.isFeatured ? 'true' : 'false',
        },
      },
    });

    // Ensure default variant exists
    const variantSku = `${sku}-STD`;
    await prisma.productVariant.upsert({
      where: { sku: variantSku },
      update: {
        stock: productRecord.totalStock,
        pricePaise: productRecord.pricePaise,
        mrpPaise: productRecord.mrpPaise,
      },
      create: {
        productId: productRecord.id,
        sku: variantSku,
        colorName: 'Standard',
        colorHex: '#1F2937',
        size: 'Standard',
        stock: productRecord.totalStock,
        pricePaise: productRecord.pricePaise,
        mrpPaise: productRecord.mrpPaise,
      },
    });
  }

  // 7. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: adminUser.id,
      actorName: 'System Bootstrap',
      actorEmail: 'admin@test.com',
      actorRole: 'admin',
      action: 'SYSTEM_BOOTSTRAP',
      module: 'overview',
      targetId: 'system',
      targetName: 'Marketplace DB Initialization',
      ipAddress: '127.0.0.1',
      reason: 'Bootstrapped core catalog, RBAC roles, platform settings, and Super Admin user.',
    },
  });

  console.info('✅ ChillyFlakes database seed completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Database seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
