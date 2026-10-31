import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Search, 
  Star, 
  Calendar,
  Phone 
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { servicesApi } from '../api';

export interface ServiceItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Wellness' | 'Home' | 'Crafts' | 'Education';
  description: string;
  duration: string;
  price: string;
  rating: number;
  reviewsCount: number;
  image: string;
  duration_min?: number;
  price_display?: string;
  price_num?: number;
}

export const servicesData: ServiceItem[] = [
  // Layer 1: Screenshot Row
  {
    id: 'srv-massage',
    title: 'Massage Therapy',
    subtitle: 'Relax & Rejuvenate',
    category: 'Wellness',
    description: 'Therapeutic deep-tissue and Swedish massage with cold-pressed botanical essential oils. Relieves muscle tension and restores full-body tranquility.',
    duration: '60 - 90 mins',
    price: 'From ₹1,499',
    rating: 5.0,
    reviewsCount: 38,
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-beauty',
    title: 'Beauty & Skincare',
    subtitle: 'Look & Feel Your Best',
    category: 'Wellness',
    description: 'Organic botanical facials, all-natural micro-exfoliation, and custom herbal masks formulated for sensitive and dry skin types.',
    duration: '45 - 60 mins',
    price: 'From ₹999',
    rating: 4.9,
    reviewsCount: 42,
    image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-tutoring',
    title: 'Tutoring',
    subtitle: 'Learn & Grow',
    category: 'Education',
    description: 'Personalized 1-on-1 and small group academic tutoring in STEM, languages, and creative writing led by certified educators.',
    duration: '60 mins per session',
    price: 'From ₹499 / hr',
    rating: 4.9,
    reviewsCount: 29,
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-cleaning',
    title: 'Home Cleaning',
    subtitle: 'A Cleaner, Healthier Home',
    category: 'Home',
    description: 'Eco-friendly, chemical-free home sanitation using natural plant-derived cleaners. Safe for children, pets, and the planet.',
    duration: '2 - 4 hours',
    price: 'From ₹1,999',
    rating: 5.0,
    reviewsCount: 51,
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
  },

  // Layer 2: Second Row
  {
    id: 'srv-pottery',
    title: 'Pottery Workshop',
    subtitle: 'Craft & Create',
    category: 'Crafts',
    description: 'Hands-on wheel-throwing and ceramic sculpture classes guided by resident clay artisans. All materials, firing, and glazing included.',
    duration: '2 hours',
    price: 'From ₹1,299',
    rating: 5.0,
    reviewsCount: 34,
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-yoga',
    title: 'Yoga & Mindfulness',
    subtitle: 'Mind, Body & Spirit',
    category: 'Wellness',
    description: 'Restorative Hatha & Vinyasa flow sessions combined with guided breathwork and sound healing for mental clarity and inner balance.',
    duration: '60 - 75 mins',
    price: 'From ₹499',
    rating: 4.8,
    reviewsCount: 27,
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-plant-styling',
    title: 'Plant Care & Styling',
    subtitle: 'Living Green Spaces',
    category: 'Home',
    description: 'Custom botanical interior consultation, organic repotting, pest diagnosis, and seasonal greenery curation for homes and offices.',
    duration: '90 mins',
    price: 'From ₹799',
    rating: 4.9,
    reviewsCount: 19,
    image: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-wood-restoration',
    title: 'Wood Restoration',
    subtitle: 'Revitalize & Preserve',
    category: 'Home',
    description: 'Expert repair and rejuvenation of antique teak, oak, and rosewood furniture with natural shellac and beeswax finishes.',
    duration: 'Consultation & Service',
    price: 'From ₹1,799',
    rating: 5.0,
    reviewsCount: 22,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80',
  },

  // Extended Catalog in All Services Directory
  {
    id: 'srv-candle-making',
    title: 'Candle & Scent Making',
    subtitle: 'Aromatherapy Crafts',
    category: 'Crafts',
    description: 'Blend your own signature botanical soy candle with pure therapeutic essential oils, wood wicks, and reusable amber vessels.',
    duration: '90 mins',
    price: 'From ₹899',
    rating: 4.9,
    reviewsCount: 18,
    image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-fitness',
    title: 'Movement & Wellness Coaching',
    subtitle: 'Holistic Strength',
    category: 'Wellness',
    description: 'One-on-one tailored mobility, functional strength training, and gentle posture correction for everyday vitality.',
    duration: '60 mins',
    price: 'From ₹999',
    rating: 4.9,
    reviewsCount: 25,
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-photography',
    title: 'Lifestyle & Portrait Photography',
    subtitle: 'Cherished Memories',
    category: 'Education',
    description: 'Natural light portraiture, artisan brand storytelling, and family celebration photo sessions captured with warm earthy aesthetics.',
    duration: '90 - 120 mins',
    price: 'From ₹2,999',
    rating: 5.0,
    reviewsCount: 31,
    image: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'srv-tailoring',
    title: 'Eco Tailoring & Alterations',
    subtitle: 'Sustainable Wardrobe',
    category: 'Home',
    description: 'Mending, resizing, and custom repairs of heirloom linen, cotton, and wool garments to extend your wardrobe lifecycle sustainably.',
    duration: '2 - 3 days turnaround',
    price: 'From ₹299',
    rating: 4.8,
    reviewsCount: 16,
    image: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=600&q=80',
  }
];

