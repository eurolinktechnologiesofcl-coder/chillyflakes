import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const allServices = [
  {
    id: 'srv-massage',
    title: 'Massage Therapy',
    subtitle: 'Relax & Rejuvenate',
    slug: 'massage-therapy',
    category: 'Wellness',
    description: 'Therapeutic deep-tissue and Swedish massage with cold-pressed botanical essential oils. Relieves muscle tension and restores full-body tranquility.',
    duration: '60 - 90 mins',
    durationMin: 75,
    pricePaise: 149900,
    rating: 5.0,
    reviewsCount: 38,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-beauty',
    title: 'Beauty & Skincare',
    subtitle: 'Look & Feel Your Best',
    slug: 'beauty-skincare',
    category: 'Wellness',
    description: 'Organic botanical facials, all-natural micro-exfoliation, and custom herbal masks formulated for sensitive and dry skin types.',
    duration: '45 - 60 mins',
    durationMin: 60,
    pricePaise: 99900,
    rating: 4.9,
    reviewsCount: 42,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-tutoring',
    title: 'Tutoring',
    subtitle: 'Learn & Grow',
    slug: 'tutoring',
    category: 'Education',
    description: 'Personalized 1-on-1 and small group academic tutoring in STEM, languages, and creative writing led by certified educators.',
    duration: '60 mins per session',
    durationMin: 60,
    pricePaise: 49900,
    rating: 4.9,
    reviewsCount: 29,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-cleaning',
    title: 'Home Cleaning',
    subtitle: 'A Cleaner, Healthier Home',
    slug: 'home-cleaning',
    category: 'Home',
    description: 'Eco-friendly, chemical-free home sanitation using natural plant-derived cleaners. Safe for children, pets, and the planet.',
    duration: '2 - 4 hours',
    durationMin: 180,
    pricePaise: 199900,
    rating: 5.0,
    reviewsCount: 51,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-pottery',
    title: 'Pottery Workshop',
    subtitle: 'Craft & Create',
    slug: 'pottery-workshop',
    category: 'Crafts',
    description: 'Hands-on wheel-throwing and ceramic sculpture classes guided by resident clay artisans. All materials, firing, and glazing included.',
    duration: '2 hours',
    durationMin: 120,
    pricePaise: 129900,
    rating: 5.0,
    reviewsCount: 34,
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-yoga',
    title: 'Yoga & Mindfulness',
    subtitle: 'Mind, Body & Spirit',
    slug: 'yoga-mindfulness',
    category: 'Wellness',
    description: 'Restorative Hatha & Vinyasa flow sessions combined with guided breathwork and sound healing for mental clarity and inner balance.',
    duration: '60 - 75 mins',
    durationMin: 75,
    pricePaise: 49900,
    rating: 4.8,
    reviewsCount: 27,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-plant-styling',
    title: 'Plant Care & Styling',
    subtitle: 'Living Green Spaces',
    slug: 'plant-care-styling',
    category: 'Home',
    description: 'Custom botanical interior consultation, organic repotting, pest diagnosis, and seasonal greenery curation for homes and offices.',
    duration: '90 mins',
    durationMin: 90,
    pricePaise: 79900,
    rating: 4.9,
    reviewsCount: 19,
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-wood-restoration',
    title: 'Wood Restoration',
    subtitle: 'Revitalize & Preserve',
    slug: 'wood-restoration',
    category: 'Home',
    description: 'Expert repair and rejuvenation of antique teak, oak, and rosewood furniture with natural shellac and beeswax finishes.',
    duration: 'Consultation & Service',
    durationMin: 120,
    pricePaise: 179900,
    rating: 5.0,
    reviewsCount: 22,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-candle-making',
    title: 'Candle & Scent Making',
    subtitle: 'Aromatherapy Crafts',
    slug: 'candle-scent-making',
    category: 'Crafts',
    description: 'Blend your own signature botanical soy candle with pure therapeutic essential oils, wood wicks, and reusable amber vessels.',
    duration: '90 mins',
    durationMin: 90,
    pricePaise: 89900,
    rating: 4.9,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-fitness',
    title: 'Movement & Wellness Coaching',
    subtitle: 'Holistic Strength',
    slug: 'movement-wellness-coaching',
    category: 'Wellness',
    description: 'One-on-one tailored mobility, functional strength training, and gentle posture correction for everyday vitality.',
    duration: '60 mins',
    durationMin: 60,
    pricePaise: 99900,
    rating: 4.9,
    reviewsCount: 25,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-photography',
    title: 'Lifestyle & Portrait Photography',
    subtitle: 'Cherished Memories',
    slug: 'lifestyle-portrait-photography',
    category: 'Education',
    description: 'Natural light portraiture, artisan brand storytelling, and family celebration photo sessions captured with warm earthy aesthetics.',
    duration: '90 - 120 mins',
    durationMin: 120,
    pricePaise: 299900,
    rating: 5.0,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  },
  {
    id: 'srv-tailoring',
    title: 'Eco Tailoring & Alterations',
    subtitle: 'Sustainable Wardrobe',
    slug: 'eco-tailoring-alterations',
    category: 'Home',
    description: 'Mending, resizing, and custom repairs of heirloom linen, cotton, and wool garments to extend your wardrobe lifecycle sustainably.',
    duration: '2 - 3 days turnaround',
    durationMin: 60,
    pricePaise: 29900,
    rating: 4.8,
    reviewsCount: 16,
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80',
    isActive: true,
  }
];

async function main() {
  console.log('Clearing old minimal services from Service table...');
  await prisma.service.deleteMany({});

  console.log(`Seeding all ${allServices.length} authentic services into PostgreSQL...`);
  for (const s of allServices) {
    await prisma.service.create({
      data: s,
    });
    console.log(`✓ Seeded service: ${s.title} (${s.category})`);
  }

  const count = await prisma.service.count();
  console.log(`All done! Total services in database: ${count}`);
}

main()
  .catch((e) => {
    console.error('Error seeding services:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
