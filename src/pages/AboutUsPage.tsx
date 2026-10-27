import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Sprout, 
  HeartHandshake, 
  MapPin, 
  ArrowRight, 
  Users, 
  Layers, 
  Compass,
  CheckCircle2
} from 'lucide-react';
import { LanguageSwitcher } from '../components/ui/LanguageSwitcher';

export const AboutUsPage: React.FC = () => {
  const { t } = useTranslation();

  const productCategories = [
    {
      id: 'natural-products',
      name: t('about.categories.natural.name', 'Natural Products'),
      description: t('about.categories.natural.desc', 'Single-estate cold-pressed botanical oils, wild harvested Western Ghats honey, chemical-free face elixirs, and raw Ayurvedic herbs.'),
      stateOrigins: t('about.categories.natural.origins', 'Kerala, Uttarakhand, Himachal Pradesh'),
      icon: '🌿',
      link: '/shop?category=Natural%20Products',
      itemCount: t('about.categories.natural.itemCount', '120+ Products'),
    },
    {
      id: 'handmade-products',
      name: t('about.categories.handmade.name', 'Handmade Products'),
      description: t('about.categories.handmade.desc', 'Traditional wheel-thrown terracotta pottery, hand-carved rosewood, natural soy aromatherapy candles, and hand-knotted macrame decor.'),
      stateOrigins: t('about.categories.handmade.origins', 'Rajasthan, West Bengal, Karnataka'),
      icon: '🏺',
      link: '/shop?category=Handmade%20Products',
      itemCount: t('about.categories.handmade.itemCount', '240+ Products'),
    },
    {
      id: 'jewelry',
      name: t('about.categories.jewelry.name', 'Jewelry'),
      description: t('about.categories.jewelry.desc', 'Pure 925 sterling silver filigree, natural rainbow moonstones, terracotta hand-painted earrings, and authentic temple jewelry.'),
      stateOrigins: t('about.categories.jewelry.origins', 'Odisha, Rajasthan, Tamil Nadu'),
      icon: '✨',
      link: '/shop?category=Jewelry',
      itemCount: t('about.categories.jewelry.itemCount', '85+ Products'),
    },
    {
      id: 'clothes-fashion',
      name: t('about.categories.clothes.name', 'Clothes & Fashion'),
      description: t('about.categories.clothes.desc', 'Handloom Kasavu cotton, breathable pure linen shirts, natural vegetable-dyed stoles, and hand-embroidered Kantha apparel.'),
      stateOrigins: t('about.categories.clothes.origins', 'Kerala, West Bengal, Gujarat'),
      icon: '🧵',
      link: '/shop?category=Clothes%20%26%20Fashion',
      itemCount: t('about.categories.clothes.itemCount', '110+ Products'),
    },
    {
      id: 'home-living',
      name: t('about.categories.home.name', 'Home & Living'),
      description: t('about.categories.home.desc', 'Solid brass Kerala Nilavilakku lamps, braided water-hyacinth floor mats, ceramic stoneware mugs, and eco-friendly teak cutting boards.'),
      stateOrigins: t('about.categories.home.origins', 'Kerala, Tamil Nadu, Uttar Pradesh'),
      icon: '🏡',
      link: '/shop?category=Home%20%26%20Living',
      itemCount: t('about.categories.home.itemCount', '150+ Products'),
    },
    {
      id: 'retail-products',
      name: t('about.categories.retail.name', 'Retail Products'),
      description: t('about.categories.retail.desc', 'Export-grade Idukki green cardamom pods, Malabar Tellicherry black peppercorns, organic jaggery crystals, and artisan plantation coffee.'),
      stateOrigins: t('about.categories.retail.origins', 'Kerala (Idukki & Wayanad), Coorg'),
      icon: '🌶️',
      link: '/shop?category=Retail%20Products',
      itemCount: t('about.categories.retail.itemCount', '65+ Products'),
    },
  ];

  const servicesList = [
    {
      id: 'massage-therapy',
      title: t('about.services.massage.title', 'Massage Therapy'),
      subtitle: t('about.services.massage.sub', 'Traditional Ayurvedic Abhyanga & Therapeutic Wellness'),
      desc: t('about.services.massage.desc', 'Certified local Ayurvedic therapists delivering authentic herbal oil body treatments, pain relief sessions, and rejuvenating wellness therapies right to your doorstep or at verified artisan studios.'),
      badge: t('about.services.massage.badge', 'Certified Practitioners'),
      icon: '🧘',
    },
    {
      id: 'beauty-skincare',
      title: t('about.services.beauty.title', 'Beauty & Skincare'),
      subtitle: t('about.services.beauty.sub', '100% Herbal & Botanical Facial Care'),
      desc: t('about.services.beauty.desc', 'Personalized bridal and daily self-care treatments prepared fresh with turmeric, sandalwood, raw honey, and rose water by seasoned village beauticians and herbalists.'),
      badge: t('about.services.beauty.badge', 'Zero Chemicals'),
      icon: '🌸',
    },
    {
      id: 'tutoring',
      title: t('about.services.tutoring.title', 'Tutoring'),
      subtitle: t('about.services.tutoring.sub', 'Regional Indian Languages & Traditional Crafts'),
      desc: t('about.services.tutoring.desc', 'Passionate community tutors teaching Malayalam, Tamil, Hindi, and Kannada, as well as hands-on masterclasses in pottery, embroidery, and classical Carnatic arts.'),
      badge: t('about.services.tutoring.badge', 'Native Language Experts'),
      icon: '📚',
    },
    {
      id: 'home-cleaning',
      title: t('about.services.cleaning.title', 'Home Cleaning'),
      subtitle: t('about.services.cleaning.sub', 'Eco-Friendly, Non-Toxic Deep Sanitization'),
      desc: t('about.services.cleaning.desc', 'Trained neighborhood professionals utilizing plant-derived bio-enzymes, vinegar, and steam to deep clean your living spaces without synthetic fragrances or caustic chemicals.'),
      badge: t('about.services.cleaning.badge', 'Child & Pet Safe'),
      icon: '🫧',
    },
  ];

  const stateCrafts = [
    {
      state: t('about.states.kerala.name', 'Kerala'),
      crafts: t('about.states.kerala.crafts', 'Aranmula Metal Mirror, Nilambur Teak, Bell Metal Nilavilakku, Idukki Cardamom'),
      color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    },
    {
      state: t('about.states.tamilNadu.name', 'Tamil Nadu'),
      crafts: t('about.states.tamilNadu.crafts', 'Kanchipuram Silk Handlooms, Thanjavur Art Plates, Terracotta Temple Figurines'),
      color: 'bg-amber-50 border-amber-200 text-amber-900',
    },
    {
      state: t('about.states.karnataka.name', 'Karnataka'),
      crafts: t('about.states.karnataka.crafts', 'Channapatna Lacquer Toys, Mysore Sandalwood Soaps, Coorg Single-Estate Coffee'),
      color: 'bg-orange-50 border-orange-200 text-orange-900',
    },
    {
      state: t('about.states.rajasthan.name', 'Rajasthan'),
      crafts: t('about.states.rajasthan.crafts', 'Jaipur Blue Pottery, Sanganer Hand Block Printing, Hand-Cut Silver Moonstones'),
      color: 'bg-rose-50 border-rose-200 text-rose-900',
    },
    {
      state: t('about.states.westBengal.name', 'West Bengal'),
      crafts: t('about.states.westBengal.crafts', 'Dokra Lost-Wax Bell Metal, Kantha Thread Embroidery, Sholapith Eco-Art'),
      color: 'bg-blue-50 border-blue-200 text-blue-900',
    },
    {
      state: t('about.states.kashmir.name', 'Kashmir & North'),
      crafts: t('about.states.kashmir.crafts', 'Pashmina Wool Shawls, Walnut Wood Hand Carvings, Pampore Kashmiri Saffron'),
      color: 'bg-purple-50 border-purple-200 text-purple-900',
    },
  ];

  const trustPoints = [
    { 
      title: t('about.trust.directTitle', 'Direct Artisan Contact'), 
      desc: t('about.trust.directDesc', 'No multi-tier wholesale agents or markups.') 
    },
    { 
      title: t('about.trust.authTitle', '100% Verified Authenticity'), 
      desc: t('about.trust.authDesc', 'Strict verification of raw ingredients & craftsmanship.') 
    },
    { 
      title: t('about.trust.ecoTitle', 'Eco-Minded Packing'), 
      desc: t('about.trust.ecoDesc', 'Sturdy recycled corrugate, zero unnecessary single-use plastics.') 
    },
    { 
      title: t('about.trust.wageTitle', 'Fair Living Wage'), 
      desc: t('about.trust.wageDesc', 'Artisans set their own prices and receive weekly bank payouts.') 
    },
  ];

  return (
    <div className="bg-[#FAF7F2] min-h-screen text-[#223B28] font-sans pb-16">
      
      {/* 1. Hero Header Banner */}
      <section className="relative bg-[#243F29] text-white py-16 sm:py-24 px-4 sm:px-6 overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-[#2E4D34]/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-[#35523A]/30 blur-3xl pointer-events-none" />

        <div className="max-w-[1200px] mx-auto text-center relative z-10 space-y-6">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#2E4D34] border border-[#426849] text-xs font-semibold text-[#A3C4A5] uppercase tracking-widest mx-auto">
            <Sprout className="w-4 h-4 text-[#A3C4A5]" />
            <span>{t('about.badge', 'Heritage • Artisans • Conscious Living')}</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            {t('about.heroTitle', 'ChillyFlakes: Connecting You Directly to India’s Master Artisans & Village Makers')}
          </h1>

          <p className="text-sm sm:text-base text-[#D1DEC0] max-w-2xl mx-auto leading-relaxed">
            {t(
              'about.heroSubtitle',
              'ChillyFlakes is just our brand name — behind it is a living collective of rural weavers, clay potters, spice growers, and skilled community practitioners across India, selling authentic goods directly to your home with zero exploitative middlemen.'
            )}
          </p>

          {/* Regional language switcher indicator */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-[#A3C4A5]">
            <span>{t('about.availableIn', 'Available in your mother tongue:')}</span>
            <LanguageSwitcher variant="dark" />
          </div>

        </div>
      </section>

      {/* Breadcrumb Navigation */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-[#6C7B6D]">
          <Link to="/" className="hover:text-[#2E4D34] transition-colors">
            {t('nav.home', 'Home')}
          </Link>
          <span>/</span>
          <span className="font-semibold text-[#223B28]">
            {t('nav.about', 'About Us')}
          </span>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 space-y-16">
        
        {/* 2. Brand Mission Story */}
        <section className="bg-white rounded-3xl p-6 sm:p-12 border border-[#ECE7DD] shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E4D34]">
              <HeartHandshake className="w-4 h-4" />
              <span>{t('about.ourMission', 'Our Mission & Philosophy')}</span>
            </div>
            
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#223B28] leading-snug">
              {t('about.missionHeading', 'Preserving Ancestral Crafts & Empowering Independent Creators')}
            </h2>

            <p className="text-xs sm:text-sm text-[#5E6D60] leading-relaxed">
              {t('about.missionP1', 'In an era dominated by mass-manufactured plastics and synthetic fragrances, ChillyFlakes was created to honor the timeless heritage of Indian handcrafted artistry. We travel directly into village clusters across Kerala, Tamil Nadu, Karnataka, Rajasthan, West Bengal, and Kashmir to meet the individuals who shape clay, spin handloom khadi, distill cold-pressed oils, and harvest organic spices.')}
            </p>

            <p className="text-xs sm:text-sm text-[#5E6D60] leading-relaxed">
              {t('about.missionP2', 'When you buy from ChillyFlakes, you are not buying from an anonymous factory. You are directly supporting the artisan\'s household, keeping indigenous techniques alive, and receiving authentic goods certified for natural purity.')}
            </p>

            {/* Trust bullet grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {trustPoints.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-2xl bg-[#FAF7F2] border border-[#ECE7DD]">
                  <CheckCircle2 className="w-4 h-4 text-[#2E4D34] flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#223B28]">{item.title}</h4>
                    <p className="text-[11px] text-[#6C7B6D]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-3xl overflow-hidden bg-[#FAF7F2] border border-[#ECE7DD] shadow-sm p-3">
              <img 
                src="/hero-banner.jpg" 
                alt="Artisan Craftsmanship" 
                className="w-full h-80 object-cover rounded-2xl"
              />
              <div className="p-4 text-center">
                <span className="text-xs font-serif font-bold text-[#223B28] block">
                  "{t('about.imageQuote', 'Every piece carries the fingerprint of its maker.')}"
                </span>
                <span className="text-[11px] text-[#6C7B6D]">
                  {t('about.imageQuoteSub', 'Handcrafted with care across 14+ Indian states')}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. The 6 Product Categories We Champion */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#ECE7DD]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E4D34] mb-1">
                <Layers className="w-4 h-4" />
                <span>{t('about.categoriesEyebrow', 'Our 6 Craft & Product Department Layers')}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
                {t('about.categoriesTitle', 'Handcrafted Marketplace Categories')}
              </h2>
            </div>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E4D34] hover:underline"
            >
              <span>{t('about.exploreAllCategories', 'Explore All Marketplace Products')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productCategories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-3xl p-6 border border-[#ECE7DD] shadow-xs hover:border-[#2E4D34]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-2xl flex items-center justify-center border border-[#ECE7DD]">
                    {cat.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#2E4D34] bg-[#EAF1EA] px-2.5 py-0.5 rounded-full border border-[#D5E5D3]">
                      {cat.itemCount}
                    </span>
                    <h3 className="font-serif text-xl font-bold text-[#223B28] mt-2">
                      {cat.name}
                    </h3>
                  </div>
                  <p className="text-xs text-[#5E6D60] leading-relaxed">
                    {cat.description}
                  </p>
                  <div className="pt-2 border-t border-[#F2ECE1] text-[11px] text-[#6C7B6D]">
                    <strong className="text-[#223B28]">{t('about.primaryStateClusters', 'Primary State Clusters:')}</strong> {cat.stateOrigins}
                  </div>
                </div>

                <Link
                  to={cat.link}
                  className="w-full py-2.5 bg-[#FAF7F2] hover:bg-[#2E4D34] text-[#2E4D34] hover:text-white font-semibold text-xs rounded-xl border border-[#D5C9B3] hover:border-[#2E4D34] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>{t('about.browse', 'Browse')} {cat.name}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 4. The 4 Skilled Community Services */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#ECE7DD]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2E4D34] mb-1">
                <Users className="w-4 h-4" />
                <span>{t('about.servicesEyebrow', 'Local Empowerment Beyond Physical Products')}</span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
                {t('about.servicesTitle', 'Professional Community Services')}
              </h2>
            </div>
            <Link
              to="/services"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E4D34] hover:underline"
            >
              <span>{t('about.browseAllServices', 'Browse All Services & Book Online')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {servicesList.map((srv) => (
              <div
                key={srv.id}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-[#ECE7DD] shadow-xs hover:border-[#2E4D34]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{srv.icon}</span>
                    <span className="text-[10px] font-bold text-[#2E4D34] bg-[#EAF1EA] px-3 py-1 rounded-full border border-[#D5E5D3]">
                      {srv.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#223B28]">
                      {srv.title}
                    </h3>
                    <p className="text-xs font-medium text-[#2E4D34] mt-0.5">
                      {srv.subtitle}
                    </p>
                  </div>
                  <p className="text-xs text-[#5E6D60] leading-relaxed">
                    {srv.desc}
                  </p>
                </div>

                <Link
                  to="/services"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E4D34] hover:underline pt-2"
                >
                  <span>{t('about.bookAppointment', 'Book Appointment / Inquire →')}</span>
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 5. State-by-State Craft Heritage Map */}
        <section className="bg-white rounded-3xl p-6 sm:p-10 border border-[#ECE7DD] shadow-xs space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2E4D34]">
              <Compass className="w-4 h-4" />
              <span>{t('about.clustersEyebrow', 'Pan-India Craft Clusters')}</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#223B28]">
              {t('about.clustersTitle', 'Where Our Crafts Come From')}
            </h2>
            <p className="text-xs sm:text-sm text-[#6C7B6D]">
              {t('about.clustersSubtitle', 'We partner directly with craft guilds, self-help groups, and generational master artisans across India.')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {stateCrafts.map((item, idx) => (
              <div 
                key={idx}
                className={`p-5 rounded-2xl border ${item.color} space-y-1.5 transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <h4 className="font-serif font-bold text-base">{item.state}</h4>
                </div>
                <p className="text-xs opacity-90 leading-relaxed">
                  {item.crafts}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Call to Action: Join as Buyer or Seller */}
        <section className="bg-gradient-to-br from-[#243F29] to-[#1C3220] rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <h2 className="font-serif text-2xl sm:text-4xl font-bold">
              {t('about.cta.title', 'Are You an Artisan, Cultivator or Service Professional?')}
            </h2>
            <p className="text-xs sm:text-sm text-[#D1DEC0] leading-relaxed">
              {t('about.cta.subtitle', 'Sell your handmade creations directly to conscious buyers across India, manage orders easily, and enjoy fast weekly bank deposits.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
            <Link
              to="/vendor/register"
              className="px-7 py-3 bg-[#EAF1EA] hover:bg-white text-[#243F29] font-bold text-xs uppercase tracking-wider rounded-full shadow-md transition-all active:scale-95"
            >
              {t('about.cta.becomeSeller', 'Become a Seller / Artisan')}
            </Link>
            <Link
              to="/contact"
              className="px-7 py-3 bg-transparent hover:bg-white/10 text-white font-semibold text-xs rounded-full border border-white/30 transition-colors"
            >
              {t('about.cta.contactUs', 'Contact Our Artisan Desk')}
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};

export default AboutUsPage;