export const ServicesSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useStore();
  const [allServices, setAllServices] = useState<ServiceItem[]>(servicesData);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [isAllServicesOpen, setIsAllServicesOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string>('All');
  const [modalSearch, setModalSearch] = useState<string>('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  // Form states for booking
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('Morning (09:00 AM - 12:00 PM)');
  const [userName, setUserName] = useState('');
  const [userContact, setUserContact] = useState('');
  const [userPhone, setUserPhone] = useState('');

  // Fetch community services from the backend API on mount and on admin updates
  useEffect(() => {
    const fetchServices = () => {
      servicesApi.getServices().then((res) => {
        if (res.data && res.data.length > 0) {
          const mapped: ServiceItem[] = (res.data as any[]).map((item) => ({
            id: item.id,
            title: item.title,
            subtitle: item.subtitle || (item.category ? `${item.category} Care` : 'Professional Care'),
            category: item.category || 'Wellness',
            description: item.description,
            duration: item.duration || `${item.duration_min || 60} mins`,
            price: item.price_display || (typeof item.price === 'number' ? `From ₹${item.price.toLocaleString('en-IN')}` : String(item.price || 'From ₹499')),
            rating: item.rating ?? 5.0,
            reviewsCount: item.reviewsCount ?? 25,
            image: item.image || 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80',
            duration_min: item.duration_min,
            price_display: item.price_display,
            price_num: typeof item.price === 'number' ? item.price : undefined,
          }));
          setAllServices(mapped);
        }
      });
    };

    fetchServices();
    window.addEventListener('cf_services_updated', fetchServices);
    return () => {
      window.removeEventListener('cf_services_updated', fetchServices);
    };
  }, []);

  const getLocalized = (s: ServiceItem) => {
    const hasKey = Boolean(s.id && s.id.startsWith('srv-'));
    const isNonEnglish = Boolean(i18n?.language && i18n.language !== 'en');
    return {
      ...s,
      title: isNonEnglish && hasKey ? t(`services.items.${s.id}.title`, s.title) : s.title,
      subtitle: isNonEnglish && hasKey ? t(`services.items.${s.id}.subtitle`, s.subtitle) : (s.subtitle || `${s.category || 'Professional'} Service`),
      description: isNonEnglish && hasKey ? t(`services.items.${s.id}.description`, s.description) : s.description,
      duration: s.duration,
      price: s.price,
      displayCategory: t(`services.tags.${s.category}`, s.category),
    };
  };

  const localizedList = useMemo(() => {
    return allServices.map(getLocalized);
  }, [allServices, t, i18n?.language]);

  // 8 Service Cards for the page grid
  const displayedServices = localizedList.slice(0, 8);

  // Filtering for All Services Modal
  const modalFilteredServices = useMemo(() => {
    return localizedList.filter((s) => {
      const matchesCategory = modalCategory === 'All' || s.category === modalCategory;
      const query = modalSearch.toLowerCase();
      const matchesSearch =
        modalSearch.trim() === '' ||
        s.title.toLowerCase().includes(query) ||
        s.subtitle.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [localizedList, modalCategory, modalSearch]);

  const handleBookService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    const customerEmail = userContact.trim();
    const customerPhone = userPhone.trim();

    try {
      const res = await servicesApi.createBooking({
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        userName,
        userContact: customerEmail || customerPhone,
        customerEmail: customerEmail || undefined,
        customerPhone: customerPhone || undefined,
        preferredDate: bookingDate,
        preferredTime: bookingTime,
      });

      setBookingConfirmed(true);
      showToast(res.data?.message || `Appointment requested for ${selectedService.title}! Confirmation email sent.`, 'success');
      window.dispatchEvent(new CustomEvent('cf_service_booked'));
      setTimeout(() => {
        setSelectedService(null);
        setBookingConfirmed(false);
        setBookingDate('');
        setUserName('');
        setUserContact('');
        setUserPhone('');
      }, 2000);
    } catch (err: any) {
      showToast(err.message || t('services.modal.errorMsg', 'Could not submit booking. Please try again.'), 'warning');
    }
  };

  return (
    <section id="services-section" className="py-12 sm:py-16 bg-[#FAF7F2] border-b border-[#ECE7DD]">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* Left Column: Heading "Services" & Description */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-28">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#223B28] tracking-tight">
              {t('services.homeTitle', 'Services')}
            </h2>
            <p className="font-medium text-sm sm:text-base text-[#2D3A2F]">
              {t('services.homeSubtitle', 'Skilled professionals, at your service')}
            </p>
            <p className="text-xs sm:text-sm text-[#506052] leading-relaxed max-w-sm font-normal">
              {t('services.homeDesc', 'From wellness to personal care, find trusted service providers in your community.')}
            </p>

            {/* Value badges */}
            <div className="pt-2 space-y-2 text-xs text-[#556956]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2E4D34]" />
                <span>{t('services.badgeVerified', 'Verified & Vetted Community Experts')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2E4D34]" />
                <span>{t('services.badgePricing', '100% Transparent Pricing')}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setIsAllServicesOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs sm:text-sm font-medium rounded-full shadow-xs hover:shadow-md transition-all duration-300 group active:scale-98 cursor-pointer"
              >
                <span>{t('services.browseServices', 'Browse Services')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Right Column: Service Cards Grid */}
          <div className="lg:col-span-8">
            
            {/* View All Services Link above service cards */}
            <div className="flex justify-end pb-3">
              <button
                onClick={() => navigate('/services')}
                className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2D3A2F] hover:text-[#2E4D34] transition-colors cursor-pointer"
              >
                <span>{t('services.viewAll', 'View All Services')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-[#2E4D34]" />
              </button>
            </div>

            {/* 4-Column Service Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
              {displayedServices.map((service) => (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#C4D5C2] transition-all duration-300 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                >
                  {/* Service Image */}
                  <div className="aspect-[4/3] overflow-hidden bg-[#F6F3EC] relative">
                    <img
                      src={service.image}
                      alt={service.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=600&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                    />
                    <span className="absolute top-2 left-2 bg-white/95 text-[#2E4D34] text-[9px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                      {service.displayCategory}
                    </span>
                  </div>

                  {/* Service Info */}
                  <div className="p-3 sm:p-3.5 text-center flex-grow flex flex-col justify-center">
                    <h3 className="font-semibold text-xs sm:text-sm text-[#223B28] group-hover:text-[#2E4D34] transition-colors line-clamp-1">
                      {service.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-[#6C7B6D] mt-0.5 line-clamp-1">
                      {service.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================
          FULL "ALL SERVICES DIRECTORY" MODAL
          ======================================================== */}
      {isAllServicesOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAllServicesOpen(false)}
          />

          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <div className="relative bg-[#FAF7F2] rounded-3xl max-w-4xl w-full p-5 sm:p-8 shadow-2xl border border-[#ECE7DD] text-[#223B28] my-8 max-h-[90vh] flex flex-col">
              
              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#ECE7DD]">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
                      {t('services.allTitle', 'All Community Services')}
                    </h2>
                    <span className="bg-[#EAF2E9] text-[#2E4D34] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#CDE1CB]">
                      {t('services.availableCount', { count: servicesData.length, defaultValue: `${servicesData.length} Available` })}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#556956] mt-1">
                    {t('services.allSubtitle', 'Connect with certified local practitioners, artisans, and verified community experts.')}
                  </p>
                </div>

                <button
                  onClick={() => setIsAllServicesOpen(false)}
                  className="p-2 text-[#7E8F80] hover:text-[#223B28] rounded-full hover:bg-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Category Filter Controls */}
              <div className="py-4 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-[#7E8F80] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    placeholder={t('services.searchPlaceholder', 'Search services...')}
                    className="w-full pl-10 pr-4 py-2 bg-white rounded-xl text-xs sm:text-sm border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34] focus:ring-1 focus:ring-[#2E4D34]"
                  />
                  {modalSearch && (
                    <button 
                      onClick={() => setModalSearch('')} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7E8F80] hover:text-[#223B28]"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
                  {[
                    { label: t('services.categories.all', 'All Services'), value: 'All' },
                    { label: t('services.categories.wellness', 'Wellness & Massage'), value: 'Wellness' },
                    { label: t('services.categories.home', 'Eco Home & Living'), value: 'Home' },
                    { label: t('services.categories.crafts', 'Artisan Workshops'), value: 'Crafts' },
                    { label: t('services.categories.education', 'Tutoring & Skills'), value: 'Education' },
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setModalCategory(cat.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex-shrink-0 cursor-pointer ${
                        modalCategory === cat.value
                          ? 'bg-[#2E4D34] text-white shadow-xs'
                          : 'bg-white text-[#506052] border border-[#ECE7DD] hover:border-[#2E4D34] hover:text-[#2E4D34]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Services Grid inside Modal */}
              <div className="overflow-y-auto pr-1 flex-grow space-y-4">
                {modalFilteredServices.length === 0 ? (
                  <div className="py-12 text-center text-[#7E8F80]">
                    <p className="text-sm">No services found matching "{modalSearch}".</p>
                    <button 
                      onClick={() => { setModalSearch(''); setModalCategory('All'); }} 
                      className="mt-2 text-xs text-[#2E4D34] underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {modalFilteredServices.map((service) => (
                      <div
                        key={service.id}
                        onClick={() => setSelectedService(service)}
                        className="group bg-white rounded-2xl overflow-hidden border border-[#ECE7DD] hover:border-[#C4D5C2] transition-all duration-300 hover:shadow-lg flex flex-col justify-between cursor-pointer"
                      >
                        <div className="aspect-[16/10] overflow-hidden bg-[#F6F3EC] relative">
                          <img
                            src={service.image}
                            alt={service.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className="absolute top-2.5 left-2.5 bg-white/95 text-[#2E4D34] text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                            {service.displayCategory}
                          </span>
                        </div>

                        <div className="p-3.5 flex flex-col flex-grow justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-semibold text-sm text-[#223B28] group-hover:text-[#2E4D34]">
                                {service.title}
                              </h4>
                              <div className="flex items-center gap-0.5 text-[#E5A024] text-[11px] font-semibold">
                                <Star className="w-3 h-3 fill-current text-[#E5A024]" />
                                <span>{service.rating}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-[#6C7B6D] mt-0.5">
                              {service.subtitle}
                            </p>
                            <p className="text-xs text-[#506052] mt-2 line-clamp-2 leading-relaxed">
                              {service.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#F2ECE1] flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2E4D34]">
                              {service.price}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedService(service);
                              }}
                              className="px-3 py-1 bg-[#2E4D34] hover:bg-[#223E27] text-white text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            >
                              {t('services.bookNow', 'Book Now')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          INTERACTIVE SERVICE DETAIL & BOOKING MODAL
          ======================================================== */}
      {selectedService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setSelectedService(null)}
          />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-[#ECE7DD] text-[#223B28]">
              
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-4 right-4 p-2 text-[#7E8F80] hover:text-[#223B28] rounded-full hover:bg-[#FAF7F2] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="aspect-video w-full rounded-2xl overflow-hidden mb-5">
                <img src={selectedService.image} alt={selectedService.title} className="w-full h-full object-cover" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#2E4D34] bg-[#EAF1EA] px-3 py-1 rounded-full">
                  {selectedService.price}
                </span>
                <span className="text-xs text-[#7E8F80] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {selectedService.duration}
                </span>
              </div>

              <h3 className="font-serif text-2xl font-bold text-[#223B28]">{selectedService.title}</h3>
              <p className="text-xs font-medium text-[#6C7B6D] mt-0.5">{selectedService.subtitle}</p>
              <p className="text-xs text-[#506052] leading-relaxed mt-3">{selectedService.description}</p>

              {bookingConfirmed ? (
                <div className="mt-6 p-4 bg-[#EAF1EA] rounded-2xl flex items-center gap-3 text-[#2E4D34] text-xs font-semibold">
                  <CheckCircle2 className="w-5 h-5 text-[#2E4D34]" />
                  <span>{t('services.modal.successMsg', 'Your booking request has been submitted successfully!')}</span>
                </div>
              ) : (
                <form onSubmit={handleBookService} className="mt-6 space-y-3 pt-3 border-t border-[#ECE7DD]">
                  <p className="text-xs font-semibold text-[#223B28]">
                    {t('services.modal.title', 'Request an Appointment:')}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#6C7B6D] block mb-1">
                        {t('services.modal.namePlaceholder', 'Your Full Name')}
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#6C7B6D] block mb-1">
                        Email Address
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={userContact}
                        onChange={(e) => setUserContact(e.target.value)}
                        placeholder="sarah@example.com"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-[#6C7B6D] block mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-[#2E4D34]" /> Phone Number
                      </label>
                      <input 
                        type="tel" 
                        required 
                        value={userPhone}
                        onChange={(e) => setUserPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-[#6C7B6D] block mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#2E4D34]" /> Preferred Date
                      </label>
                      <input 
                        type="date" 
                        required 
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-[#6C7B6D] block mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#2E4D34]" /> Preferred Time
                    </label>
                    <select 
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#ECE7DD] focus:outline-none focus:border-[#2E4D34]"
                    >
                      <option>{t('services.modal.slotMorning', 'Morning (09:00 AM - 12:00 PM)')}</option>
                      <option>{t('services.modal.slotAfternoon', 'Afternoon (12:00 PM - 03:00 PM)')}</option>
                      <option>{t('services.modal.slotEvening', 'Evening (03:00 PM - 06:00 PM)')}</option>
                      <option>{t('services.modal.slotWeekend', 'Weekend Special Slot')}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 mt-2 bg-[#2E4D34] hover:bg-[#233B27] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    {t('services.modal.confirmBtn', 'Confirm Booking Request')}
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      )}

    </section>
  );
};

export default ServicesSection;
