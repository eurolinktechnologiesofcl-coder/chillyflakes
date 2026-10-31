import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../lib/errors.js';

export const publicCatalogRouter = Router();

function formatStorefrontProduct(p: any) {
  const price = Math.round(p.pricePaise / 100);
  const originalPrice = Math.round(p.mrpPaise / 100);
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const attrs = (p.attributes as Record<string, string>) || {};

  const approvedReviews = Array.isArray(p.reviews) ? p.reviews : [];
  const reviewsCount = approvedReviews.length;
  const rating = reviewsCount > 0
    ? Number((approvedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewsCount).toFixed(1))
    : 0;

  const rawImages = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.mainImageUrl ? [p.mainImageUrl] : []);

  return {
    id: p.slug || p.id,
    name: p.title,
    category: p.category?.name || 'Uncategorized',
    condition: attrs.condition || 'New',
    conditionDetails: p.description,
    price,
    originalPrice,
    discount,
    rating,
    reviewsCount,
    image: p.mainImageUrl,
    additionalImages: rawImages,
    description: p.description,
    material: attrs.material || 'Organic / Sustainable',
    features: ['100% Verified Quality', 'Direct from Verified Artisan', 'Eco-friendly packaging'],
    isFeatured: attrs.isFeatured === 'true',
    isPreOwned: false,
    stock: p.totalStock,
    isAssured: true,
  };
}

/* -------------------------------- PRODUCTS -------------------------------- */
publicCatalogRouter.get('/products/', async (req, res) => {
  const { category, search, ordering, is_featured } = req.query;

  const where: any = {
    status: 'APPROVED',
  };

  if (category && category !== 'All') {
    where.category = {
      OR: [
        { name: { equals: category as string, mode: 'insensitive' } },
        { slug: { equals: category as string, mode: 'insensitive' } },
      ],
    };
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  const orderBy: any = {};
  if (ordering === 'price') orderBy.pricePaise = 'asc';
  else if (ordering === '-price') orderBy.pricePaise = 'desc';
  else orderBy.createdAt = 'desc';

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: true,
      variants: true,
      reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
    },
  });

  res.json(products.map(formatStorefrontProduct));
});

publicCatalogRouter.get('/products/featured/', async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'APPROVED' },
    take: 8,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
    },
  });
  res.json(products.map(formatStorefrontProduct));
});

publicCatalogRouter.get('/products/trending/', async (_req, res) => {
  const products = await prisma.product.findMany({
    where: { status: 'APPROVED' },
    take: 8,
    orderBy: { totalStock: 'desc' },
    include: {
      category: true,
      reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
    },
  });
  res.json(products.map(formatStorefrontProduct));
});

publicCatalogRouter.get('/products/:id/', async (req, res) => {
  const { id } = req.params;
  const product = await prisma.product.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      status: 'APPROVED',
    },
    include: {
      category: true,
      variants: true,
      reviews: { where: { status: 'APPROVED' }, select: { rating: true } },
    },
  });

  if (!product) {
    throw new ApiError(404, 'not_found', 'Product not found.');
  }

  res.json(formatStorefrontProduct(product));
});

/* ------------------------------- CATEGORIES ------------------------------- */
publicCatalogRouter.get('/categories/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { products: true } },
    },
  });

  const formatted = categories.map((c) => ({
    id: c.slug,
    name: c.name,
    i18nKey: `categories.${c.slug.replace(/-([a-z])/g, (_, g) => g.toUpperCase())}`,
    iconName: c.iconName || 'PackageOpen',
    productCount: c._count.products || c.productCount,
    image: c.image || '/botanical-care-banner.jpg',
    description: c.description || '',
    subcategories: (c.subcategories as string[]) || [],
  }));

  res.json(formatted);
});

publicCatalogRouter.get('/categories/:id/', async (req, res) => {
  const { id } = req.params;
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
      isActive: true,
    },
  });

  if (!category) {
    throw new ApiError(404, 'not_found', 'Category not found.');
  }

  res.json({
    id: category.slug,
    name: category.name,
    iconName: category.iconName || 'PackageOpen',
    productCount: category.productCount,
    image: category.image || '/botanical-care-banner.jpg',
    description: category.description || '',
    subcategories: (category.subcategories as string[]) || [],
  });
});
