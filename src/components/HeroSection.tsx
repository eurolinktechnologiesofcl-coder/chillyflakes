import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { heroApi, type HeroSlideData } from '../api';

export const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [slides, setSlides] = useState<HeroSlideData[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const { setSelectedCategory } = useStore();

  // Load hero slides from Django backend API (with default fallback)
  useEffect(() => {
    heroApi.getHeroSlides().then((res) => {
      if (res.data && res.data.length > 0) {
        setSlides(res.data);
      }
    });
  }, []);

  const slide = slides[currentSlide] || slides[0] || {
    id: 'slide-1',
    subtitle: 'WELCOME TO CHILLYFLAKES',
    titleLine1: 'Natural Products',
    titleLine2: 'Handmade with Love',
    description: 'Discover unique, eco-friendly products and handcrafted finds.',
    buttonText: 'Shop Now',
    image: '/hero-banner.jpg',
    category: 'All',
    backgroundPosition: 'right 30% center',
  };

  const slideSubtitle = t(`hero.slides.${slide.id}.subtitle`, slide.subtitle);
  const slideTitleLine1 = t(`hero.slides.${slide.id}.titleLine1`, slide.titleLine1);
  const slideTitleLine2 = t(`hero.slides.${slide.id}.titleLine2`, slide.titleLine2);
  const slideDescription = t(`hero.slides.${slide.id}.description`, slide.description);
  const slideButtonText = t(`hero.slides.${slide.id}.buttonText`, slide.buttonText);

  // Automatic infinite looping carousel (uninterrupted continuous loop every 5 seconds)
  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handleButtonClick = () => {
    if (slide.category === 'Services') {
      navigate('/services');
      return;
    }
    if (slide.category && slide.category !== 'All') {
      setSelectedCategory(slide.category);
      navigate(`/shop?category=${encodeURIComponent(slide.category)}`);
      return;
    }
    navigate('/shop');
  };

  return (
    <section 
      className="group relative min-h-[440px] sm:min-h-[480px] lg:min-h-[520px] w-full flex items-center overflow-hidden border-b border-[#ECE7DD] bg-[#FAF5EE]"
    >
      {/* Background Slides with Cross-Fade Transition */}
      {slides.map((s, index) => (
        <div
          key={s.id}
          className={`absolute inset-0 bg-cover bg-no-repeat transition-opacity duration-1000 ease-in-out pointer-events-none ${
            index === currentSlide ? 'opacity-100 z-0 scale-100' : 'opacity-0 z-[-1] scale-105'
          }`}
          style={{
            backgroundImage: `url('${s.image}')`,
            backgroundPosition: s.backgroundPosition || 'right 30% center',
            transition: 'opacity 1000ms ease-in-out, transform 8000ms ease-out',
          }}
        />
      ))}

      {/* Content Container (Left-aligned plain text with smooth fade transition) */}
      <div className="relative z-10 max-w-[1360px] mx-auto px-5 sm:px-8 lg:px-12 w-full py-12 sm:py-16">
        <div className="max-w-xl lg:max-w-lg space-y-4 sm:space-y-5">
          
          {/* Small tracked uppercase subtitle */}
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-[#63725F] uppercase transition-all duration-500">
            {slideSubtitle}
          </div>

          {/* 
            Two-Tone Serif Headline:
            - Line 1 in deep forest olive green (#203D26)
            - Line 2 in warm earthy terracotta/amber brown (#7B3F1B)
          */}
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-bold leading-[1.14] tracking-tight transition-all duration-500">
            <span className="text-[#203D26] block">
              {slideTitleLine1}
            </span>
            <span className="text-[#7B3F1B] block mt-1">
              {slideTitleLine2}
            </span>
          </h1>

          {/* Descriptive text */}
          <p className="text-xs sm:text-sm md:text-[14px] text-[#4F5B4E] leading-relaxed max-w-md font-normal transition-all duration-500">
            {slideDescription}
          </p>

          {/* Pill Button: Deep forest green with right arrow */}
          <div className="pt-2">
            <button
              onClick={handleButtonClick}
              className="inline-flex items-center gap-2.5 px-7 py-3 bg-[#2D4F32] hover:bg-[#223E27] text-white text-xs sm:text-sm font-medium rounded-full shadow-xs hover:shadow-md transition-all duration-300 group active:scale-98 cursor-pointer"
            >
              <span>{slideButtonText}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

        </div>
      </div>

      {/* Arrow Controls: Previous / Next (Fade in on hover or visible on desktop) */}
      <button
        onClick={handlePrevSlide}
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-[#203D26] shadow-sm hover:shadow-md border border-[#ECE7DD] flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Previous Slide"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      <button
        onClick={handleNextSlide}
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-[#203D26] shadow-sm hover:shadow-md border border-[#ECE7DD] flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-105 active:scale-95 cursor-pointer"
        aria-label="Next Slide"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* 
        Centered Carousel Dots with Loop Indicators
      */}
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              index === currentSlide
                ? 'w-6 sm:w-8 h-2.5 bg-[#2D4F32] shadow-xs'
                : 'w-2.5 h-2.5 bg-white/85 border border-[#D5DDD3] hover:bg-[#2D4F32]/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

    </section>
  );
};

export default HeroSection;
