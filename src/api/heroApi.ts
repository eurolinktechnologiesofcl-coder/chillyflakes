import { apiClient, type ApiResponse } from './client';

export interface HeroSlideData {
  id: string;
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  description: string;
  buttonText: string;
  image: string;
  category?: string;
  backgroundPosition?: string;
  isActive?: boolean;
  order?: number;
}

const defaultSlides: HeroSlideData[] = [
  {
    id: 'slide-1',
    subtitle: 'WELCOME TO CHILLYFLAKES',
    titleLine1: 'Natural Products',
    titleLine2: 'Handmade with Love',
    description: 'Discover unique, eco-friendly products, beautiful jewelry, fashionable clothes, home décor and professional services — all from talented local sellers.',
    buttonText: 'Shop Now',
    image: '/hero-banner.jpg',
    category: 'All',
    backgroundPosition: 'right 30% center',
  },
  {
    id: 'slide-2',
    subtitle: 'BAMBOO HOME DÉCOR & HANDICRAFTS',
    titleLine1: 'Artisan Bamboo',
    titleLine2: 'Handcrafted Living',
    description: 'Hand-woven bamboo baskets, warm woven lanterns, and mindful earthen handicrafts crafted by skilled local artisans to bring organic warmth to your home.',
    buttonText: 'Explore Handicrafts',
    image: '/bamboo-decor-banner.jpg',
    category: 'Home & Living',
    backgroundPosition: 'right 30% center',
  },
  {
    id: 'slide-3',
    subtitle: 'PURE BOTANICAL CARE',
    titleLine1: 'Organic Self-Care',
    titleLine2: 'Pure Botanical Touch',
    description: 'Cold-pressed botanical oils, lavender artisanal soaps, and pure soy candles blended with zero toxic additives.',
    buttonText: 'Discover Wellness',
    image: '/botanical-care-banner.jpg',
    category: 'Natural Products',
    backgroundPosition: 'right 30% center',
  },
  {
    id: 'slide-4',
    subtitle: 'EXPLORE YOUR PASSION',
    titleLine1: 'Learn. Create.',
    titleLine2: 'Stay Inspired.',
    description: 'Discover a wide range of services and activities that enrich your skills, hobbies and lifestyle — from music and art to wellness and tutoring.',
    buttonText: 'Explore Services',
    image: '/services-hero-banner.jpg',
    category: 'Services',
    backgroundPosition: 'right center',
  }
];

/**
 * Hero Banner API Service
 * Maps to backend endpoint:
 * - GET /api/hero-slides/
 */
export const heroApi = {
  /**
   * Fetch active hero banner slides from the backend CMS/database.
   */
  async getHeroSlides(): Promise<ApiResponse<HeroSlideData[]>> {
    return apiClient.get<HeroSlideData[]>('hero-slides/', defaultSlides);
  },
};
